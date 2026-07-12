#!/usr/bin/env python3
"""ポケポケ カードデータ一括ダウンローダー (オフライン利用向け)

TCGdex API から全カードの情報とサムネイル画像を data/ フォルダに保存します。
data/ がある状態でアプリを開くと、ネット接続なしで動作します。

使い方:
    python3 download_cards.py             # カード情報 + サムネイル画像 (低解像度)
    python3 download_cards.py --high      # 上に加えて拡大表示用の高解像度画像も取得
    python3 download_cards.py --meta-only # 画像なしでカード情報だけを carddata.json に出力
                                          # (GitHub Actions がアプリ同梱データの更新に使用)

2回目以降はダウンロード済みのファイルをスキップするので、
新パックが出たら再実行するだけで差分が追加されます。
"""

import json
import os
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from urllib.request import Request, urlopen

API = os.environ.get("TCGDEX_API_BASE", "https://api.tcgdex.net/v2")
SERIES_ID = "tcgp"
HIGH = "--high" in sys.argv
META_ONLY = "--meta-only" in sys.argv
WORKERS = 8

ROOT = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(ROOT, "data")
IMG_DIR = os.path.join(DATA_DIR, "img")
IMG_HI_DIR = os.path.join(DATA_DIR, "img_hi")
# --meta-only はアプリ同梱用にリポジトリ直下へ出力する
CARDS_JSON = os.path.join(ROOT, "carddata.json") if META_ONLY else os.path.join(DATA_DIR, "cards.json")

HEADERS = {"User-Agent": "pokepoke-deck-builder/1.0"}


def get_json(url, retries=3):
    for i in range(retries):
        try:
            with urlopen(Request(url, headers=HEADERS), timeout=30) as r:
                return json.load(r)
        except Exception:
            if i == retries - 1:
                raise
            time.sleep(1 + i)


def download_file(url, path, retries=3):
    """ダウンロード済みなら False、新規取得したら True を返す"""
    if os.path.exists(path) and os.path.getsize(path) > 0:
        return False
    tmp = path + ".tmp"
    for i in range(retries):
        try:
            with urlopen(Request(url, headers=HEADERS), timeout=60) as r, open(tmp, "wb") as f:
                f.write(r.read())
            os.replace(tmp, path)
            return True
        except Exception:
            if os.path.exists(tmp):
                os.remove(tmp)
            if i == retries - 1:
                raise
            time.sleep(1 + i)


# details のスキーマ版。項目を変えたら上げる (古い carddata.json のレジュームを無効化)
DETAIL_SCHEMA = 2


def slim_detail(d):
    slim = {
        "c": d.get("category"),
        "t": d.get("types") or [],
        "h": d.get("hp"),
        "s": d.get("stage"),
        "r": d.get("rarity"),
    }
    attacks = []
    for a in d.get("attacks") or []:
        atk = {"c": a.get("cost") or [], "n": a.get("name")}
        if a.get("damage") is not None:
            atk["d"] = a["damage"]
        if a.get("effect"):
            atk["e"] = a["effect"]
        attacks.append(atk)
    if attacks:
        slim["a"] = attacks
    abilities = [{"n": a.get("name"), "e": a.get("effect")} for a in (d.get("abilities") or [])]
    if abilities:
        slim["ab"] = abilities
    weaknesses = d.get("weaknesses") or []
    if weaknesses:
        slim["w"] = [{"t": x.get("type"), "v": x.get("value")} for x in weaknesses]
    if d.get("retreat") is not None:
        slim["rc"] = d["retreat"]
    return slim


def run_parallel(label, jobs):
    """jobs: (説明, 関数) のリストを並列実行して失敗数を返す"""
    failed = 0
    done = 0
    with ThreadPoolExecutor(max_workers=WORKERS) as pool:
        futures = {pool.submit(fn): desc for desc, fn in jobs}
        for future in as_completed(futures):
            done += 1
            try:
                future.result()
            except Exception as e:
                failed += 1
                print(f"  ✗ {futures[future]}: {e}")
            if done % 100 == 0 or done == len(jobs):
                print(f"  {label}: {done}/{len(jobs)}")
    return failed


def main():
    if not META_ONLY:
        os.makedirs(IMG_DIR, exist_ok=True)
        if HIGH:
            os.makedirs(IMG_HI_DIR, exist_ok=True)

    # 前回の結果があれば詳細データを再利用 (レジューム / スキーマが同じ場合のみ)
    prev_details = {}
    if os.path.exists(CARDS_JSON):
        try:
            with open(CARDS_JSON, encoding="utf-8") as f:
                prev = json.load(f)
            if prev.get("schema") == DETAIL_SCHEMA:
                prev_details = prev.get("details", {})
        except Exception:
            pass

    # 1. カード一覧 (日本語優先、なければ英語)
    lang = None
    sets, cards = [], []
    for candidate in ("ja", "en"):
        try:
            series = get_json(f"{API}/{candidate}/series/{SERIES_ID}")
            set_briefs = series.get("sets") or []
            if not set_briefs:
                continue
            for brief in set_briefs:
                s = get_json(f"{API}/{candidate}/sets/{brief['id']}")
                sets.append({"id": s["id"], "name": s["name"]})
                for c in s.get("cards") or []:
                    cards.append({
                        "id": c["id"],
                        "localId": c.get("localId"),
                        "name": c["name"],
                        "image": c.get("image"),
                        "setId": s["id"],
                        "setName": s["name"],
                    })
            lang = candidate
            break
        except Exception as e:
            print(f"[{candidate}] カード一覧の取得に失敗: {e}")
    if not lang or not cards:
        print("カード一覧を取得できませんでした。ネット接続を確認してください。")
        sys.exit(1)
    print(f"カード一覧: {len(cards)}枚 / {len(sets)}パック (言語: {lang})")

    # 2. カード詳細 (タイプ・進化・レアリティ等)
    details = dict(prev_details)
    missing = [c["id"] for c in cards if c["id"] not in details]
    print(f"カード詳細: {len(missing)}件を取得 ({len(details)}件は取得済み)")

    def fetch_detail(card_id):
        details[card_id] = slim_detail(get_json(f"{API}/{lang}/cards/{card_id}"))

    run_parallel("詳細", [(cid, lambda cid=cid: fetch_detail(cid)) for cid in missing])

    # 3. 画像 (--meta-only 時はスキップ)
    img_failed = 0
    if not META_ONLY:
        with_image = [c for c in cards if c.get("image")]
        print(f"サムネイル画像: {len(with_image)}枚 (取得済みはスキップ)")
        jobs = [
            (c["id"], lambda c=c: download_file(
                f"{c['image']}/low.webp", os.path.join(IMG_DIR, f"{c['id']}.webp")))
            for c in with_image
        ]
        if HIGH:
            jobs += [
                (c["id"] + " (高解像度)", lambda c=c: download_file(
                    f"{c['image']}/high.webp", os.path.join(IMG_HI_DIR, f"{c['id']}.webp")))
                for c in with_image
            ]
        img_failed = run_parallel("画像", jobs)

    # 4. cards.json 書き出し
    payload = {
        "time": int(time.time() * 1000),
        "schema": DETAIL_SCHEMA,
        "lang": lang,
        "high": HIGH and not META_ONLY,
        "sets": sets,
        "cards": cards,
        "details": details,
    }
    with open(CARDS_JSON, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False)

    print()
    print(f"✅ 完了: {len(cards)}枚 → {os.path.relpath(CARDS_JSON, ROOT)}")
    if img_failed:
        print(f"⚠ 画像{img_failed}件が取得できませんでした。再実行すると失敗分だけ再取得します。")
    if not META_ONLY:
        print("次: python3 -m http.server 8000 を実行して http://localhost:8000 を開いてください。")


if __name__ == "__main__":
    main()
