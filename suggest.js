/* おまかせデッキ構築エンジン
 * 核となるカード(0〜5種類)から、ポケポケの基本ルールに沿った20枚デッキを組み立てる:
 *  - 20枚ちょうど / 同名2枚まで / たねポケモン確保
 *  - 進化ラインの自動補完 (進化元を遡り、強い進化先へ伸ばす)
 *  - エネルギーは2タイプ以内を自動選択
 *  - ワザ火力・HP・ex・進化の重さでスコアリングして相方を選出
 *  - 定番トレーナーズを自動投入 (2進化がいればふしぎなアメ 等)
 */

/* トレーナーズの骨格 (必ず確保する一貫性の土台)。
 * ここに置くのは「引けないとデッキが機能しない」札だけ。
 *
 * 【1枚ずつに減らす実験は失敗した】
 * 「飴2・博士2・ボール2で枠が固定されて単調」という問題意識から、骨格を各1枚にして
 * 2枚目を他のサポートと競わせてみたところ、勝率が +4.4pt → -1.2pt と大きく落ちた。
 * 20枚デッキではボール1枚と2枚で初手に引ける確率が段違いで、これらは
 * 「枠を食っている」のではなく「引けないと機能しない」から2枚必要だと確認できた。
 * よって単調さの解消は枚数を削ることではなく、残り枠の使い方 (下の SECOND_COPY と
 * グッズ比率) で行う。
 *
 * 骨格以外は全トレーナー(287種)から役割と発動条件を判定して選ぶので、
 * シロナ(+50)/ネモ(+80)/マーマネ(+30) のような名指しの強力札も自然に入る。 */
const SUGGEST_CORE_TRAINERS = [
  // たねを引けないと何も始まらない (1枚は必ず確保、2枚目は評価に任せる)
  { names: ["Poké Ball", "モンスターボール"], count: 2, role: "search", reason: "たねを確実に引き込む初動の土台" },
  // 手札補充の最効率。20枚デッキでは1枚のドローの価値が非常に高い
  { names: ["Professor's Research", "博士の研究"], count: 2, role: "draw", reason: "手札を2枚補充する最効率のドロー" },
  // 2進化は進化が止まると即負けるので、アメだけは1枚を骨格側で確保する
  { names: ["Rare Candy", "ふしぎなアメ"], count: 2, role: "evoAid", cond: (ctx) => ctx.hasStage2,
    reason: "2進化を1ターン早く立てて進化落ちの事故をなくす" },
];

// スコアリングの重み。対戦シミュレーション実験で調整 (docs/deck-theory.md 参照):
// - 打点は「確定数」ベースで採点: メタのHP帯(50/80/120/150/190)を跨ぐ打点だけが価値を持つ
//   (素点130より「140のexを一撃で取れるか」が勝率に直結: 45.0%→49.7%)
// - コスト効率(costP)は引き続き最重要 / ex回避は明確に損 / 特性の一律加点は逆効果
const SUGGEST_WEIGHTS = {
  hpW: 0.45,   // HPの重み
  exB: 30,     // exボーナス
  stageP: 10,  // 進化段数ごとのペナルティ (立ち上がりの遅さ)
  costP: 35,   // 最大打点ワザのエネルギーコスト1個あたりのペナルティ
  abB: 0,      // 特性一律の加点は逆効果なので0 (弱い特性持ちを拾ってしまう)
  supportAbB: 70, // ただしデッキを回す特性(エネ加速/全体打点/設置ダメージ)だけは加点。
                  // 実験で 0→49.7% / 70→55.6% (+5.9pt)。狙い撃ちなら特性評価は効く

  linearW: 0,  // 確定数採点に混ぜる線形項 (0=純粋な確定数)
  megaP: 10,   // メガexペナルティ (きぜつ3pt献上リスク。強すぎると平均を落とす)
  trainerSlots: 10, // トレーナー枠。構築ガイド(アルテマ/Game8/GameWith)は揃って
                    // 「ポケモン8〜10枚・グッズ6〜7枚・サポート5〜8枚」を目安に挙げる。
                    // 12まで増やすとガイド通りの配分(ポケモン8.7/種類数7.9)になるが、
                    // 進化ラインが痩せて盤面が枯れ、勝率は +3.5pt → -0.7pt と大きく落ちた。
                    // 20枚デッキでは「殴る体を切らさない」ほうが配分の見た目より優先される

  // 進化ラインの本数制限 (実戦の定石。コアも数える)。
  // 原則は2進化1本/1進化2本だが、デッキテーマに沿う(=デッキ色と一致する)なら
  // 2進化2本目まで許容 (同色の大型アタッカー2系統は20枚環境では冗長性として強い。
  // 相方候補は onTheme で既にデッキ色に限定済みなので、2本目は必ずテーマ内)。
  // ただし進化ライン総数は3本まで (4本以上は狙ったカードが手札に来ず事故る)。
  // 既定は「2進化ライン1本」= 一貫性重視のリーンな構築。強い2進化を2本目に足すかは
  // おまかせ中にユーザーへ選択式で聞く (app.js。maxStage2Lines:2 で組み直す)
  maxStage2Lines: 1,
  maxStage1Lines: 2,
  maxEvoLines: 3,
  // 2色デッキでは指定色コスト1個ごとに減点 (単色デッキには影響しない)。
  // エネルギーゾーンが毎番ランダム1色なので、2色時は無色コストの相方が事故に強い。
  // 実験: 2色コア(タケルライコ/カイリュー系)の平均勝率 14.0%→40.2%
  dualTypedP: 10,
  // にげるコスト減点は検証の結果不採用 (0): 高いにげコストは高HP/大打点と相関するため
  // 減点すると勝率が下がる (0で51.9% / 5で47.3%)。ルール自体はシミュレータ側で再現済み
  retreatP: 0,
  // 無色タイプの汎用アタッカー(ケンタロスex等)への減点。デッキ色に沿った相方を
  // 優先させ、全デッキが同じ無色カードだらけになる"クセ"を止める。実験で 40 なら
  // ケンタロスex採用が6/10→0/10デッキに減り、かつ勝率は無ペナルティと同値(51.3%)
  colorlessP: 40,
  thresholds: [[50, 20], [80, 24], [120, 24], [150, 20], [190, 16]], // HP帯 (確定数採点)
  // 【方針】環境(メタ)への相性最適化はしない。特定の流行デッキに合わせるより、
  // 「毎試合きちんと自分の動きができる=一貫性」を優先する。よってタイプ相性
  // (メタの弱点/攻撃色に対する加減点)は無効化 (typeDefP=0 / meta=null)。
  // 一貫性は 単色優先・進化ライン最小・たね確保(opener)・ドロー厚めで担保する。
  typeDefP: 0,
  meta: null,
  opener: true, // 1エネで殴り出せるたね先鋒を必ず1種確保する (初動の一貫性)
};

/* 勝ち筋の推定。
 * 【修正前の問題】ライン全体の効果テキストを優先順に見ていたため、
 * 「130打点＋おまけでどく」のメガジュカインexが【状態異常ロック】と判定されていた。
 * 状態異常やベンチ狙撃は"添え物"として付いていることが多く、それを勝ち筋と呼ぶと
 * 説明もサポート選択もズレる。
 * 【修正後】まず「エース = 一番打点の高いワザ」を特定し、そのエースがどうやって
 * 点を取るのかを軸に分類する。状態異常や狙撃は、それが主役 (=打点が伴わない) の
 * ときだけ勝ち筋として採用する。 */
function inferWinCondition(dList) {
  const parse = (v) => { const m = String(v ?? "").match(/\d+/); return m ? +m[0] : 0; };
  let ace = null;          // 最大打点のワザ
  let cheapHitter = false; // 1エネで20以上出せる先鋒がいるか
  const abTexts = [];
  const allTexts = [];
  for (const d of dList) {
    if (!d) continue;
    for (const a of d.a || []) {
      allTexts.push(a.e || "");
      const dm = parse(a.d);
      const cost = (a.c || []).length;
      if (cost <= 1 && dm >= 20) cheapHitter = true;
      if (!ace || dm > ace.dmg) ace = { dmg: dm, cost, e: a.e || "" };
    }
    for (const ab of d.ab || []) { abTexts.push(ab.e || ""); allTexts.push(ab.e || ""); }
  }
  ace = ace || { dmg: 0, cost: 0, e: "" };
  const all = allTexts.join(" ");
  const has = (re) => re.test(all);
  const aceHas = (re) => re.test(ace.e);
  const T = (key, label, plan) => ({ key, label, plan });

  // --- 1. エース自身の性質で決まるもの (打点の出し方そのものが勝ち筋) ---
  if (aceHas(/for each Pokémon Tool attached/i) || has(/for each Pokémon Tool attached/i))
    return T("tool", "どうぐシナジー", "ポケモンのどうぐを並べ、その数で打点を伸ばして殴る");
  // ベンチ狙撃は「エースの攻撃先がベンチ」のときだけ。添え物の狙撃では名乗らない
  if (aceHas(/damage to (?:each of )?your opponent'?s Benched|damage to 1 of your opponent'?s Pokémon/i))
    return T("snipe", "ベンチ狙撃", "相手のベンチを直接叩き、育つ前のアタッカーを削り切る");

  // --- 2. 盤面を作る手段が勝ち筋になっているもの ---
  if (abTexts.some((e) => /Energy Zone and attach/i.test(e)) && ace.cost >= 3)
    return T("ramp", "エネ加速ランプ", "特性で加速し、重いエースを早く動かして高打点で轢く");

  // --- 3. 打点で殴るデッキ (状態異常は"おまけ"として扱う) ---
  const poisonRider = aceHas(/is now (?:Asleep|Poisoned|Confused|Paralyzed|Burned)/i);
  const rider = poisonRider ? "（おまけで状態異常も入る）" : "";
  if (ace.dmg >= 140) return T("onehit", "大型一撃", `大型アタッカーの一撃で相手exを確定数で取る${rider}`);
  if (ace.dmg >= 90 && ace.cost <= 3)
    return T("midrange", "中速ビートダウン", `2〜3エネの効率打点で1匹ずつ確実に倒す${rider}`);

  // --- 4. 打点が伴わないなら、初めて状態異常/妨害が主役 ---
  if (has(/is now (?:Asleep|Poisoned|Confused|Paralyzed|Burned)/i))
    return T("status", "状態異常ロック", "ねむり・どく・マヒ等で相手の動きを止めつつ、じわじわ削る");
  if (has(/Discard (?:a|\d+|an) (?:random )?(?:\{\w\} )?Energy from your opponent|can'?t attack during your opponent/i))
    return T("disrupt", "妨害コントロール", "相手のエネルギーや行動を縛り、テンポ差で勝つ");
  if (cheapHitter) return T("aggro", "アグロ", "軽いワザで先手を取り、テンポで押し切る");
  return T("beatdown", "ビートダウン", "エースの打点で正面から殴り合う");
}

function suggestDeck({ cards, details, deck: coreDeck, weights = SUGGEST_WEIGHTS }) {
  const SIZE = 20;
  const MAX_PER = 2;
  let TRAINER_SLOTS = weights.trainerSlots ?? 8; // トレーナーズ用に残す枠の目安

  // 打点の採点: thresholds指定時は「確定数」ベース (メタのHP帯を超えた打点だけ加点)
  const dmgScore = (dmg) => {
    if (!weights.thresholds) return dmg;
    let s = dmg * (weights.linearW || 0); // 同しきい値内の序列づけ用の線形項
    for (const [thr, w] of weights.thresholds) if (dmg >= thr) s += w;
    return s;
  };

  const isPokemon = (d) => !!d && (d.c === "Pokemon" || d.c === "ポケモン");
  const isTrainer = (d) => !!d && !isPokemon(d);
  const parseDmg = (v) => { const m = String(v ?? "").match(/\d+/); return m ? +m[0] : 0; };
  const nonColorless = (t) => t !== "Colorless" && t !== "無色";
  const isBasic = (d) => d.s === "Basic" || d.s === "たね";
  const isStage2 = (d) => d.s === "Stage2" || d.s === "Stage 2" || d.s === "2進化";

  const cardById = new Map(cards.map((c) => [c.id, c]));

  // 名前ごとに最良バリアントを選ぶ
  const rawScore = (card, d) => {
    let dmg = 0;
    let cost = 0;
    for (const a of d.a || []) {
      const v = parseDmg(a.d);
      if (v > dmg) { dmg = v; cost = (a.c || []).length; }
    }
    return dmgScore(dmg) - cost * weights.costP + (d.h || 0) * weights.hpW -
      (d.rc || 0) * (weights.retreatP || 0) +
      (/ex$/.test(card.name) ? weights.exB : 0) +
      (/^メガ|^Mega /.test(card.name) && /ex$/.test(card.name) ? -(weights.megaP || 0) : 0) +
      ((d.ab || []).length ? (weights.abB || 0) : 0);
  };
  const byName = new Map();
  for (const card of cards) {
    const d = details.get(card.id);
    if (!isPokemon(d)) continue;
    const score = rawScore(card, d);
    const cur = byName.get(card.name);
    if (!cur || score > cur.score) byName.set(card.name, { card, d, score });
  }
  if (!byName.size) return { error: "カードデータの取り込みが終わってから試してください" };

  // 進化関係 (dv=進化元は元データの言語なので、表示名に合わせて翻訳する)
  const parentName = (d) =>
    d.dv ? (typeof jaCardName === "function" ? jaCardName(d.dv) : d.dv) : null;
  const children = new Map();
  for (const e of byName.values()) {
    const p = parentName(e.d);
    if (!p) continue;
    if (!children.has(p)) children.set(p, []);
    children.get(p).push(e);
  }

  // entry から最強の進化先チェーンを下る
  const lineDown = (entry) => {
    const line = [entry];
    let cur = entry;
    while (true) {
      const kids = children.get(cur.card.name) || [];
      if (!kids.length) break;
      kids.sort((a, b) => b.score - a.score);
      cur = kids[0];
      line.push(cur);
    }
    return line;
  };
  // entry から進化元をたねまで遡る
  const lineUp = (entry) => {
    const line = [entry];
    const seen = new Set([entry.card.name]);
    let cur = entry;
    while (true) {
      const p = parentName(cur.d);
      if (!p || seen.has(p)) break;
      const pe = byName.get(p);
      if (!pe) break;
      line.unshift(pe);
      seen.add(p);
      cur = pe;
    }
    return line;
  };

  // --- デッキ操作 ---
  const newDeck = {};
  const total = () => Object.values(newDeck).reduce((a, b) => a + b, 0);
  const nameCount = (name) => {
    let n = 0;
    for (const [id, c] of Object.entries(newDeck)) if (cardById.get(id)?.name === name) n += c;
    return n;
  };
  const hasName = (name) => nameCount(name) > 0;
  const add = (id, n) => {
    const name = cardById.get(id)?.name;
    const can = Math.min(n, MAX_PER - nameCount(name), SIZE - total());
    if (can > 0) newDeck[id] = (newDeck[id] || 0) + can;
  };
  const pokemonCount = () =>
    Object.entries(newDeck).reduce((a, [id, c]) => a + (isPokemon(details.get(id)) ? c : 0), 0);

  // --- コア ---
  const coreIds = Object.keys(coreDeck);
  const coreNames = [...new Set(coreIds.map((id) => cardById.get(id)?.name).filter(Boolean))];
  if (coreNames.length > 5) {
    return { error: "核にできるのは5種類までです。デッキを5種類以下にしてから押してください" };
  }

  for (const id of coreIds) add(id, Math.max(coreDeck[id] || 0, 2));

  let corePokemon = coreIds
    .map((id) => cardById.get(id))
    .filter((c) => c && isPokemon(details.get(c.id)))
    .map((c) => byName.get(c.name))
    .filter(Boolean);

  // コア未指定ならexポケモン上位からランダムに選ぶ
  if (!coreNames.length) {
    const tops = [...byName.values()]
      .filter((e) => /ex$/.test(e.card.name))
      .sort((a, b) => b.score - a.score)
      .slice(0, 12);
    const pool = tops.length ? tops : [...byName.values()].sort((a, b) => b.score - a.score).slice(0, 12);
    const pick = pool[Math.floor(Math.random() * pool.length)];
    corePokemon = [pick];
    add(pick.card.id, 2);
  }

  // コアの進化ラインを上下に補完
  const coreLines = [];
  for (const e of corePokemon) {
    const up = lineUp(e);
    const line = [...up, ...lineDown(up[up.length - 1]).slice(1)];
    coreLines.push(line);
    for (const m of line) add(m.card.id, 2);
  }

  // --- エネルギータイプ決定 ---
  // コアのワザコストに加えて、効果テキストが参照する色 ({L}の数×20追加 等) も読む。
  // ミライドンex(コスト無色3+雷参照効果)のようなカードで色を取り違えないため
  const EFFECT_TOKEN_TYPE = {
    G: "Grass", R: "Fire", W: "Water", L: "Lightning",
    P: "Psychic", F: "Fighting", D: "Darkness", M: "Metal",
  };
  const typeCount = new Map();
  const bump = (t, w) => { if (t) typeCount.set(t, (typeCount.get(t) || 0) + w); };
  for (const line of coreLines) {
    for (const m of line) {
      for (const a of m.d.a || []) {
        for (const t of (a.c || []).filter(nonColorless)) bump(t, 2);
        for (const tok of String(a.e || "").matchAll(/\{(\w)\}/g)) bump(EFFECT_TOKEN_TYPE[tok[1]], 1);
      }
      for (const ab of m.d.ab || []) {
        for (const tok of String(ab.e || "").matchAll(/\{(\w)\}/g)) bump(EFFECT_TOKEN_TYPE[tok[1]], 1);
      }
    }
  }
  // コストも効果も無色のみのコアは、ポケモン自身のタイプを弱い手がかりに
  if (!typeCount.size) {
    for (const line of coreLines) {
      for (const m of line) {
        for (const t of (m.d.t || []).filter((x) => nonColorless(x) && x !== "Dragon")) bump(t, 1);
      }
    }
  }
  // シミュレーションの結果、単色は2色より明確に安定して勝率が高かったため、
  // コアが1タイプで賄えるなら単色にする (賄えないコアがいる場合のみ2色目を足す)
  const sortedTypes = [...typeCount.entries()].sort((a, b) => b[1] - a[1]).map(([t]) => t);
  let energies = [];
  if (sortedTypes.length) {
    energies = [sortedTypes[0]];
    const coreAttackers = coreLines.flat().filter((m) => (m.d.a || []).length);
    const usableWith = (m, es) =>
      (m.d.a || []).some((a) => (a.c || []).filter(nonColorless).every((t) => es.includes(t)));
    for (const t of sortedTypes.slice(1)) {
      if (energies.length >= 2) break;
      if (coreAttackers.every((m) => usableWith(m, energies))) break;
      energies.push(t);
    }
  }

  // --- 相方ポケモン ---
  // タイプ相性 (公式ルール「弱点=+20」から導出):
  //   攻撃面: 相手メタの弱点分布に自分のタイプが刺さる確率ぶん、+20した打点で確定数を評価
  //   防御面: 自分の弱点がメタの攻撃色と一致する確率ぶん減点 (先に確定数を取られる)
  const metaWeak = weights.meta?.weak || null; // メタが弱点とする色の分布 {Fire: 0.3, ...}
  const metaAtk = weights.meta?.atk || null;   // メタの攻撃色の分布

  // エネ加速シナジー: コアがベンチへのエネ加速(ワザ/特性)を持つなら、
  // 重いワザの相方も回るのでコストペナルティを緩和する
  const hasAccel = coreLines.flat().some((m) =>
    (m.d.a || []).some((a) => /Energy Zone and attach (?:it|them) to (?:1 of your Benched|your Benched)/i.test(a.e || "")) ||
    (m.d.ab || []).some((ab) => /Energy Zone and attach/i.test(ab.e || "")));
  const effCostP = hasAccel ? weights.costP * 0.5 : weights.costP;

  // どうぐシナジー: コアが「場のどうぐの数×N」や「どうぐ装備で+N」の打点を持つなら、
  // ポケモンのどうぐを多めに積む価値がある (デデンネex/エモンガ/ヒスイドレディア等)。
  // ユーザーが選んだ実カード(coreIds)と、byNameで評価する進化ライン両方を見る
  // (同名の別バリアントが評価対象になってもシナジーを取りこぼさないため)
  const toolFx = (d) => (d?.a || []).some((a) =>
    /for each Pokémon Tool attached|has a Pokémon Tool attached/i.test(a.e || ""));
  const hasToolSynergy =
    coreIds.some((id) => toolFx(details.get(id))) || coreLines.flat().some((m) => toolFx(m.d));
  // どうぐを盤面(最大4匹)に載せ切れるよう枠を広げる (2種4枚+盤面spreadで最大4個)
  if (hasToolSynergy) TRAINER_SLOTS = Math.max(TRAINER_SLOTS, 10);

  // そのエネルギーで使えるワザだけを評価対象にする
  const usableScore = (e, es) => {
    let dmg = 0;
    let cost = 0;
    let typedN = 0;
    for (const a of e.d.a || []) {
      if (!(a.c || []).filter(nonColorless).every((t) => es.includes(t))) continue;
      const v = parseDmg(a.d);
      if (v > dmg) { dmg = v; cost = (a.c || []).length; typedN = (a.c || []).filter(nonColorless).length; }
    }
    if (!dmg) return -1;
    // 2色デッキの色事故: エネルギーゾーンは毎番ランダム1色なので、2色登録だと
    // 指定色コストが濃いワザほど「欲しい色が揃わない番」が増える → 指定色1個ごとに減点
    const dualPenalty = es.length >= 2 ? typedN * (weights.dualTypedP || 0) : 0;
    // 攻撃相性: 自タイプがメタの弱点を突く期待値で打点を評価
    const myType = (e.d.t || [])[0];
    const hitShare = (metaWeak && myType && metaWeak[myType]) || 0;
    const dmgComponent = hitShare > 0
      ? dmgScore(dmg) * (1 - hitShare) + dmgScore(dmg + 20) * hitShare
      : dmgScore(dmg);
    // 防御相性: 自分の弱点色がメタの攻撃色と重なる分だけ減点
    const myWeak = (e.d.w || [])[0]?.t;
    const hitBy = (metaAtk && myWeak && metaAtk[myWeak]) || 0;
    // テーマ一貫性: 無色タイプの汎用アタッカー(ケンタロスex等)はどのデッキにも
    // 入るため放っておくと全デッキが同じ顔になる。デッキ色に属する相方を優先し、
    // 無色スプラッシュは同色の候補が乏しいときの受け皿に留める(軽い減点)。
    const isColorlessType = (myType === "Colorless" || myType === "無色");
    const splashPenalty = isColorlessType ? (weights.colorlessP || 0) : 0;
    // デッキを回す特性(エネ加速/全体打点強化/設置ダメージ)を持つ相方を加点。
    // 一律の特性加点は逆効果だったが(abB=0)、盤面を能動的に動かす特性は別途評価する。
    let supportBonus = 0;
    if ((weights.supportAbB || 0) && typeof parseAbilityFx === "function") {
      for (const ab of e.d.ab || []) {
        const af = parseAbilityFx(ab.e);
        if (af && (af.accel || af.teamBoost || af.onAttach || (af.onEvolve && af.onEvolve.accel))) {
          supportBonus = weights.supportAbB;
          break;
        }
      }
    }
    return dmgComponent - cost * effCostP + (e.d.h || 0) * weights.hpW + supportBonus -
      (e.d.rc || 0) * (weights.retreatP || 0) - dualPenalty - splashPenalty -
      hitBy * (weights.typeDefP ?? 0) +
      (/ex$/.test(e.card.name) ? weights.exB : 0) +
      (/^メガ|^Mega /.test(e.card.name) && /ex$/.test(e.card.name) ? -(weights.megaP || 0) : 0) +
      ((e.d.ab || []).length ? (weights.abB || 0) : 0);
  };

  // --- デッキテーマの一貫性 ---
  // 相方はデッキの色に合っているべき。無色コストで撃てるからといって、別色の
  // タイプを持つポケモン(超デッキに草のワタッコex等)を入れると、弱点も進化補助も
  // 噛み合わずデッキの軸がぼやける。相方は「デッキ色と一致」か「無色タイプ」に限る。
  // (ドラゴン等の非エネルギー色は2色コストを要求するので usableScore 側で自然に除外される)
  const ENERGY_COLORS = new Set([
    "Grass", "Fire", "Water", "Lightning", "Psychic", "Fighting", "Darkness", "Metal",
    "草", "炎", "水", "雷", "超", "闘", "悪", "鋼",
  ]);
  const onTheme = (d) => {
    if (!energies.length) return true;      // 色未確定なら制限しない
    const t = (d.t || [])[0];
    if (!t || !ENERGY_COLORS.has(t)) return true; // 無色・ドラゴン等は色を選ばない
    return energies.includes(t);            // 色付きはデッキ色と一致必須
  };

  const candidates = [];
  for (const e of byName.values()) {
    if (!isBasic(e.d)) continue;
    const line = lineDown(e);
    const final = line[line.length - 1];
    if (!onTheme(final.d)) continue;        // テーマ外の別色ラインは相方にしない
    const es = energies.length
      ? energies
      : [...new Set((final.d.a || []).flatMap((a) => (a.c || []).filter(nonColorless)))].slice(0, 2);
    const score = usableScore(final, es);
    if (score < 0) continue;
    candidates.push({ line, es, score: score - (line.length - 1) * weights.stageP });
  }
  candidates.sort((a, b) => b.score - a.score);

  // 一貫性(進化ラインの本数制限): 進化ポケモンを何種類も入れると狙ったカードが
  // 手札に来ず進化が止まる。実戦の定石に従い、ラインの本数を制限する ——
  //   2進化ライン(たね→1進化→2進化): デッキに1種類まで
  //   1進化ライン(たね→1進化):        デッキに2種類まで
  //   たね単体:                        制限なし(すぐ使えて事故らない)
  // コア自身のラインも本数に数える(2進化コアがいれば2進化の枠はもう埋まっている)。
  const lineStage = (line) => {
    const final = line[line.length - 1];
    if (line.length >= 3 || isStage2(final.d)) return 2;
    if (line.length >= 2) return 1;
    return 0;
  };
  const MAX_S2 = weights.maxStage2Lines ?? 1;
  const MAX_S1 = weights.maxStage1Lines ?? 2;
  const MAX_EVO = weights.maxEvoLines ?? 3;
  let s2Count = 0;
  let s1Count = 0;
  for (const line of coreLines) {
    const st = lineStage(line);
    if (st === 2) s2Count++;
    else if (st === 1) s1Count++;
  }
  // たね単体は無制限。進化ラインは 種別ごとの上限 かつ 総本数の上限 の両方を満たすもの
  const lineFits = (st) => {
    if (st === 0) return true;
    if (s1Count + s2Count >= MAX_EVO) return false;
    return st === 2 ? s2Count < MAX_S2 : s1Count < MAX_S1;
  };
  const countLine = (st) => { if (st === 2) s2Count++; else if (st === 1) s1Count++; };
  for (const cand of candidates) {
    if (pokemonCount() >= SIZE - TRAINER_SLOTS) break;
    if (cand.line.some((m) => hasName(m.card.name))) continue;
    if (pokemonCount() + cand.line.length * 2 > SIZE - TRAINER_SLOTS + 1) continue;
    const st = lineStage(cand.line);
    if (!lineFits(st)) continue;
    if (!energies.length) energies = cand.es;
    if (usableScore(cand.line[cand.line.length - 1], energies) < 0) continue;
    for (const m of cand.line) add(m.card.id, 2);
    countLine(st);
  }

  // --- 先鋒(オープナー)の保証 ---
  // テンポ理論: エネルギー1個で殴り出せるたねが1種もいないと序盤を無償で殴られる
  if (weights.opener) {
    const isOpener = (d) =>
      isPokemon(d) && isBasic(d) &&
      (d.a || []).some((a) =>
        (a.c || []).length <= 1 && parseDmg(a.d) >= 20 &&
        (a.c || []).filter(nonColorless).every((t) => energies.includes(t)));
    const hasOpener = Object.keys(newDeck).some((id) => isOpener(details.get(id)));
    if (!hasOpener) {
      const openers = [...byName.values()]
        .filter((e) => isOpener(e.d) && !hasName(e.card.name))
        .sort((a, b) => usableScore(b, energies) - usableScore(a, energies));
      if (openers.length) add(openers[0].card.id, 2);
    }
  }

  // --- 勝ち筋の確定 (トレーナー選択より先に決める) ---
  // 旧実装は勝ち筋を最後に「表示用」として推定していた。だが実際の構築では
  // 勝ち筋が決まってからサポートを選ぶ。順序を入れ替え、勝ち筋を trainers.js に渡す。
  const coreDList = coreLines.length ? coreLines.flat().map((m) => m.d) : corePokemon.map((e) => e.d);
  const winCondition = inferWinCondition(coreDList);

  // --- トレーナーズ ---
  // 1) 骨格 (どんなデッキでも要る一貫性の土台) を先に確保
  const ctx = {
    hasStage2: Object.keys(newDeck).some((id) => {
      const d = details.get(id);
      return d && isStage2(d);
    }),
    energies: new Set(energies),
    toolSynergy: hasToolSynergy,
  };
  const findTrainer = (names) => {
    for (const c of cards) {
      if ((names.includes(c.name) || names.includes(c.enName || "")) && isTrainer(details.get(c.id))) {
        return c;
      }
    }
    return null;
  };
  const trainerPlan = [];
  const preUsed = {};
  for (const staple of SUGGEST_CORE_TRAINERS) {
    if (total() >= SIZE) break;
    if (staple.cond && !staple.cond(ctx)) continue;
    const c = findTrainer(staple.names);
    if (!c || hasName(c.name)) continue;
    const before = total();
    add(c.id, staple.count);
    const got = total() - before;
    if (got > 0) {
      preUsed[staple.role] = (preUsed[staple.role] || 0) + got;
      trainerPlan.push({ card: c, count: got, role: staple.role, roleLabel: "骨格", reason: staple.reason });
    }
  }

  // 2) 残りの枠を、効果テキストから役割を判定した287種のプールから
  //    「デッキ文脈への期待値 × 役割の枠配分」で埋める
  if (typeof buildTrainerPackage === "function" && total() < SIZE) {
    const pkg = buildTrainerPackage({
      cards, details, deck: newDeck, energies, cardById, winCondition,
      slots: SIZE - total(),
      exclude: new Set(Object.keys(newDeck).map((id) => cardById.get(id)?.name).filter(Boolean)),
      preUsed,
    });
    for (const pick of pkg.picks) {
      if (total() >= SIZE) break;
      const before = total();
      add(pick.card.id, pick.count);
      if (total() > before) trainerPlan.push({ ...pick, count: total() - before });
    }
  }

  // 足りなければ相方ポケモンを追加投入 (ここでも進化ラインの本数制限を守り、
  // 埋めるならまず たね単体 を優先する。進化ラインの乱立で事故らせない)
  if (total() < SIZE) {
    for (const cand of candidates) {
      if (total() >= SIZE) break;
      if (cand.line.some((m) => hasName(m.card.name))) continue;
      const st = lineStage(cand.line);
      if (!lineFits(st)) continue;
      if (energies.length && usableScore(cand.line[cand.line.length - 1], energies) < 0) continue;
      for (const m of cand.line) add(m.card.id, 2);
      countLine(st);
    }
  }
  // 最終フォールバック (小さいデータセットでも必ず20枚にする)
  // 進化元がデッキにいないカードは足さない
  if (total() < SIZE) {
    for (const e of [...byName.values()].sort((a, b) => b.score - a.score)) {
      if (total() >= SIZE) break;
      const p = parentName(e.d);
      if (p && !hasName(p)) continue;
      add(e.card.id, MAX_PER - nameCount(e.card.name));
    }
  }
  if (total() !== SIZE) return { error: "デッキを組み立てられませんでした (カードデータ不足)" };

  const coreLabel = corePokemon[0]?.card.name || coreNames[0] || "おまかせ";
  return { deck: newDeck, energies, name: `${coreLabel}デッキ`, winCondition, trainerPlan };
}

/* 現在のデッキを見て、足すべきトレーナーを理由つきで能動提案する。
 * おまかせ構築とまったく同じ評価器 (trainers.js) を使うので、
 * 「提案される理由」と「自動で入る理由」が食い違わない。
 * 返り値: { recs:[{card, reason, roleLabel, priority}], trainerCount, drawCount, note } */
function recommendSupport({ cards, details, deck, energies = [], cardById }) {
  cardById = cardById || new Map(cards.map((c) => [c.id, c]));
  const isPk = (d) => d && (d.c === "Pokemon" || d.c === "ポケモン");
  const ids = Object.keys(deck);
  const namesInDeck = new Set(ids.map((id) => cardById.get(id)?.name).filter(Boolean));
  const trainerCount = ids.filter((id) => !isPk(details.get(id))).reduce((a, id) => a + deck[id], 0);
  const pokemonCount = ids.filter((id) => isPk(details.get(id))).reduce((a, id) => a + deck[id], 0);

  if (typeof buildTrainerPackage !== "function") {
    return { recs: [], trainerCount, drawCount: 0, note: "" };
  }
  // 勝ち筋もデッキから推定して評価に混ぜる (狙撃デッキならアカギが上がる 等)
  const dList = ids.map((id) => details.get(id)).filter(isPk);
  const winCondition = typeof inferWinCondition === "function" ? inferWinCondition(dList) : null;

  // 空き枠が無くても「候補として何が強いか」は知りたいので、常に10枠ぶん評価させる
  const pkg = buildTrainerPackage({
    cards, details, deck, energies, cardById, winCondition,
    slots: 10, exclude: namesInDeck,
  });
  const drawCount = pkg.ctx.drawCount;
  const recs = pkg.picks.map((p, i) => ({
    card: p.card, reason: p.reason, roleLabel: p.roleLabel, priority: pkg.picks.length - i,
  }));

  let note = "";
  if (trainerCount < 8) note = `トレーナーが${trainerCount}枚と少なめ。構築ガイドの目安は10〜12枚なので、安定のため足すのがおすすめ`;
  else if (pokemonCount > 10) note = `ポケモンが${pokemonCount}枚と多め。目安は8〜10枚で、削るとサポートが入って安定します`;
  else if (drawCount < 4) note = "ドロー・サーチが薄めです。初動が止まりやすいので優先して足しましょう";
  return { recs, trainerCount, drawCount, note };
}
