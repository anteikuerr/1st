#!/usr/bin/env python3
"""合成カードデータビルダー (schema 4)

2つのコミュニティデータベースを合成して carddata.json を生成する:
 1. hugoburguete/pokemon-tcg-pocket-card-database
    → ワザ(コスト/ダメージ/効果)・特性・進化元・弱点・にげる等の詳細
 2. chase-manning/pokemon-tcg-pocket-cards
    → カード画像 (GitHub直置き・MIT) と、1に未収録の最新弾の補完

IDは旧TCGdex形式 (A1-001, P-A-005) に正規化し、保存済みデッキとの互換を保つ。
GitHub Actions で毎日実行される (ローカル実行も可)。
"""

import json
import os
import re
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from urllib.request import Request, urlopen

HUGO = "https://raw.githubusercontent.com/hugoburguete/pokemon-tcg-pocket-card-database/main"
CHASE = "https://raw.githubusercontent.com/chase-manning/pokemon-tcg-pocket-cards/refs/heads/main"
HUGO_TREE_API = "https://api.github.com/repos/hugoburguete/pokemon-tcg-pocket-card-database/git/trees/main?recursive=1"

ROOT = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(ROOT, "carddata.json")

HEADERS = {"User-Agent": "pokepoke-deck-builder/1.0"}

# api.github.com に届かない環境用のフォールバック (2026-07時点の既知ファイル)
FALLBACK_EN_FILES = [
    "a1-genetic-apex.json", "a1a-mythical-island.json", "a2-space-time-smackdown.json",
    "a2a-triumphant-light.json", "a2b-shining-revelry.json", "a3-celestial-guardians.json",
    "a3a-extradimensional-crisis.json", "a3b-eevee-grove.json", "a4-wisdom-of-sea-and-sky.json",
    "a4a-secluded-springs.json", "a4b-deluxe-pack-ex.json", "b1-mega-rising.json",
    "b1a-crimson-blaze.json", "b2-fantastical-parade.json", "b2a-paldean-wonders.json",
    "b2b-mega-shine.json", "b3-pulsing-aura.json", "b3a-paradox-drive.json",
    "promo-a.json", "promo-b.json",
]

POKEMON_TYPES = {"Grass", "Fire", "Water", "Lightning", "Psychic", "Fighting",
                 "Darkness", "Metal", "Colorless", "Dragon"}

# 効果テキストの表記正規化: 旧TCGdexの {R} 記号形式に合わせる
# (翻訳辞書とシミュレータのパーサが記号形式前提のため)
ENERGY_TOKEN = {
    "Grass": "G", "Fire": "R", "Water": "W", "Lightning": "L",
    "Psychic": "P", "Fighting": "F", "Darkness": "D", "Metal": "M", "Colorless": "C",
}
_ENERGY_WORD_RE = re.compile(
    r"\b(Grass|Fire|Water|Lightning|Psychic|Fighting|Darkness|Metal|Colorless)"
    r"(?=\s+(?:Energy|Pokémon|Pokemon)\b)"
)


# "Fire, Water, and {L} Energy" のような列挙の前半部分用
_ENERGY_LIST_RE = re.compile(
    r"\b(Grass|Fire|Water|Lightning|Psychic|Fighting|Darkness|Metal|Colorless)"
    r"(?=,|\s+and\s+\{)"
)


def normalize_effect(text):
    if not text:
        return text
    out = _ENERGY_WORD_RE.sub(lambda m: "{" + ENERGY_TOKEN[m.group(1)] + "}", text)
    prev = None
    while prev != out:
        prev = out
        out = _ENERGY_LIST_RE.sub(lambda m: "{" + ENERGY_TOKEN[m.group(1)] + "}", out)
    return out


def get(url, retries=3, timeout=60):
    for i in range(retries):
        try:
            with urlopen(Request(url, headers=HEADERS), timeout=timeout) as r:
                return r.read()
        except Exception:
            if i == retries - 1:
                raise
            time.sleep(1 + i)


def get_json(url, **kw):
    return json.loads(get(url, **kw))


def norm_id(raw_id):
    """b3-001 -> B3-001 / a4b-023 -> A4b-023 / promo-a-005, pa-005 -> P-A-005"""
    s = str(raw_id).strip().lower()
    m = re.match(r"^promo-([ab])-(\w+)$", s)
    if m:
        return f"P-{m.group(1).upper()}-{m.group(2)}"
    m = re.match(r"^p([ab])-(\w+)$", s)
    if m:
        return f"P-{m.group(1).upper()}-{m.group(2)}"
    m = re.match(r"^([ab])(\d+)([a-z]?)-(\w+)$", s)
    if m:
        return f"{m.group(1).upper()}{m.group(2)}{m.group(3)}-{m.group(4)}"
    return str(raw_id).upper()


def set_id_of(card_id):
    return card_id.rsplit("-", 1)[0]


def set_sort_key(set_id):
    m = re.match(r"^([A-Z])(\d+)([a-z]?)$", set_id)
    if m:
        return (0, m.group(1), int(m.group(2)), m.group(3))
    return (1, set_id, 0, "")


# レアリティ表記の正規化 (chaseは記号、hugoは英単語)
RARITY_NORM = {
    "◊": "◇", "◊◊": "◇◇", "◊◊◊": "◇◇◇", "◊◊◊◊": "◇◇◇◇",
    "☆": "☆", "☆☆": "☆☆", "☆☆☆": "☆☆☆", "♛": "♛",
    "Common": "◇", "Uncommon": "◇◇", "Rare": "◇◇◇", "Double Rare": "◇◇◇◇",
    "Rare EX": "◇◇◇◇", "Art Rare": "☆", "Full Art": "☆", "Super Rare": "☆☆",
    "Special Art Rare": "☆☆", "Immersive Rare": "☆☆☆", "Crown Rare": "♛",
    "Shiny": "✦", "Shiny Rare": "✦", "Shiny Super Rare": "✦✦", "Promo": "PROMO",
}


def norm_rarity(v):
    if not v:
        return None
    v = str(v).strip()
    return RARITY_NORM.get(v, v)


TCGDEX_REPO = "https://github.com/tcgdex/cards-database.git"


def load_tcgdex_trainer_effects():
    """TCGdexリポジトリからトレーナーカードの効果文(en)を取り出す (第3ソース)。

    hugoburguete/chase-manning にはトレーナーの効果文が無いため、TCGdexの
    元データ (dataディレクトリの .ts ファイル) から補完する。
    環境変数 TCGDEX_DIR で既存チェックアウトを指定でき、無ければ浅い
    sparse clone を行う。失敗しても全体のビルドは止めない。
    """
    import subprocess
    import tempfile

    root = os.environ.get("TCGDEX_DIR")
    if not root or not os.path.isdir(os.path.join(root, "data")):
        tmp = tempfile.mkdtemp(prefix="tcgdex-")
        try:
            subprocess.run(
                ["git", "clone", "--depth", "1", "--filter=blob:none", "--sparse",
                 TCGDEX_REPO, tmp],
                check=True, capture_output=True, timeout=600)
            subprocess.run(
                ["git", "-C", tmp, "sparse-checkout", "set", "data/Pokémon TCG Pocket"],
                check=True, capture_output=True, timeout=600)
        except Exception as e:
            print(f"tcgdex: クローン失敗のためトレーナー効果文はスキップ ({e})")
            return {}
        root = tmp

    base = os.path.join(root, "data", "Pokémon TCG Pocket")
    if not os.path.isdir(base):
        print("tcgdex: Pocketデータが見つからないためスキップ")
        return {}

    set_ids = {}
    for f in os.listdir(base):
        if f.endswith(".ts"):
            src = open(os.path.join(base, f), encoding="utf-8").read()
            m = re.search(r'\bid:\s*"([^"]+)"', src)
            if m:
                set_ids[f[:-3]] = m.group(1)

    effects = {}
    for setname, sid in set_ids.items():
        d = os.path.join(base, setname)
        if not os.path.isdir(d):
            continue
        for fn in os.listdir(d):
            if not fn.endswith(".ts"):
                continue
            src = open(os.path.join(d, fn), encoding="utf-8").read()
            if '"Trainer"' not in src:
                continue
            eff = re.search(r'effect:\s*\{\s*en:\s*"((?:[^"\\]|\\.)*)"', src)
            if not eff:
                continue
            local = fn[:-3]
            cid = f"{sid}-{local.zfill(3) if local.isdigit() else local}"
            effects[cid] = eff.group(1).replace('\\"', '"').replace("\\n", " ")
    print(f"tcgdex: トレーナー効果文 {len(effects)}件を取得")
    return effects


def main():
    # --- 1. hugoburguete: 詳細データ ---
    try:
        tree = get_json(HUGO_TREE_API)
        en_files = sorted(
            p["path"].split("/")[-1]
            for p in tree.get("tree", [])
            if p["path"].startswith("cards/en/") and p["path"].endswith(".json")
        )
        print(f"hugoburguete: ツリーAPIから{len(en_files)}ファイル")
    except Exception as e:
        en_files = FALLBACK_EN_FILES
        print(f"hugoburguete: APIに届かないためフォールバック一覧を使用 ({e})")

    hugo_cards = []
    with ThreadPoolExecutor(max_workers=8) as pool:
        futures = {pool.submit(get_json, f"{HUGO}/cards/en/{f}"): f for f in en_files}
        for fut in as_completed(futures):
            fname = futures[fut]
            try:
                data = fut.result()
                cards = data if isinstance(data, list) else data.get("cards", [])
                hugo_cards.extend(cards)
                print(f"  {fname}: {len(cards)}枚")
            except Exception as e:
                print(f"  ✗ {fname}: {e}")

    # --- 2. chase-manning: 画像と最新弾 ---
    chase_cards = get_json(f"{CHASE}/v4.json")
    try:
        chase_exp = get_json(f"{CHASE}/expansions.json")
    except Exception:
        chase_exp = []
    print(f"chase-manning: {len(chase_cards)}枚 / 拡張{len(chase_exp)}")

    chase_by_id = {}
    for c in chase_cards:
        cid = norm_id(c.get("id", ""))
        if cid:
            chase_by_id[cid] = c

    # --- 3. マージ ---
    cards = []
    details = {}
    set_names = {}

    def ability_entry(ab):
        return {"n": ab.get("name") or ab.get("n"), "e": ab.get("effect") or ab.get("e")}

    seen = set()
    for c in hugo_cards:
        cid = norm_id(c.get("id", ""))
        if not cid or cid in seen:
            continue
        seen.add(cid)
        sid = set_id_of(cid)
        set_label = re.sub(r"\s*\([^)]*\)\s*$", "", str(c.get("set") or "")) or sid
        set_names.setdefault(sid, set_label)

        chase = chase_by_id.get(cid, {})
        image = chase.get("image")

        is_pokemon = (c.get("type") == "Pokemon")
        slim = {
            "c": "Pokemon" if is_pokemon else "Trainer",
            "t": [c["element"]] if is_pokemon and c.get("element") else [],
            "h": int(c["health"]) if c.get("health") else None,
            "s": c.get("subtype") if is_pokemon else None,
            "r": norm_rarity(chase.get("rarity") or c.get("rarity")),
        }
        attacks = []
        for a in c.get("attacks") or []:
            atk = {"c": a.get("cost") or [], "n": a.get("name")}
            if a.get("damage") not in (None, "", "0"):
                atk["d"] = a["damage"]
            if a.get("effect"):
                atk["e"] = normalize_effect(a["effect"])
            attacks.append(atk)
        if attacks:
            slim["a"] = attacks
        abilities = [ability_entry(ab) for ab in (c.get("abilities") or []) if ab]
        abilities = [ab for ab in abilities if ab.get("n") or ab.get("e")]
        for ab in abilities:
            if ab.get("e"):
                ab["e"] = normalize_effect(ab["e"])
        if abilities:
            slim["ab"] = abilities
        if c.get("weakness"):
            slim["w"] = [{"t": c["weakness"], "v": "+20"}]
        if c.get("retreatCost") not in (None, ""):
            try:
                slim["rc"] = int(c["retreatCost"])
            except (TypeError, ValueError):
                pass
        if c.get("evolvesFrom"):
            slim["dv"] = c["evolvesFrom"]

        details[cid] = slim
        cards.append({
            "id": cid,
            "localId": cid.rsplit("-", 1)[1],
            "name": c.get("name"),
            "image": image,
            "setId": sid,
            "setName": set_label,
        })

    # chaseにしか無いカード (最新弾など) を浅いデータで補完
    def norm_set_id(raw):
        s = str(raw).strip().lower()
        m = re.match(r"^([ab])(\d+)([a-z]?)$", s)
        if m:
            return f"{m.group(1).upper()}{m.group(2)}{m.group(3)}"
        if s in ("promo", "promo-a", "pa"):
            return "P-A"
        if s in ("promo-b", "pb"):
            return "P-B"
        return str(raw).upper()

    chase_exp_names = {norm_set_id(e.get("id", "")): e.get("name") for e in chase_exp}

    added_shallow = 0
    for cid, c in chase_by_id.items():
        if cid in seen:
            continue
        sid = set_id_of(cid)
        ctype = c.get("type")
        is_pokemon = ctype in POKEMON_TYPES
        details[cid] = {
            "c": "Pokemon" if is_pokemon else "Trainer",
            "t": [ctype] if is_pokemon else [],
            "h": int(c["health"]) if str(c.get("health") or "").isdigit() else None,
            "s": None,
            "r": norm_rarity(c.get("rarity")),
        }
        set_label = chase_exp_names.get(sid) or set_names.get(sid) or sid
        set_names.setdefault(sid, set_label)
        cards.append({
            "id": cid,
            "localId": cid.rsplit("-", 1)[1],
            "name": c.get("name"),
            "image": c.get("image"),
            "setId": sid,
            "setName": set_label,
        })
        added_shallow += 1

    # --- 4. tcgdex: トレーナーの効果文を補完 ---
    trainer_fx = load_tcgdex_trainer_effects()
    n_tfx = 0
    for cid, eff in trainer_fx.items():
        d = details.get(cid)
        if d is not None and d.get("c") == "Trainer" and not d.get("e"):
            d["e"] = normalize_effect(eff)
            n_tfx += 1
    if trainer_fx:
        n_trainer = sum(1 for d in details.values() if d.get("c") == "Trainer")
        print(f"tcgdex: トレーナー効果文 {n_tfx}件を付与 (トレーナー総数 {n_trainer})")

    # chase拡張名で上書き (b3bなどの正式名)
    for sid, name in list(set_names.items()):
        better = chase_exp_names.get(sid)
        if better:
            set_names[sid] = better

    sets = [{"id": sid, "name": set_names[sid]} for sid in sorted(set_names, key=set_sort_key)]
    order = {s["id"]: i for i, s in enumerate(sets)}
    cards.sort(key=lambda c: (order.get(c["setId"], 99), c["id"]))

    n_img = sum(1 for c in cards if c.get("image"))
    n_detail = sum(1 for cid in details if details[cid].get("a") or details[cid].get("ab"))
    print(f"\n合成結果: {len(cards)}枚 / セット{len(sets)} / 画像あり{n_img} / 詳細(ワザ/特性)あり{n_detail} / 浅い補完{added_shallow}")
    for s in sets:
        cnt = sum(1 for c in cards if c["setId"] == s["id"])
        print(f"  {s['id']}: {s['name']} ({cnt}枚)")

    payload = {
        "time": int(time.time() * 1000),
        "schema": 4,
        "lang": "en",
        "high": False,
        "source": "merged:hugoburguete+chase-manning",
        "sets": sets,
        "cards": cards,
        "details": details,
    }

    # 内容(time以外)が変わっていなければ書き換えない (日次コミットのノイズ防止)
    if os.path.exists(OUT):
        try:
            with open(OUT, encoding="utf-8") as f:
                old = json.load(f)
            old.pop("time", None)
            new = dict(payload)
            new.pop("time", None)
            if old == new:
                print("内容に変更なし (書き換えスキップ)")
                return
        except Exception:
            pass

    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False)
    print(f"✅ {os.path.relpath(OUT, ROOT)} を書き出しました")


if __name__ == "__main__":
    main()
