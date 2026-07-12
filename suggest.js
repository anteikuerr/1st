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

// スコアリングの重み。簡易対戦シミュレータのグリッドサーチ (sim.js / 数万試合) で調整:
// コスト効率(costP)が勝率に最も効き、コスト無視の重みは全設定で最下位圏だった
const SUGGEST_WEIGHTS = {
  hpW: 0.3,    // HPの重み
  exB: 30,     // exボーナス
  stageP: 10,  // 進化段数ごとのペナルティ (立ち上がりの遅さ)
  costP: 35,   // 最大打点ワザのエネルギーコスト1個あたりのペナルティ
  abB: 0,      // 特性持ちボーナス (シミュ検証の結果、一律加点は逆効果なので0)
};

function suggestDeck({ cards, details, deck: coreDeck, weights = SUGGEST_WEIGHTS }) {
  const SIZE = 20;
  const MAX_PER = 2;
  const TRAINER_SLOTS = 8; // トレーナーズ用に残す枠の目安

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
    return dmg - cost * weights.costP + (d.h || 0) * weights.hpW +
      (/ex$/.test(card.name) ? weights.exB : 0) +
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

  // --- エネルギータイプ決定 (コアのワザコストから頻度順に2つまで) ---
  const typeCount = new Map();
  for (const line of coreLines) {
    for (const m of line) {
      for (const a of m.d.a || []) {
        for (const t of (a.c || []).filter(nonColorless)) typeCount.set(t, (typeCount.get(t) || 0) + 1);
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
  // そのエネルギーで使えるワザだけを評価対象にする
  const usableScore = (e, es) => {
    let dmg = 0;
    let cost = 0;
    for (const a of e.d.a || []) {
      if (!(a.c || []).filter(nonColorless).every((t) => es.includes(t))) continue;
      const v = parseDmg(a.d);
      if (v > dmg) { dmg = v; cost = (a.c || []).length; }
    }
    if (!dmg) return -1;
    return dmg - cost * weights.costP + (e.d.h || 0) * weights.hpW +
      (/ex$/.test(e.card.name) ? weights.exB : 0) +
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

  for (const cand of candidates) {
    if (pokemonCount() >= SIZE - TRAINER_SLOTS) break;
    if (cand.line.some((m) => hasName(m.card.name))) continue;
    if (pokemonCount() + cand.line.length * 2 > SIZE - TRAINER_SLOTS + 1) continue;
    if (!energies.length) energies = cand.es;
    if (usableScore(cand.line[cand.line.length - 1], energies) < 0) continue;
    for (const m of cand.line) add(m.card.id, 2);
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
