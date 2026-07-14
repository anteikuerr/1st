#!/usr/bin/env python3
"""オフライン用データ作成ツール

リポジトリ同梱の carddata.json (build_carddata.py が毎日更新) を元に、
全カード画像を data/ フォルダへダウンロードする。
data/ がある状態でアプリを開くと、ネット接続なしで動作する。

使い方:
    python3 download_cards.py
    (画像は全カード分で数百MBになるので注意。再実行時は取得済みをスキップ)
"""

import json
import os
import shutil
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from urllib.request import Request, urlopen

ROOT = os.path.dirname(os.path.abspath(__file__))
CARDDATA = os.path.join(ROOT, "carddata.json")
DATA_DIR = os.path.join(ROOT, "data")
IMG_DIR = os.path.join(DATA_DIR, "img")

HEADERS = {"User-Agent": "pokepoke-deck-builder/1.0"}


def download_file(url, path, retries=3):
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


def main():
    if not os.path.exists(CARDDATA):
        print("carddata.json がありません。先に python3 build_carddata.py を実行してください。")
        sys.exit(1)

    with open(CARDDATA, encoding="utf-8") as f:
        payload = json.load(f)
    cards = payload.get("cards", [])
    print(f"カード: {len(cards)}枚 (carddata.json)")

    os.makedirs(IMG_DIR, exist_ok=True)
    # アプリのローカルモードは carddata.json と同じ形式の data/cards.json を読む
    shutil.copyfile(CARDDATA, os.path.join(DATA_DIR, "cards.json"))

    jobs = [(c["id"], c["image"]) for c in cards if c.get("image")]
    print(f"画像: {len(jobs)}枚をダウンロード (取得済みはスキップ)")
    done = 0
    failed = 0
    with ThreadPoolExecutor(max_workers=8) as pool:
        futures = {
            pool.submit(download_file, url, os.path.join(IMG_DIR, f"{cid}.png")): cid
            for cid, url in jobs
        }
        for fut in as_completed(futures):
            done += 1
            try:
                fut.result()
            except Exception as e:
                failed += 1
                print(f"  ✗ {futures[fut]}: {e}")
            if done % 200 == 0 or done == len(jobs):
                print(f"  {done}/{len(jobs)}")

    print()
    print(f"✅ 完了 → data/ (失敗{failed}件)")
    print("次: python3 -m http.server 8000 を実行して http://localhost:8000 を開いてください。")


if __name__ == "__main__":
    main()
