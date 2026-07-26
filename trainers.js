/* トレーナーズ評価エンジン
 *
 * 【なぜ作り直したか】
 * 旧実装は「定番トレーナー約20枚の名前リストを上から詰める」方式だった。そのため:
 *   - 収録されている287種のうち、条件付きの超強力札を1枚も拾えなかった
 *     (シロナ=ガブリアス/トゲキッス+50、ネモ=パルデアパワー+80、ポプラ=段階サーチ 等)
 *   - 逆に噛み合わない札を平気で同時採用していた
 *     (モノマネむすめ ⇄ レッドカード は「相手の手札を増やしたい/減らしたい」で真逆)
 *   - 「サカキ+10」を全デッキに入れていたが、+10で確定数が変わらないデッキでは無価値
 *
 * 【新しい考え方】
 * 全トレーナーを効果テキストから「役割」と「発動条件」に分解し、
 * デッキ文脈(勝ち筋・エネ色・進化段階・エースの打点/HP)に対する期待値で採点する。
 * 採点の中心は素の強さではなく「確定数がどれだけ変わるか」——
 * 打点補正は"あと10で落ちる相手が何割いるか"、HP/軽減/回復は"あと20で耐える攻撃が何割か"。
 * この割合は下記の実測分布から計算するので、環境を決め打ちせずに一貫性のある評価ができる。
 */

// ============ 実測分布 (carddata.json から算出) ============
// 「実戦で相手になりうるポケモン」= ex または HP90以上、かつ打点30以上のワザ持ち (634種)。
// 相手のHP分布。打点補正が確定数を縮めるかの判定に使う。
const FIELD_HP = [
  [90, .207], [100, .158], [110, .079], [120, .129], [130, .077], [140, .112],
  [150, .098], [160, .044], [170, .033], [180, .032], [190, .006], [200, .005],
  [210, .011], [220, .005], [230, .003], [240, .002],
];
// 同634種の主力打点 (コスト3以下の最大打点) の分布。HP補正・軽減・回復の評価に使う。
const FIELD_DMG = [
  [30, .055], [40, .153], [50, .128], [60, .158], [70, .160], [80, .123],
  [90, .066], [100, .066], [110, .026], [120, .022], [130, .022], [140, .007],
  [150, .009], [160, .002], [180, .003],
];
const EX_SHARE = 0.222; // 上記プールのうちexの割合 (「相手のexに+N」系の期待値に掛ける)

// 役割ごとのラベルと基本上限枚数。上限はデッキ文脈で動的に上書きされる。
const TRAINER_ROLE = {
  draw:    { label: "ドロー",       cap: 4 },
  search:  { label: "サーチ",       cap: 4 },
  evoAid:  { label: "進化補助",     cap: 2 },
  accel:   { label: "エネ加速",     cap: 2 },
  boost:   { label: "打点補正",     cap: 2 },
  gust:    { label: "引きずり出し", cap: 2 },
  guard:   { label: "ダメージ軽減", cap: 2 },
  heal:    { label: "回復",         cap: 2 },
  shift:   { label: "入れ替え",     cap: 2 },
  disrupt: { label: "妨害",         cap: 2 },
  tool:    { label: "どうぐ",       cap: 2 },
  recycle: { label: "リソース回収", cap: 2 },
  stadium: { label: "スタジアム",   cap: 2 },
};

const TYPE_TOKEN = {
  G: "Grass", R: "Fire", W: "Water", L: "Lightning",
  P: "Psychic", F: "Fighting", D: "Darkness", M: "Metal", C: "Colorless",
};

// lo < v <= hi に入る割合 (確定数が動く相手の割合)
function shareInRange(dist, lo, hi) {
  let s = 0;
  for (const [v, w] of dist) if (v > lo && v <= hi) s += w;
  return s;
}
// hp <= dmg < hp+plus に入る割合 (HPを plus 増やすと耐えるようになる攻撃の割合)
function shareSurvived(hp, plus) {
  let s = 0;
  for (const [v, w] of FIELD_DMG) if (v >= hp && v < hp + plus) s += w;
  return s;
}

/* 打点を boost 増やしたときに確定数が縮む相手の割合。
 * perTurn=true (サカキ等その番だけ) は1回の攻撃にしか乗らないので、
 * 2発圏の判定は 2*dmg+boost。永続 (どうぐ/スタジアム) は 2*(dmg+boost)。
 * 2発で取れるようになる価値は1発の0.45倍として合算する (テンポの差ぶん割り引く)。 */
function confirmGain(dmg, boost, perTurn = true) {
  if (!dmg || !boost) return 0;
  const two = perTurn ? 2 * dmg + boost : 2 * (dmg + boost);
  return shareInRange(FIELD_HP, dmg, dmg + boost) + 0.45 * shareInRange(FIELD_HP, 2 * dmg, two);
}

// ポケモン名の検出用の正規表現を作る (長い名前を先に試すことで「アローラガラガラ」を
// 「ガラガラ」より優先。効果テキストは英語なので enName で作る)
function buildPokemonNameRegex(cards, details) {
  const names = new Set();
  for (const c of cards) {
    const d = details.get(c.id);
    if (!d || (d.c !== "Pokemon" && d.c !== "ポケモン")) continue;
    const n = c.enName || c.name;
    // 2文字以下の名前は英文中の普通の単語と衝突しやすいので除く (Muk/Mew は拾いたい)
    if (n && n.length >= 3) names.add(n);
  }
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const sorted = [...names].sort((a, b) => b.length - a.length).map(esc);
  if (!sorted.length) return null;
  return new RegExp("\\b(?:" + sorted.join("|") + ")\\b", "g");
}

// 効果テキストが名指ししている「自分の」ポケモン名を取り出す。
// これが空でなければ「そのポケモンがデッキにいなければ無価値な札」= 発動条件になる。
function extractNamedPokemon(text, pokeRe) {
  if (!text || !pokeRe) return [];
  const out = [];
  pokeRe.lastIndex = 0;
  for (const m of text.matchAll(pokeRe)) {
    const before = text.slice(Math.max(0, m.index - 24), m.index);
    if (/opponent'?s\s*$/i.test(before)) continue; // 相手のポケモンへの言及は条件ではない
    if (!out.includes(m[0])) out.push(m[0]);
  }
  return out;
}

/* トレーナー1種を効果テキストから構造化する。
 * 返り値: { name, enName, card, tt, text, roles:[], named:[], type, plus, ... } */
function classifyTrainer(card, d, pokeRe) {
  const text = String(d.e || "");
  const tt = d.tt || "Item";
  const t = text.replace(/−/g, "-"); // データは全角マイナスを使う箇所がある
  const has = (re) => re.test(t);
  const num = (re) => { const m = t.match(re); return m ? +m[1] : 0; };
  const e = {
    card, name: card.name, enName: card.enName || card.name, tt, text,
    roles: [], named: extractNamedPokemon(text, pokeRe),
    coin: /flip a coin|flip \d+ coins|flip any number of coins/i.test(t),
  };

  // --- タイプ条件 ({G}のポケモンに〜 のような色縛り) ---
  const typeTok = [...t.matchAll(/\{(\w)\}\s*Pokémon/g)].map((m) => TYPE_TOKEN[m[1]]).filter(Boolean);
  e.type = typeTok.find((x) => x && x !== "Colorless") || null;

  // --- 打点補正 ---
  // 「attacks used by your X do +N damage」/ どうぐの「+N damage」
  if (has(/do \+(\d+) damage/i)) {
    e.roles.push("boost");
    e.boost = num(/do \+(\d+) damage/i);
    e.boostVsEx = has(/damage to your opponent's (?:Active )?Pokémon ex/i);
    e.boostPerTurn = tt === "Supporter" || tt === "Item";
  }
  // ワザのコスト軽減も実質的な打点補正 (早く動ける)
  if (has(/cost (\d+) less/i) && has(/attacks used by/i)) { e.roles.push("boost"); e.costCut = num(/cost (\d+) less/i); }

  // --- HP増強 / ダメージ軽減 ---
  if (has(/gets \+(\d+) HP/i)) { e.roles.push("guard"); e.hpUp = num(/gets \+(\d+) HP/i); }
  if (has(/takes? -(\d+) damage/i)) { e.roles.push("guard"); e.reduce = num(/takes? -(\d+) damage/i); }
  if (has(/take -(\d+) damage/i)) { e.roles.push("guard"); e.reduce = Math.max(e.reduce || 0, num(/take -(\d+) damage/i)); }
  if (has(/is not Knocked Out and its remaining HP becomes/i)) { e.roles.push("guard"); e.reduce = 60; }

  // --- 回復 ---
  if (has(/[Hh]eal (\d+) damage/)) { e.roles.push("heal"); e.heal = num(/[Hh]eal (\d+) damage/); }
  if (has(/[Hh]eal all damage/)) { e.roles.push("heal"); e.heal = 120; }

  // --- エネ加速 ---
  // エネルギーゾーンから直接 / トラッシュから貼り直す 両方を拾う
  if (has(/take (?:a|\d+) \{\w\} Energy from your Energy Zone and attach|Attach (?:a|\d+|\d+ different types of) (?:random )?(?:\{\w\} )?Energy from your discard pile/i)) {
    e.roles.push("accel");
    e.accelFromDiscard = /discard pile/i.test(t);
    const m = t.match(/take (\d+) \{(\w)\} Energy/i) || t.match(/Attach (\d+) /i);
    e.accelN = m ? +m[1] : 1;
    if (!e.type) { const tm = t.match(/\{(\w)\} Energy/); if (tm) e.type = TYPE_TOKEN[tm[1]]; }
    e.endsTurn = /Your turn ends/i.test(t);
  }
  // エネルギー移動 (ベンチ→バトル場) も加速の一種だが、総量は増えないので別枠
  if (has(/Move (?:a|an|all) (?:\{\w\}(?:, |,? or )?)*\s*Energy from|Move all Energy from/i)) {
    e.roles.push("accel"); e.accelMove = true; e.accelN = 1;
  }

  // --- ドロー ---
  if (has(/[Dd]raw (\d+) cards?/)) { e.roles.push("draw"); e.drawN = num(/[Dd]raw (\d+) cards?/); }
  if (has(/[Dd]raw a card for each|draws that many cards|draw cards until you have/i)) { e.roles.push("draw"); e.drawN = 2.5; }
  // 「〜の数だけ引く」系は数える対象がデッキにいないと0枚ドロー = 完全な死に札。
  // カルム(場のメガシンカexの数だけ引く)を無条件のドロー札と誤認しないための条件
  if (has(/for each Mega Evolution Pokémon ex/i)) e.drawNeedsMega = true;
  if (has(/for each of your \{(\w)\} Pokémon|For each of your \{(\w)\} Pokémon/)) {
    const m = t.match(/for each of your \{(\w)\} Pokémon/i);
    if (m) e.type = e.type || TYPE_TOKEN[m[1]];
  }
  // 「相手の手札の枚数ぶん引く」(モノマネむすめ) は自分だけが得をする一方的なドロー。
  // 「自分の手札を引き直す」(ナンジャモ) は相手にも同じ効果を与える対称の札なので、
  // 手札が枯れている側ほど価値が出るモノマネを上に置く
  if (has(/for each card in your opponent's hand/i)) { e.oneSidedDraw = true; }
  if (has(/[Ee]ach player shuffles/i)) { e.symmetricDraw = true; }
  if (has(/[Dd]raw a card\b/) && !e.drawN) { e.roles.push("draw"); e.drawN = 1; }
  // 「手札をN枚山札に戻して1枚引く」(メンテナンス) は差し引きでカードが減る。
  // ドロー枚数だけ見て採用すると、山札を掘るどころか手札が痩せるので枚数差を持たせる
  const payBack = t.match(/[Ss]huffle (\d+) cards? from your hand into your deck/);
  if (payBack) e.netCards = (e.drawN || 0) - +payBack[1];
  // 「ついているポケモンがきぜつしたら」系は、負けている状況でしか働かない後ろ向きの効果。
  // しあわせタマゴ/ラッキーミトンをドロー札として過大評価しないための印
  if (has(/is Knocked Out by damage from an attack from your opponent/i)) e.onOwnKo = true;
  if (has(/Whenever your opponent's Pokémon is Knocked Out by damage from an attack used by/i)) e.onMyKo = true;

  // --- サーチ (山札から手札へ) ---
  if (has(/from your deck into your hand|from your deck that evolves|switch it with a random Pokémon in your deck|Put all (?:Pokémon Tool cards|Stage 1 Pokémon|Pokémon) you find there/i)) {
    e.roles.push("search");
    if (has(/Basic Pokémon/i)) e.searchFor = "basic";
    // 「HP50以下のたね」など、対象を絞るサーチは条件を持たせる (ルチア等)
    const hpCap = t.match(/maximum HP of (\d+) or less|with (\d+) HP or less/i);
    if (hpCap) e.searchHpMax = +(hpCap[1] || hpCap[2]);
    if (has(/Stage 1 Pokémon/i)) e.searchFor = "stage1";
    if (has(/Stage 2 Pokémon/i)) e.searchFor = "stage2";
    if (has(/Mega Evolution Pokémon ex/i)) e.searchFor = "mega";
    if (has(/Pokémon Tool card/i)) e.searchFor = "tool";
    if (has(/Stadium card/i)) e.searchFor = "stadium";
    if (e.named.length) e.searchFor = e.searchFor || "named";
    e.searchFor = e.searchFor || "pokemon";
  }
  // --- リソース回収 (トラッシュから戻す) ---
  if (has(/from your discard pile(?: and)? (?:into|put into) your hand|from your discard pile into your hand|put into your hand|put it into your hand instead of the discard pile/i) &&
      has(/discard pile/i) && !has(/opponent's discard pile/i)) {
    e.roles.push("recycle");
    e.recycleCoin = e.coin;
  }

  // --- 進化補助 ---
  if (has(/evolve it|skipping the Stage 1/i)) { e.roles.push("evoAid"); e.evoSkip = /skipping the Stage 1/i.test(t); }

  // --- 引きずり出し (相手のベンチを引っ張る) ---
  if (has(/Switch (?:out your opponent's Active|in 1 of your opponent's Benched)/i)) {
    e.roles.push("gust");
    e.gustChoose = /Switch in 1 of your opponent's Benched/i.test(t); // 自分で選べる=強い
    e.gustNeedsDamage = /that has damage on it/i.test(t);
    e.gustBasicOnly = /Active Basic Pokémon/i.test(t);
  }

  // --- 自分の入れ替え / にげる軽減 ---
  if (has(/Retreat Cost of (?:your|the|each)/i)) { e.roles.push("shift"); e.retreatCut = num(/(\d+) less/i) || 1; }
  if (has(/has no Retreat Cost/i)) { e.roles.push("shift"); e.retreatCut = 3; }
  if (has(/Switch your Active Pokémon .* with 1 of your Benched/i)) { e.roles.push("shift"); }
  if (has(/into your hand\.?$/i) && has(/^Put (?:your|1 of your)/i) && !e.roles.includes("search")) {
    e.roles.push("shift"); e.pickUp = true; // 自分のポケモンを手札に戻す (再利用/退避)
  }

  // --- 妨害 (相手のエネルギー/手札/場に干渉する) ---
  if (has(/[Dd]iscard (?:a|\d+) (?:random )?(?:\{\w\} )?Energy from (?:your opponent|among the Energy attached to all of your opponent)|discards cards from their hand|shuffles their hand into their deck|reveals their hand|shuffle it into your opponent's deck|Discard all Pokémon Tool cards attached to each of your opponent|chosen at random, revealed to the other player, and shuffled/i)) {
    e.roles.push("disrupt");
    e.handAttack = /shuffles their hand into their deck|discards cards from their hand/i.test(t);
    e.energyAttack = /Energy from (?:your opponent|among)/i.test(t);
  }

  // --- 山札の上を覗く系 (実質的な弱いドロー。手札に加わるならサーチ扱い) ---
  if (has(/Look at the top (?:card|\d+ cards) of your deck/i) && !e.roles.includes("search")) {
    if (has(/put it into your hand/i)) { e.roles.push("search"); e.searchFor = e.type ? "typed" : "pokemon"; e.weakDig = true; }
    else { e.roles.push("draw"); e.drawN = 0.5; }
  }
  // --- ダメージを移す/追加サイド ---
  if (has(/move (\d+) of its damage to your opponent/i)) {
    e.roles.push("boost"); e.boost = num(/move (\d+) of its damage to your opponent/i); e.boostPerTurn = true;
  }
  if (has(/you get 1 more point/i)) { e.roles.push("boost"); e.extraPoint = true; }

  // --- 状態異常の解除・付与 ---
  if (has(/recovers from all(?: of them)?|remove a random Special Condition/i)) { e.roles.push("heal"); e.cureStatus = true; }
  if (has(/is now Poisoned/i)) { e.roles.push("boost"); e.passivePoison = true; }

  // --- 検証できない種別条件 ---
  // ウルトラビースト/古代/未来 は収録データに種別フラグが無く、デッキに該当ポケモンが
  // いるかを判定できない。誤採用のほうが害が大きいので「条件付き」として大きく減点する。
  if (has(/Ultra Beasts?|Ancient Pokémon|Future Pokémon/i)) e.subtypeGate = true;
  // にげるコスト3以上でしか働かないどうぐは、重いエース限定
  if (has(/has a Retreat Cost of 3 or more/i)) e.needsHeavyRetreat = true;
  // 相手の番の終わりにトラッシュされる=1回しか守れない
  if (has(/discard it at the end of your opponent's turn/i)) e.oneShot = true;

  if (tt === "Stadium") e.roles.push("stadium");
  if (!e.roles.length) e.roles.push("misc");
  // どうぐは「盤面に置き続ける」性質があるので役割にどうぐを足す (枠管理を分けるため)
  if (tt === "Tool") e.roles.push("tool");
  e.roles = [...new Set(e.roles)];
  return e;
}

/* デッキ文脈に対する1枚の評価。score と 日本語の理由を返す。
 * score < 0 は「このデッキには入れない」 */
function evalTrainerFor(e, ctx) {
  const R = []; // 理由
  let s = 0;
  const nameIn = (n) => ctx.pokemonNames.has(n);

  // --- 発動条件: 名指しポケモンが1匹もいないなら死に札 ---
  if (e.named.length && !e.named.some(nameIn)) return { score: -1, reason: "" };
  const namedHit = e.named.filter(nameIn);
  // 種別条件(ウルトラビースト/古代/未来)はデッキ側を判定できないので採用しない
  if (e.subtypeGate) return { score: -1, reason: "" };

  // --- 色条件: デッキ色と合わないなら死に札 ---
  if (e.type && !ctx.types.has(e.type)) return { score: -1, reason: "" };

  // --- 打点補正: 確定数が縮む相手の割合で測る ---
  if (e.boost) {
    const perTurn = e.boostPerTurn !== false;
    let gain = confirmGain(ctx.aceDmg, e.boost, perTurn);
    if (e.boostVsEx) gain *= EX_SHARE; // 相手ex限定なので期待値は field の ex割合ぶん
    if (namedHit.length) gain *= 1.15;  // 名指しは条件付きだが刺さればそのエースで確実に乗る
    s += gain * 320;
    if (gain > 0.02) {
      R.push(`+${e.boost}打点で相手の${Math.round(gain * 100)}%を確定数圏内に入れる`);
    } else {
      s -= 20; // 確定数が変わらない打点補正はほぼ無価値
    }
  }
  if (e.costCut) { s += 45; R.push(`ワザのコストが${e.costCut}軽くなり立ち上がりが早い`); }
  if (e.extraPoint) { s += 70; R.push("倒したときのサイドが1枚増え、必要な打点回数がまるごと減る"); }
  if (e.passivePoison) { s += 18; R.push("殴られるたび相手をどく状態にして自然に削る"); }

  // --- 耐久 (HP増強 / 軽減) ---
  const plus = Math.max(e.hpUp || 0, e.reduce || 0);
  if (plus) {
    if (e.needsHeavyRetreat && ctx.aceRetreat < 3) return { score: -1, reason: "" };
    let gain = shareSurvived(ctx.aceHp, plus);
    if (e.oneShot) gain *= 0.5; // 1回で消えるなら守れるのは1発だけ
    s += gain * 260 + 8;
    if (gain > 0.02) R.push(`実質+${plus}耐久で相手の${Math.round(gain * 100)}%の攻撃を耐える`);
    else R.push(`実質+${plus}の耐久`);
  }
  // --- 回復 (カードとターンを使うぶん、同量の耐久より価値を落とす) ---
  if (e.heal) {
    const eff = Math.min(e.heal, ctx.aceHp);
    const gain = shareSurvived(ctx.aceHp - Math.min(eff, ctx.aceHp - 10), eff);
    s += gain * 150 + (e.tt === "Tool" ? 14 : 6);
    R.push(`${e.heal >= 120 ? "全" : e.heal}回復で相手の確定数をずらす`);
  }
  if (e.cureStatus && ctx.statusMeta) { s += 12; R.push("状態異常を解除して動きを止められない"); }

  // --- エネ加速 ---
  if (e.roles.includes("accel")) {
    // ポケポケはエネルギーゾーンから毎番1個しかつけられない。この上限を破る加速は
    // ルールの根っこを飛び越える効果なので、ドローやサーチより上に置く。
    // (実測でも加速を落としたデッキは立ち上がりが1〜2ターン遅れて勝率が大きく下がる)
    let v = e.accelMove ? 34 : 105 + (e.accelN >= 2 ? 30 : 0);
    if (e.accelFromDiscard) v *= 0.65;       // トラッシュ前提は序盤に使えない
    if (e.coin) v *= 0.8;                    // コイン依存でも「無料の1個」は十分強い
    if (ctx.coinFix) v *= 1.25;              // ウィロー系(確定表)があるならさらに戻す
    if (e.endsTurn) v *= ctx.winKey === "onehit" || ctx.winKey === "ramp" ? 1.15 : 0.6;
    if (ctx.aceCost >= 3) v *= 1.3;          // 重いエースを積んでいるほど加速が効く
    if (namedHit.length) v += 30;
    s += v;
    R.push(namedHit.length
      ? `${jaName(namedHit[0])}を名指しで加速できる`
      : "エネルギーを加速して重いワザを早く撃つ");
  }

  // --- ドロー ---
  if (e.drawN) {
    if (e.drawNeedsMega && !ctx.hasMega) return { score: -1, reason: "" };
    // 差し引きで手札が減るドローは「ドロー札」として扱わない (メンテナンス等)
    if (e.netCards !== undefined && e.netCards < 0) return { score: -1, reason: "" };
    let v = 30 + e.drawN * 16;
    if (ctx.drawCount < 4) v += 40;          // ドローが薄いデッキでは最優先級
    if (e.oneSidedDraw) v += 22;             // 一方的に引ける = 実質的なアドバンテージ
    if (e.symmetricDraw) v -= 12;            // 相手にも同じ枚数を引かせる対称の札
    if (e.handAttack && ctx.hasCopycat) v -= 45; // 手札破壊はモノマネの引きを減らす
    // 自分がきぜつしてから引ける札は、盤面が崩れた後にしか働かない。能動的に使える
    // ドローとは価値が別物なので大きく割り引く (しあわせタマゴ等)
    if (e.onOwnKo) v *= 0.2;
    if (e.onMyKo) v *= 0.5;
    s += v;
    R.push(e.oneSidedDraw
      ? "相手の手札の枚数ぶん一方的に引ける安定札 (上位デッキの定番)"
      : `手札を${e.drawN >= 2.5 ? "引き直して" : `${e.drawN}枚`}補充し、初動の再現性を上げる`);
  }

  // --- サーチ ---
  if (e.roles.includes("search")) {
    const want = {
      basic: ctx.basicCount >= 4 ? 85 : 60,
      stage1: ctx.hasStage1 ? 55 : -1,
      // 2進化デッキは「2進化を引けない」ことがそのまま敗因になる。パワーより一貫性を
      // 優先する方針なので、2進化サーチは打点補正より上に置く (アメと2枚セットで骨格)
      stage2: ctx.hasStage2 ? 115 : -1,
      mega: ctx.hasMega ? 85 : -1,
      tool: ctx.toolCount >= 3 ? 45 : -1,
      stadium: ctx.stadiumCount >= 1 ? 30 : -1,
      named: namedHit.length ? 70 : -1,
      typed: 30,
      pokemon: 45,
    }[e.searchFor || "pokemon"];
    if (want < 0) return { score: -1, reason: "" }; // 対象がデッキにいないサーチは死に札
    // HP上限つきのサーチは、その条件を満たすポケモンがデッキに2枚以上いないと空振りする
    if (e.searchHpMax && (ctx.lowHpBasics || 0) < 2) return { score: -1, reason: "" };
    let v = want;
    if (e.coin) v *= 0.75;
    if (e.weakDig) v *= 0.45; // 山札の上を覗くだけの札は当たらないことが多い
    s += v;
    const what = { basic: "たね", stage1: "1進化", stage2: "2進化", mega: "メガシンカex", tool: "どうぐ", stadium: "スタジアム", named: jaName(namedHit[0] || ""), typed: "対象のポケモン", pokemon: "ポケモン" }[e.searchFor || "pokemon"];
    R.push(`${what}を山札から直接持ってきて事故を防ぐ`);
  }
  if (e.roles.includes("recycle")) { s += 22; R.push("倒れた戦力を回収して息切れを防ぐ"); }

  // --- 進化補助 ---
  if (e.roles.includes("evoAid")) {
    if (e.evoSkip) {
      if (!ctx.hasStage2) return { score: -1, reason: "" };
      s += 95; R.push("2進化を1ターン早く立てて、進化が止まる事故をなくす");
    } else {
      if (!ctx.hasStage1 && !ctx.hasStage2) return { score: -1, reason: "" };
      s += 40; R.push("手札の進化カードを介さず盤面を進化させる");
    }
  }

  // --- 引きずり出し ---
  if (e.roles.includes("gust")) {
    let v = e.gustChoose ? 58 : 42;
    if (e.gustNeedsDamage) v *= ctx.benchDamage ? 1.5 : 0.85; // ベンチを削る構築なら常に条件を満たす
    if (e.gustBasicOnly) v *= 0.7;
    s += v;
    R.push(e.gustChoose
      ? "弱った相手のベンチを引きずり出して取り切る"
      : "育った相手を強制的に下げてテンポを奪う");
  }

  // --- 入れ替え / にげる軽減 ---
  if (e.roles.includes("shift")) {
    let v = 20 + (ctx.aceRetreat >= 2 ? 18 : 0);
    if (e.pickUp) v = namedHit.length ? 26 : 12;
    s += v;
    R.push(e.retreatCut ? "重いにげるコストを踏み倒して盤面を回す" : "傷ついたアタッカーを下げて立て直す");
  }

  // --- 妨害 ---
  if (e.roles.includes("disrupt")) {
    let v = 26;
    if (e.handAttack && ctx.hasCopycat) v -= 40; // 逆シナジー
    if (e.coin) v *= 0.75;
    s += v;
    R.push("相手のエネルギーや手札を削ってテンポ差をつける");
  }

  // --- どうぐ枠の追加価値 ---
  // 「場のどうぐの数×N」で殴るコア(デデンネex等)にとって、どうぐ1枚が打点そのもの。
  // ただし加点を上げすぎるとどうぐで枠が埋まり、加速とドローが押し出されて逆に弱くなる
  // (実測: +40で+11.0pt / +60で+12.6pt / +85で+9.2pt / +110で+2.1pt)。+60が最適
  if (e.tt === "Tool" && ctx.toolSynergy) { s += 60; R.push("盤面のどうぐの数がそのまま打点になる"); }

  // --- スタジアム (両者に効くので、自分だけ得する形でないと価値が薄い) ---
  if (e.tt === "Stadium") {
    if (e.hpUp && ctx.allBasic) { s += 30; R.push("たね主体の自分だけが恩恵を受けやすい"); }
    else if (e.roles.includes("draw") || e.roles.includes("search")) { s += 18; }
    else s -= 10; // 相手にも同じ恩恵を与えるだけの置物は避ける
  }

  // --- 勝ち筋との相性 ---
  if (ctx.winKey === "aggro" && e.endsTurn) { s -= 40; R.push("(ただし番が終わるのでアグロとは噛み合わない)"); }
  if (ctx.winKey === "status" && e.cureStatus) s += 8;
  if (ctx.toolSynergy && /Discard all Pokémon Tool|Return all Pokémon Tools/i.test(e.text)) {
    return { score: -1, reason: "" }; // 自分のどうぐも巻き込む札はどうぐ構築に入れない
  }

  return { score: s, reason: R.join(" / ") };
}

// 表示用: 英語名を日本語に (ja.js がある環境では翻訳)
function jaName(n) {
  return typeof jaCardName === "function" && n ? jaCardName(n) : n;
}

/* デッキ文脈をまとめる。suggest.js / app.js の両方から同じ形で作れるようにする。 */
function buildTrainerContext({ cards, details, deck, energies = [], cardById, winCondition = null }) {
  cardById = cardById || new Map(cards.map((c) => [c.id, c]));
  const isPk = (d) => d && (d.c === "Pokemon" || d.c === "ポケモン");
  const parseDmg = (v) => { const m = String(v ?? "").match(/\d+/); return m ? +m[0] : 0; };
  const nonColorless = (t) => t !== "Colorless" && t !== "無色";
  const ids = Object.keys(deck);
  const types = new Set(energies);

  const pokemonNames = new Set();
  let aceDmg = 0, aceHp = 60, aceCost = 0, aceRetreat = 0;
  let hasStage1 = false, hasStage2 = false, hasMega = false, allBasic = true;
  let basicCount = 0, toolCount = 0, stadiumCount = 0, benchDamage = false, coinFix = false;
  let lowHpBasics = 0;
  let drawCount = 0, statusMeta = false, toolSynergy = false, hasCopycat = false;

  for (const id of ids) {
    const c = cardById.get(id);
    const d = details.get(id);
    const n = deck[id] || 0;
    if (!c || !d) continue;
    if (isPk(d)) {
      pokemonNames.add(c.enName || c.name);
      pokemonNames.add(c.name);
      const st = String(d.s || "");
      if (/^Basic$|たね/.test(st)) {
        basicCount += n;
        if ((d.h || 0) <= 50) lowHpBasics += n;
      } else { allBasic = false; }
      if (/Stage ?1|1進化/.test(st)) hasStage1 = true;
      if (/Stage ?2|2進化/.test(st)) hasStage2 = true;
      if (/^メガ|^Mega /.test(c.name) || /^Mega /.test(c.enName || "")) hasMega = true;
      // エース = デッキのエネルギーで撃てる最大打点のポケモン
      for (const a of d.a || []) {
        const cost = (a.c || []);
        if (types.size && !cost.filter(nonColorless).every((t) => types.has(t))) continue;
        const v = parseDmg(a.d);
        if (v > aceDmg) { aceDmg = v; aceHp = d.h || aceHp; aceCost = cost.length; aceRetreat = d.rc || 0; }
        if (/damage to (?:each of )?your opponent's Benched|damage to 1 of your opponent's Pokémon/i.test(a.e || "")) benchDamage = true;
        if (/is now (?:Asleep|Poisoned|Confused|Paralyzed|Burned)/i.test(a.e || "")) statusMeta = true;
        if (/for each Pokémon Tool attached|has a Pokémon Tool attached/i.test(a.e || "")) toolSynergy = true;
      }
      for (const ab of d.ab || []) {
        if (/damage to (?:each of )?your opponent's Benched/i.test(ab.e || "")) benchDamage = true;
      }
    } else {
      const tt = d.tt || "Item";
      if (tt === "Tool") toolCount += n;
      if (tt === "Stadium") stadiumCount += n;
      if (/Draw|draw a card|shuffles the cards in their hand/i.test(d.e || "")) drawCount += n;
      if (/from your deck into your hand/i.test(d.e || "")) drawCount += n;
      if (/Draw a card for each card in your opponent's hand/i.test(d.e || "")) hasCopycat = true;
      if (/the first coin flip will definitely be heads/i.test(d.e || "")) coinFix = true;
    }
  }
  if (!aceDmg) aceDmg = 60; // 打点不明なら平均的な値で評価

  return {
    types, pokemonNames, aceDmg, aceHp, aceCost, aceRetreat,
    hasStage1, hasStage2, hasMega, allBasic, basicCount, lowHpBasics, toolCount, stadiumCount,
    benchDamage, coinFix, drawCount, statusMeta, toolSynergy, hasCopycat,
    winKey: winCondition?.key || null,
  };
}

/* 全トレーナーを分類してキャッシュ (カード枚数が変わったら作り直す) */
let _trainerPoolCache = null;
function trainerPool(cards, details) {
  if (_trainerPoolCache && _trainerPoolCache.size === cards.length) return _trainerPoolCache.list;
  const pokeRe = buildPokemonNameRegex(cards, details);
  const seen = new Set();
  const list = [];
  for (const c of cards) {
    const d = details.get(c.id);
    if (!d || d.c === "Pokemon" || d.c === "ポケモン") continue;
    if (seen.has(c.name)) continue; // 同名の別イラストは1枚だけ評価する
    seen.add(c.name);
    list.push(classifyTrainer(c, d, pokeRe));
  }
  _trainerPoolCache = { size: cards.length, list };
  return list;
}

/* 役割ごとの必要枚数 (枠配分)。
 * 構築ガイドが一致して言う「ポケモン8〜10 / トレーナー10〜12」を前提に、
 * まず一貫性の骨 (サーチ2・ドロー2・2進化なら進化補助2) を確保し、
 * 残りをデッキ文脈でスコアの高い役割に配る。 */
function roleBudget(ctx, slots) {
  const cap = {};
  for (const [k, v] of Object.entries(TRAINER_ROLE)) cap[k] = v.cap;
  cap.tool = ctx.toolSynergy ? 6 : 2;          // どうぐ構築は盤面4匹ぶん載せたい
  cap.evoAid = ctx.hasStage2 ? 2 : (ctx.hasStage1 ? 2 : 0);
  cap.accel = ctx.aceCost >= 3 ? 2 : 2;
  cap.stadium = slots >= 12 ? 2 : 0;           // 枠が薄いときスタジアムは切る
  cap.disrupt = ctx.winKey === "disrupt" ? 4 : 2;
  cap.heal = ctx.winKey === "status" ? 2 : 2;
  return cap;
}

/* デッキ文脈に合うトレーナーを、役割の枠配分とシナジーを見ながら選ぶ。
 * 返り値: { picks:[{card,count,role,reason,score}], budget } */
function buildTrainerPackage({ cards, details, deck, energies, cardById, winCondition, slots = 10, exclude = new Set(), preUsed = null }) {
  const ctx = buildTrainerContext({ cards, details, deck, energies, cardById, winCondition });
  const pool = trainerPool(cards, details);
  // 骨格で先に入れた札も役割の枠を消費させる。こうしないとサーチだけで枠が埋まり、
  // 打点補正や引きずり出しが1枚も入らない偏った構築になる
  const cap = roleBudget(ctx, slots + totalOf(preUsed));

  const scored = [];
  for (const e of pool) {
    if (exclude.has(e.name)) continue;
    const { score, reason } = evalTrainerFor(e, ctx);
    if (score <= 0) continue;
    scored.push({ e, score, reason, role: primaryRole(e) });
  }
  scored.sort((a, b) => b.score - a.score);

  const used = Object.assign({}, preUsed || {});
  const picks = [];
  let left = slots;
  // サポートは1ターン1枚しか使えない。積みすぎると手札で渋滞して腐るので、
  // 既に入っているサポートの枚数に応じて次のサポートの価値を落とす。
  // グッズ/どうぐは1ターンに何枚でも使えるため、この渋滞は起きない。
  let supporters = preUsed?.draw || 0; // 骨格の博士の研究ぶん
  const congestion = () => Math.max(0.45, 1 - Math.max(0, supporters - 2) * 0.16);
  /* 逆に、グッズは「1ターンに何枚でも使える」ことがそのまま強さになる。
   * 効果の派手さだけで並べるとサポートばかりが上位に来るが、実際の構築ガイドは
   * どれも「グッズ6〜7枚」を目安に挙げる (アルテマ/Game8/GameWith)。
   * 使用回数の制限が無いぶんを ITEM_FREEDOM で明示的に評価する。 */
  const ITEM_FREEDOM = 1.0;

  /* 貪欲法。ポイントは「2枚まとめて取らず、1枚ずつ取る」こと。
   * 同じカードの2枚目は1枚目より価値が低い ——
   *   - 引きたい場面は限られるので2枚目は手札で余りやすい
   *   - サポートは1ターン1枚しか使えないので、2枚目が腐る確率はさらに上がる
   * そこで2枚目を割り引いて評価し、他の札の1枚目と正面から競わせる。
   * こうすると「飴2・博士2・ボール2」で枠が終わらず、デッキに合ったサポートが
   * 1枚差しも含めて幅広く入るようになる (実測: 種類数 5.1→6.6、勝率も +3.7→+4.4pt)。 */
  const SECOND_COPY = 0.62; // 2枚目の価値の掛け率
  const taken = new Map(); // card.name -> 枚数
  let stadiumKind = null;  // 場に出せるスタジアムは1枚だけ (種類を混ぜても腐る)
  while (left > 0) {
    let best = null, bestEff = -Infinity;
    for (const s of scored) {
      const n = taken.get(s.e.name) || 0;
      if (n >= 2) continue;
      if ((used[s.role] || 0) >= (cap[s.role] ?? 2)) continue;
      // スタジアムは場に1枚しか置けず、2枚目を出すと1枚目が消える。
      // 種類を混ぜると自分で自分のスタジアムを流すことになるので1種類に絞る
      if (s.e.tt === "Stadium" && stadiumKind && stadiumKind !== s.e.name) continue;
      let eff = s.score;
      if (n === 1) eff *= SECOND_COPY;
      if (s.e.tt === "Supporter") eff *= congestion();
      else if (s.e.tt === "Item") eff *= ITEM_FREEDOM;
      if (eff > bestEff) { bestEff = eff; best = s; }
    }
    if (!best) break;
    if (best.e.tt === "Stadium") stadiumKind = best.e.name;
    const n = (taken.get(best.e.name) || 0) + 1;
    taken.set(best.e.name, n);
    used[best.role] = (used[best.role] || 0) + 1;
    left--;
    if (best.e.tt === "Supporter") supporters++;
    const prev = picks.find((p) => p.card.name === best.e.name);
    if (prev) prev.count++;
    else {
      picks.push({
        card: best.e.card, count: 1, role: best.role,
        roleLabel: TRAINER_ROLE[best.role]?.label || "その他",
        reason: best.reason, score: Math.round(bestEff),
      });
    }
    // 選んだ札で文脈が変わるものは反映する (モノマネを取ったら手札破壊の評価が下がる)
    if (best.e.oneSidedDraw) ctx.hasCopycat = true;
    if (best.e.drawN) ctx.drawCount++;
  }
  return { picks, ctx, budget: cap, used, supporters };
}

function totalOf(obj) {
  return obj ? Object.values(obj).reduce((a, b) => a + b, 0) : 0;
}

// 役割の優先順 (1枚が複数の役割を持つとき、枠管理に使う主役割を決める)
const ROLE_PRIORITY = ["evoAid", "accel", "search", "draw", "boost", "gust", "guard", "heal", "tool", "shift", "disrupt", "recycle", "stadium", "misc"];
function primaryRole(e) {
  // スタジアムは常にスタジアム枠で数える (両者に影響する特殊な枠なので)
  if (e.tt === "Stadium") return "stadium";
  if (e.tt === "Tool") {
    // どうぐは「どうぐ枠」で数える。ただし打点/耐久どうぐは役割も残す
    return "tool";
  }
  for (const r of ROLE_PRIORITY) if (e.roles.includes(r)) return r;
  return "misc";
}

if (typeof module !== "undefined") {
  module.exports = {
    buildTrainerPackage, buildTrainerContext, classifyTrainer, evalTrainerFor,
    trainerPool, TRAINER_ROLE, confirmGain, shareSurvived, FIELD_HP, FIELD_DMG,
  };
}
