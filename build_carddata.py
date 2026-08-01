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
    # ノーブレークスペース等を通常スペースに正規化 (翻訳辞書の完全一致キー照合のため)
    text = text.replace(" ", " ").replace(" ", " ").replace(" ", " ")
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
            tt = re.search(r'trainerType:\s*"([^"]+)"', src)
            local = fn[:-3]
            cid = f"{sid}-{local.zfill(3) if local.isdigit() else local}"
            effects[cid] = {
                "e": eff.group(1).replace('\\"', '"').replace("\\n", " "),
                "tt": tt.group(1) if tt else None,
            }
    print(f"tcgdex: トレーナー効果文 {len(effects)}件を取得")
    return effects


POKECLAUDE_META = "https://registry.npmjs.org/pokeclaude"

# tcgdex未収録の新弾トレーナーの区分 (公式のカード区分に従う)。
# 効果文と同じく、上流が追いついたら自然に不要になる
TRAINER_TYPE_FALLBACK = {
    # B2a パルデアワンダー (tcgdexに1枚だけ欠け)
    "Big Air Balloon": "Tool",
    # B2b メガシャイン
    "Nasty Notice": "Item", "Maintenance": "Item",
    "Iris": "Supporter", "Calem": "Supporter",
    "Hiking Trail": "Stadium",
    # B3 波動ビート
    "Field Blower": "Item", "Lucky Egg": "Tool",
    "Korrina": "Supporter", "Cabbie": "Supporter", "Cheren": "Supporter",
    "Parasol Lady": "Supporter",
    "Fragrant Forest": "Stadium", "Arena of Antiquity": "Stadium",
    "Bounded Field": "Stadium",
    # B3a 進撃パラドックス
    "Ancient Booster Energy Capsule": "Tool", "Future Booster Energy Capsule": "Tool",
    "Juliana": "Supporter", "Professor Sada": "Supporter", "Professor Turo": "Supporter",
    "Area Zero": "Stadium",
    # B3b ミラクルデイズ
    "Small Balloon": "Tool", "Elegant Cape": "Tool",
    "Elesa": "Supporter", "Puppy-Loving Girl": "Supporter", "Wallace": "Supporter",
    "Kid's Room": "Stadium",
}

# 上流ソースに効果文がまだ無い新弾トレーナーの効果文 (カード画像から直接転記)。
# 効果テキストは公式カードの英語表記。上流(tcgdex)が追いつけば不要になる
TRAINER_EFFECT_FALLBACK = {
    # B2a
    "Big Air Balloon": "The Stage 2 Pokémon this card is attached to has no Retreat Cost.",
    # B2b メガシャイン
    "Nasty Notice": "Your opponent discards cards from their hand until they have 4 cards in their hand.",
    "Maintenance": "Shuffle 2 cards from your hand into your deck. Draw a card. If you can't shuffle in 2 cards, you can't use this card.",
    "Iris": "During this turn, if your opponent's Active Pokémon is Knocked Out by damage from an attack used by your Haxorus, you get 1 more point.",
    "Calem": "Draw a card for each Mega Evolution Pokémon ex in play (both yours and your opponent's).",
    "Hiking Trail": "At the end of each player's turn, that player draws cards until they have 3 cards in their hand.",
    # B3 波動ビート
    "Field Blower": "Discard a Pokémon Tool card from a Pokémon (yours or your opponent's), or discard a Stadium card in play.",
    "Lucky Egg": "If the Pokémon this card is attached to is Knocked Out by damage from an attack from your opponent's Pokémon, draw cards until you have 5 cards in your hand.",
    "Korrina": "During this turn, attacks used by your {F} Pokémon do +30 damage to your opponent's Active Pokémon ex.",
    "Cabbie": "Put a random Stadium card from your deck into your hand.",
    "Cheren": "During your opponent's next turn, all of your Watchog and Stoutland take −100 damage from attacks from your opponent's Pokémon ex.",
    "Parasol Lady": "Put 1 of your {W} Pokémon in play, except any Pokémon ex, into your hand.",
    "Fragrant Forest": "Once during each player's turn, that player may put a random Basic {G} Pokémon from their deck into their hand.",
    "Arena of Antiquity": "Attacks used by each {F} Pokémon in play (both yours and your opponent's) do +20 damage to the opponent's Active Pokémon ex.",
    "Bounded Field": "When applying the opponent's Active Pokémon's Weakness to damage from attacks used by Pokémon in play (both yours and your opponent's) that aren't Mega Evolution Pokémon ex, apply Weakness as ×2.",
    # B3a 進撃パラドックス
    "Ancient Booster Energy Capsule": "The Ancient Pokémon this card is attached to gets +40 HP.",
    "Future Booster Energy Capsule": "Attacks used by the Future Pokémon this card is attached to do +20 damage to your opponent's Active Pokémon.",
    "Juliana": "Put a random Stage 2 Pokémon from your deck into your hand.",
    "Professor Sada": "Attach 3 different types of Energy from your discard pile to your Ancient Pokémon in any way you like.",
    "Professor Turo": "Shuffle 1 of your Future Pokémon in play into your deck.",
    "Area Zero": "Once during each player's turn, that player may shuffle a Basic Pokémon from their hand into their deck. If they do, they draw a card.",
    # B3b ミラクルデイズ
    "Small Balloon": "The Retreat Cost of the Basic Pokémon this card is attached to is 1 less.",
    "Elegant Cape": "The Stage 1 Pokémon this card is attached to gets +30 HP.",
    "Elesa": "Return all Pokémon Tools attached to each Pokémon (both yours and your opponent's) to their owner's hand.",
    "Puppy-Loving Girl": "Look at the top 4 cards of your deck. Put all Pokémon you find there that have the Puppy Pile attack into your hand. Shuffle the other cards back into your deck.",
    "Wallace": "Choose 1 of your {W} Pokémon in play with a maximum HP of 50 or less. Put a random {W} Pokémon from your deck that evolves from that Pokémon onto that Pokémon to evolve it.",
    "Kid's Room": "Once during each player's turn, that player may choose a card in their hand and switch it with a random Pokémon Tool card in their deck.",
}

# 上流ソースに特性がまだ無いカードの特性 (カード画像から直接転記)。種族名で照合
POKEMON_ABILITY_FALLBACK = {
    "Caterpie": {"n": "Quick Growth", "e": "At the end of your opponent's turn, if this Pokémon is in the Active Spot, put a random card from your deck that evolves from this Pokémon onto this Pokémon to evolve it."},
    "Milotic ex": {"n": "Aqua Charge", "e": "Once during your turn, you may take a {W} Energy from your Energy Zone and attach it to this Pokémon."},
    "Sylveon": {"n": "Soothing Ribbon", "e": "Once during your turn, if this Pokémon has a Pokémon Tool attached, you may heal 30 damage from 1 of your Pokémon."},
    "Hisuian Goodra": {"n": "Securely Sheltered", "e": "If any damage is done to this Pokémon by attacks, flip a coin. If heads, this Pokémon takes −80 damage from that attack."},
    "Snorlax": {"n": "Massive Body", "e": "As long as this Pokémon is in the Active Spot, your opponent can't play any Stadium cards from their hand."},
    "Ursaluna": {"n": "Guts", "e": "If this Pokémon would be Knocked Out by damage from an attack, flip a coin. If heads, this Pokémon is not Knocked Out, and its remaining HP becomes 10."},
    "Furfrou": {"n": "Fur Coat", "e": "This Pokémon takes −20 damage from attacks."},
}

# CSVでコスト/名前が欠落・誤りだったワザの、カード画像に基づく上書き (種族名で照合)。
# エネルギー色はデッキ構築(色理論)に直結するため、推定ではなく実カードに合わせる
POKEMON_ATTACK_FIX = {
    # 推定で無色2になっていたが実際は雷2。ポケモンのどうぐシナジーの雷アタッカー
    "Dedenne ex": [{"c": ["Lightning", "Lightning"], "n": "Dede-Circuit", "d": "40x",
                    "e": "This attack does 40 damage for each Pokémon Tool attached to all of your Pokémon."}],
}

# 上流ソースに種族情報がまだ無い新登場種族の進化情報 (TCG本家の慣例に従う)。
# 既収録カードから引き継げるようになったら自然に不要になる
SPECIES_FALLBACK = {
    "Hisuian Lilligant": ("Stage 1", "Petilil"),
    "Enamorus": ("Basic", None),
    "Hisuian Sliggoo": ("Stage 1", "Goomy"),
    "Hisuian Goodra": ("Stage 2", "Hisuian Sliggoo"),
    "Munchlax": ("Basic", None),
    "Ursaluna": ("Stage 2", "Ursaring"),
    "Hisuian Zorua": ("Basic", None),
    "Hisuian Zoroark": ("Stage 1", "Hisuian Zorua"),
    "Zygarde": ("Basic", None),
}

COST_LETTERS = {
    "G": "Grass", "R": "Fire", "W": "Water", "L": "Lightning",
    "P": "Psychic", "F": "Fighting", "D": "Darkness", "M": "Metal", "C": "Colorless",
}


def load_pokeclaude_cards():
    """pokeclaude (npm) 同梱のLimitlessスクレイプCSVを取り出す (第4ソース)。

    最新弾 (B3b等) のワザ/HP/弱点/にげるコストを持つが、特性と進化情報は
    信頼できないため使わない。hugoburgueteに無いカードの穴埋め専用。
    """
    import csv
    import io
    import tarfile
    import urllib.request

    try:
        meta = get_json(POKECLAUDE_META)
        tar_url = meta["versions"][meta["dist-tags"]["latest"]]["dist"]["tarball"]
        req = urllib.request.Request(tar_url, headers=HEADERS)
        blob = urllib.request.urlopen(req, timeout=180).read()
        with tarfile.open(fileobj=io.BytesIO(blob), mode="r:gz") as tf:
            member = next(m for m in tf.getmembers()
                          if m.name.endswith("pokemon_pocket_cards.csv"))
            text = tf.extractfile(member).read().decode("utf-8")
    except Exception as e:
        print(f"pokeclaude: 取得失敗のためスキップ ({e})")
        return {}
    out = {}
    for r in csv.DictReader(io.StringIO(text)):
        num = str(r.get("card_number", "")).strip()
        sid = str(r.get("set_code", "")).strip()
        if not num or not sid:
            continue
        cid = f"{sid}-{num.zfill(3) if num.isdigit() else num}"
        out[cid] = r
    print(f"pokeclaude: {len(out)}枚のCSVを取得")
    return out


def parse_csv_attacks(s):
    """Limitless形式のワザ文字列を解析する。
    例: "WWW Water Pulse: 80 - Your opponent's ... Asleep."
        "PC Balloon Barrage 20+: - This attack does ..."
        "W Icicle: 20; WWW Diving Icicles: - Discard ..." ("; "で複数ワザ)
    """
    if not s:
        return []
    # "; " 区切り。ただし効果文中の"; "を誤分割しないよう、
    # コロンを含まない断片は直前のワザの続きとみなす
    parts = []
    for frag in s.split("; "):
        if parts and ":" not in frag:
            parts[-1] += "; " + frag
        else:
            parts.append(frag)
    attacks = []
    for p in parts:
        head, _, rest = p.partition(":")
        rest = rest.strip()
        m = re.match(r"^([GRWLPFDMC]{1,5})\s+(.+)$", head.strip())
        cost_s, name = (m.group(1), m.group(2)) if m else ("", head.strip())
        dmg = ""
        m2 = re.match(r"^(.*?)\s+(\d+[x+]?)$", name)  # "Balloon Barrage 20+" 形式
        if m2:
            name, dmg = m2.group(1), m2.group(2)
        eff = ""
        if rest.startswith("- "):
            eff = rest[2:]
        elif " - " in rest:
            d2, _, eff = rest.partition(" - ")
            dmg = dmg or d2.strip()
        elif rest:
            dmg = dmg or rest
        cost = [COST_LETTERS[ch] for ch in cost_s]
        if not cost:
            # スクレイプ元でコストが欠落したカードが稀にある (デデンネex等3種)。
            # 0コスト扱いは採点を壊すため保守的に推定: 40点以上=無色2 / 未満=無色1
            # (デデンネex「サーキット」は攻略サイト記載の「2エネルギー」と一致)
            n_dmg = int(re.sub(r"\D", "", dmg) or 0)
            cost = ["Colorless"] * (2 if n_dmg >= 40 else 1)
        atk = {"c": cost, "n": name}
        if dmg:
            atk["d"] = dmg
        if eff:
            atk["e"] = normalize_effect(
                eff.strip().replace("[", "{").replace("]", "}"))
        attacks.append(atk)
    return attacks


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

    # --- 4. pokeclaude: 詳細ソースに無いカードのワザ/HP/弱点/にげるを補完 ---
    pc = load_pokeclaude_cards()

    # 4-0. 新弾の取り込み。
    # hugoburguete/chase-manning は新弾の反映が遅く (2026-08時点で B3a / B3b まで)、
    # pokeclaude(Limitlessスクレイプ)だけが先に新セットを持っていることがある。
    # 従来は「既存カードの穴埋め」にしか使っていなかったため、
    # 他ソースに存在しないセットは丸ごと取りこぼしていた (B4 Ruler of the Skies 233枚)。
    # ここで pokeclaude 固有のカードを新規追加し、新弾が出たら自動で入るようにする。
    known_ids = {c["id"] for c in cards}
    new_by_set = {}
    for cid, r in pc.items():
        if cid in known_ids:
            continue
        sid = str(r.get("set_code", "")).strip()
        name = str(r.get("name", "")).strip()
        if not sid or not name:
            continue
        ctype = str(r.get("type", "")).strip()
        is_pokemon = ctype in POKEMON_TYPES
        hp = str(r.get("hp") or "")
        rc = str(r.get("retreat_cost") or "")
        d = {
            "c": "Pokemon" if is_pokemon else "Trainer",
            "t": [ctype] if is_pokemon else [],
            "h": int(hp) if hp.isdigit() else None,
            "s": None,
            "r": norm_rarity(r.get("rarity")),
        }
        atks = parse_csv_attacks(r.get("attacks", ""))
        if atks:
            d["a"] = atks
        if r.get("weakness"):
            d["w"] = [{"t": r["weakness"], "v": "+20"}]
        if rc.isdigit():
            d["rc"] = int(rc)
        # 進化情報はCSVにある範囲で拾う (種族引き継ぎでも後段で補完される)
        stage = str(r.get("evolution_stage") or "").strip()
        if stage in ("Basic", "Stage 1", "Stage 2"):
            d["s"] = stage.replace(" ", "")  if stage != "Basic" else "Basic"
            d["s"] = {"Stage1": "Stage1", "Stage2": "Stage2", "Basic": "Basic"}.get(d["s"], stage)
        if r.get("evolves_from"):
            d["dv"] = str(r["evolves_from"]).strip()
        details[cid] = d
        set_label = str(r.get("set_name") or sid).strip()
        # pokeclaude の set_name は "Ruler of the Skies B4" のようにコードが末尾に付く
        set_label = re.sub(r"\s+" + re.escape(sid) + r"$", "", set_label)
        set_names.setdefault(sid, set_label)
        cards.append({
            "id": cid,
            "localId": cid.rsplit("-", 1)[1],
            "name": name,
            "image": str(r.get("image_url") or "") or None,
            "setId": sid,
            "setName": set_label,
        })
        new_by_set[sid] = new_by_set.get(sid, 0) + 1
    if new_by_set:
        print("pokeclaude: 新規カードを追加 " +
              ", ".join(f"{k}:{v}枚" for k, v in sorted(new_by_set.items())))

    cid_to_name = {c["id"]: c["name"] for c in cards}
    filled_atk = 0
    for cid, d in details.items():
        if d.get("c") != "Pokemon" or d.get("a") or d.get("ab"):
            continue
        r = pc.get(cid)
        if not r:
            continue
        atks = parse_csv_attacks(r.get("attacks", ""))
        if atks:
            d["a"] = atks
            filled_atk += 1
        hp = str(r.get("hp") or "")
        if not d.get("h") and hp.isdigit():
            d["h"] = int(hp)
        if not d.get("w") and r.get("weakness"):
            d["w"] = [{"t": r["weakness"], "v": "+20"}]
        rc = str(r.get("retreat_cost") or "")
        if d.get("rc") is None and rc.isdigit():
            d["rc"] = int(rc)
        if not d.get("t") and r.get("type") in POKEMON_TYPES:
            d["t"] = [r["type"]]

    # 進化段階・進化元は種族ごとに不変なので、既収録カードから同種族名で引き継ぐ。
    # ポケポケの慣例: 「Xex」「Mega Xex」はどちらも種族Xと同じ段階・進化元
    # (例: Mega Swampert ex = Stage 2 / dv: Marshtomp)
    species = {}
    for c in cards:
        d = details.get(c["id"])
        if d and d.get("c") == "Pokemon" and d.get("s"):
            base = re.sub(r"^Mega ", "", re.sub(r" ex$", "", c["name"]))
            species.setdefault(base, (d.get("s"), d.get("dv")))
    filled_evo = 0
    unresolved = []
    for c in cards:
        d = details.get(c["id"])
        if not d or d.get("c") != "Pokemon" or d.get("s") or not d.get("a"):
            continue
        base = re.sub(r"^Mega ", "", re.sub(r" ex$", "", c["name"]))
        if base in species or base in SPECIES_FALLBACK:
            s, dv = species.get(base) or SPECIES_FALLBACK[base]
            d["s"] = s
            if dv:
                d["dv"] = dv
            filled_evo += 1
        else:
            unresolved.append(c["name"])
    print(f"pokeclaude: ワザ補完{filled_atk}枚 / 進化情報引き継ぎ{filled_evo}枚 / "
          f"種族未解決{len(unresolved)}枚 {sorted(set(unresolved))[:12]}")

    # --- 5. tcgdex: トレーナーの効果文を補完 ---
    trainer_fx = load_tcgdex_trainer_effects()
    n_tfx = 0
    for cid, fx in trainer_fx.items():
        d = details.get(cid)
        if d is None or d.get("c") != "Trainer":
            continue
        if not d.get("e"):
            d["e"] = normalize_effect(fx["e"])
            n_tfx += 1
        if fx.get("tt") and not d.get("tt"):
            d["tt"] = fx["tt"]
    if trainer_fx:
        n_trainer = sum(1 for d in details.values() if d.get("c") == "Trainer")
        print(f"tcgdex: トレーナー効果文 {n_tfx}件を付与 (トレーナー総数 {n_trainer})")

    # --- 6. トレーナー効果の同名補完 (A4b等の再録・別レアリティ版) ---
    eff_by_name = {}
    tt_by_name = dict(TRAINER_TYPE_FALLBACK)
    for c in cards:
        d = details.get(c["id"])
        if d and d.get("c") == "Trainer":
            if d.get("e"):
                eff_by_name.setdefault(c["name"], d["e"])
            if d.get("tt"):
                tt_by_name.setdefault(c["name"], d["tt"])
    n_reprint = 0
    still_missing = []
    for c in cards:
        d = details.get(c["id"])
        if not d or d.get("c") != "Trainer":
            continue
        if not d.get("tt") and c["name"] in tt_by_name:
            d["tt"] = tt_by_name[c["name"]]
        if not d.get("e"):
            if c["name"] in eff_by_name:
                d["e"] = eff_by_name[c["name"]]
                n_reprint += 1
            elif c["name"] in TRAINER_EFFECT_FALLBACK:
                d["e"] = normalize_effect(TRAINER_EFFECT_FALLBACK[c["name"]])
                n_reprint += 1
            else:
                still_missing.append(c["name"])
    print(f"再録補完: トレーナー効果 {n_reprint}件 / "
          f"効果未収録 {len(still_missing)}枚 {sorted(set(still_missing))}")

    # --- 7. ポケモンの特性・ワザ補完 (カード画像から転記。種族名で照合) ---
    # exやメガも基礎種族名は同じ特性を持つため、" ex"を残した名前で照合する
    n_ab = n_atkfix = 0
    ab_missing = list(POKEMON_ABILITY_FALLBACK)
    for c in cards:
        d = details.get(c["id"])
        if not d or d.get("c") != "Pokemon":
            continue
        name = c["name"]
        if name in POKEMON_ABILITY_FALLBACK and not d.get("ab"):
            ab = POKEMON_ABILITY_FALLBACK[name]
            d["ab"] = [{"n": ab["n"], "e": normalize_effect(ab["e"])}]
            n_ab += 1
            if name in ab_missing:
                ab_missing.remove(name)
        if name in POKEMON_ATTACK_FIX:
            fixed = []
            for a in POKEMON_ATTACK_FIX[name]:
                a = dict(a)
                if a.get("e"):
                    a["e"] = normalize_effect(a["e"])
                fixed.append(a)
            d["a"] = fixed
            n_atkfix += 1
    print(f"画像転記: 特性 {n_ab}件 / ワザ修正 {n_atkfix}件"
          + (f" / 特性未適用 {ab_missing}" if ab_missing else ""))

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
