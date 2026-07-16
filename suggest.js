/* おまかせデッキ構築エンジン
 * 核となるカード(0〜5種類)から、ポケポケの基本ルールに沿った20枚デッキを組み立てる:
 *  - 20枚ちょうど / 同名2枚まで / たねポケモン確保
 *  - 進化ラインの自動補完 (進化元を遡り、強い進化先へ伸ばす)
 *  - エネルギーは2タイプ以内を自動選択
 *  - ワザ火力・HP・ex・進化の重さでスコアリングして相方を選出
 *  - 定番トレーナーズを自動投入 (2進化がいればふしぎなアメ 等)
 */

const SUGGEST_STAPLES = [
  { names: ["Poké Ball", "モンスターボール"], count: 2 },
  { names: ["Professor's Research", "博士の研究"], count: 2 },
  { names: ["Rare Candy", "ふしぎなアメ"], count: 2, cond: (ctx) => ctx.hasStage2 },
  { names: ["Misty", "カスミ"], count: 2, cond: (ctx) => ctx.energies.has("Water") || ctx.energies.has("水") },
  { names: ["X Speed", "スピーダー"], count: 2 },
  { names: ["Sabrina", "ナツメ"], count: 2 },
  { names: ["Giovanni", "サカキ"], count: 2 },
  { names: ["Potion", "キズぐすり"], count: 2 },
  { names: ["Giant Cape", "おおきなマント"], count: 2 },
  { names: ["Red Card", "レッドカード"], count: 2 },
  { names: ["Leaf", "リーフ"], count: 2 },
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
  abB: 0,      // 特性持ちボーナス (一律加点は逆効果なので0)
  linearW: 0,  // 確定数採点に混ぜる線形項 (0=純粋な確定数)
  megaP: 10,   // メガexペナルティ (きぜつ3pt献上リスク。強すぎると平均を落とす)
  trainerSlots: 6, // トレーナー枠 (妨害系実装後の再実験で8→6が最適に)
  // 2色デッキでは指定色コスト1個ごとに減点 (単色デッキには影響しない)。
  // エネルギーゾーンが毎番ランダム1色なので、2色時は無色コストの相方が事故に強い。
  // 実験: 2色コア(タケルライコ/カイリュー系)の平均勝率 14.0%→40.2%
  dualTypedP: 10,
  // にげるコスト減点は検証の結果不採用 (0): 高いにげコストは高HP/大打点と相関するため
  // 減点すると勝率が下がる (0で51.9% / 5で47.3%)。ルール自体はシミュレータ側で再現済み
  retreatP: 0,
  thresholds: [[50, 20], [80, 24], [120, 24], [150, 20], [190, 16]], // メタHP帯
  // タイプ相性 (公式ルール「弱点=+20」由来)。環境Tier1デッキ4種から導出した分布
  // (環境が変わったら lab.js theory10 で再導出)。実験では攻防セットで
  // リザードンex+7.4pt/ダークライex+2.9pt (退化はギャラドスex-3.4ptのみ)
  typeDefP: 40, // 自分の弱点がメタの攻撃色と重なるときの減点係数
  meta: {
    // メタの攻撃色シェア (アタッカーのタイプ分布): これを弱点に持つ相方を避ける
    atk: { Grass: 0.296, Fighting: 0.222, Darkness: 0.222, Colorless: 0.185, Lightning: 0.074 },
    // メタの弱点色シェア: この色で殴れる相方は+20打点の期待値で確定数を評価
    weak: { Fighting: 0.37, Fire: 0.222, Grass: 0.185, Psychic: 0.148, Lightning: 0.074 },
  },
};

function suggestDeck({ cards, details, deck: coreDeck, weights = SUGGEST_WEIGHTS }) {
  const SIZE = 20;
  const MAX_PER = 2;
  const TRAINER_SLOTS = weights.trainerSlots ?? 8; // トレーナーズ用に残す枠の目安

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
    return dmgComponent - cost * effCostP + (e.d.h || 0) * weights.hpW -
      (e.d.rc || 0) * (weights.retreatP || 0) - dualPenalty -
      hitBy * (weights.typeDefP ?? 0) +
      (/ex$/.test(e.card.name) ? weights.exB : 0) +
      (/^メガ|^Mega /.test(e.card.name) && /ex$/.test(e.card.name) ? -(weights.megaP || 0) : 0) +
      ((e.d.ab || []).length ? (weights.abB || 0) : 0);
  };

  const candidates = [];
  for (const e of byName.values()) {
    if (!isBasic(e.d)) continue;
    const line = lineDown(e);
    const final = line[line.length - 1];
    const es = energies.length
      ? energies
      : [...new Set((final.d.a || []).flatMap((a) => (a.c || []).filter(nonColorless)))].slice(0, 2);
    const score = usableScore(final, es);
    if (score < 0) continue;
    candidates.push({ line, es, score: score - (line.length - 1) * weights.stageP });
  }
  candidates.sort((a, b) => b.score - a.score);

  // 一貫性: 相方の2進化ラインは1本まで (コアは除く)。2進化2本は事故率が高い
  let partnerStage2 = 0;
  const maxStage2 = weights.maxStage2Lines ?? 1;
  for (const cand of candidates) {
    if (pokemonCount() >= SIZE - TRAINER_SLOTS) break;
    if (cand.line.some((m) => hasName(m.card.name))) continue;
    if (pokemonCount() + cand.line.length * 2 > SIZE - TRAINER_SLOTS + 1) continue;
    const isStage2Line = cand.line.length >= 3 || isStage2(cand.line[cand.line.length - 1].d);
    if (isStage2Line && partnerStage2 >= maxStage2) continue;
    if (!energies.length) energies = cand.es;
    if (usableScore(cand.line[cand.line.length - 1], energies) < 0) continue;
    for (const m of cand.line) add(m.card.id, 2);
    if (isStage2Line) partnerStage2++;
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

  // --- トレーナーズ ---
  const ctx = {
    hasStage2: Object.keys(newDeck).some((id) => {
      const d = details.get(id);
      return d && isStage2(d);
    }),
    energies: new Set(energies),
  };
  const findTrainer = (names) => {
    for (const c of cards) {
      if ((names.includes(c.name) || names.includes(c.enName || "")) && isTrainer(details.get(c.id))) {
        return c;
      }
    }
    return null;
  };
  for (const staple of SUGGEST_STAPLES) {
    if (total() >= SIZE) break;
    if (staple.cond && !staple.cond(ctx)) continue;
    const c = findTrainer(staple.names);
    if (!c || hasName(c.name)) continue;
    add(c.id, staple.count);
  }

  // 足りなければ相方ポケモンを追加投入
  if (total() < SIZE) {
    for (const cand of candidates) {
      if (total() >= SIZE) break;
      if (cand.line.some((m) => hasName(m.card.name))) continue;
      if (energies.length && usableScore(cand.line[cand.line.length - 1], energies) < 0) continue;
      for (const m of cand.line) add(m.card.id, 2);
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
  return { deck: newDeck, energies, name: `${coreLabel}デッキ` };
}
