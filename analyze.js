/* デッキ思考フロー解説エンジン
 * 組み上がった20枚を、人間の上級プレイヤーの思考順で言語化し、100点で採点する:
 *   ①勝ち筋 ②エース分析 ③必要サポート ④シナジー ⑤枠配分
 *   ⑥初手・中盤・終盤 ⑦事故率・再現性 ⑧メタ相性 ⑨不要カード ⑩採点・改善案
 * suggestDeck() の結果に対して呼ぶ (構築ロジックとは独立。診断・解説用)。
 */
function analyzeDeck({ cards, details, deck, energies = [], cardById, meta } = {}) {
  cardById = cardById || new Map(cards.map((c) => [c.id, c]));
  const isPk = (d) => !!d && (d.c === "Pokemon" || d.c === "ポケモン");
  const isBasicS = (d) => d && (d.s === "Basic" || d.s === "たね");
  const isStage2S = (d) => d && /2|Stage2|Stage 2/.test(d.s || "");
  const parseDmg = (v) => { const m = String(v ?? "").match(/\d+/); return m ? +m[0] : 0; };
  const nonC = (t) => t !== "Colorless" && t !== "無色";
  const jname = (n) => (typeof jaCardName === "function" ? jaCardName(n) : n);
  const jt = (t) => (typeof jaType === "function" ? jaType(t) : t);
  const TH = [[50], [80], [120], [150], [190]]; // 確定数のHP帯

  const ents = Object.entries(deck)
    .map(([id, n]) => ({ id, n, c: cardById.get(id), d: details.get(id) }))
    .filter((e) => e.c && e.d);
  const pk = ents.filter((e) => isPk(e.d));
  const tr = ents.filter((e) => !isPk(e.d));
  const pkCount = pk.reduce((a, e) => a + e.n, 0);
  const trCount = tr.reduce((a, e) => a + e.n, 0);
  const nameOf = (e) => jname(e.c.name);

  // ワザの最大打点とコスト
  const bestAtk = (d) => {
    let dmg = 0, cost = 0, name = null;
    for (const a of d.a || []) {
      const v = parseDmg(a.d);
      if (v > dmg) { dmg = v; cost = (a.c || []).length; name = a.n; }
    }
    return { dmg, cost, name };
  };
  const hasAccelText = (d) =>
    (d.a || []).some((a) => /Energy Zone and attach/i.test(a.e || "")) ||
    (d.ab || []).some((ab) => /Energy Zone and attach|Volt Charge|ボルトチャージ/i.test(ab.e || ""));
  const hasSupportAb = (d) => {
    if (typeof parseAbilityFx !== "function") return false;
    return (d.ab || []).some((ab) => {
      const f = parseAbilityFx(ab.e);
      return f && (f.accel || f.teamBoost || f.onAttach || (f.onEvolve && f.onEvolve.accel));
    });
  };

  // ---------- ②エース: 最大打点のポケモン ----------
  const scored = pk.map((e) => ({ e, atk: bestAtk(e.d), ex: /ex$/.test(e.c.name), hp: e.d.h || 0 }));
  scored.sort((a, b) => (b.atk.dmg + (b.ex ? 40 : 0) + b.hp * 0.3) - (a.atk.dmg + (a.ex ? 40 : 0) + a.hp * 0.3));
  const ace = scored[0];
  const koLines = ace ? TH.filter(([h]) => ace.atk.dmg >= h).length : 0;

  // ---------- ①勝ち筋 ----------
  const deckHasAccel = pk.some((e) => hasAccelText(e.d) || hasSupportAb(e.d));
  const toolSyn = pk.some((e) => (e.d.a || []).some((a) => /for each Pokémon Tool|has a Pokémon Tool/i.test(a.e || "")));
  let win = { key: "beatdown", label: "中速ビートダウン", desc: "エースの確定数で相手を1匹ずつ倒し切る" };
  if (toolSyn) win = { key: "tool", label: "どうぐシナジー", desc: "ポケモンのどうぐを並べ、その数で打点を伸ばす" };
  else if (deckHasAccel && ace && ace.atk.cost >= 3) win = { key: "ramp", label: "エネ加速ランプ", desc: "加速で重いエースを早出しし、高打点で轢く" };
  else if (ace && ace.ex && ace.atk.dmg >= 140) win = { key: "onehit", label: "大型ex一撃", desc: "大型exの一撃で相手exを確定数で取る" };
  else if (ace && ace.atk.cost <= 1 && pkCount >= 10) win = { key: "aggro", label: "アグロ", desc: "軽いワザで先手を取り、テンポで押し切る" };

  // ---------- ③必要サポート (トレーナーの役割分類) ----------
  const roleOf = (nm) => {
    const N = (a) => a.some((x) => nm.includes(x));
    if (N(["モンスターボール", "アオイ", "セレナ", "ルチア", "通信"])) return "サーチ";
    if (N(["博士の研究", "モノマネ", "ものまね", "ナンジャモ"])) return "ドロー";
    if (N(["カスミ", "エレキジェネレーター", "ほのおのパッチ", "カキ", "デンジ", "メリッサ", "タケシ"])) return "エネ加速";
    if (N(["ふしぎなアメ"])) return "進化補助";
    if (N(["アカギ", "サカキ"])) return "フィニッシャー";
    if (N(["ナツメ", "レッドカード"])) return "妨害";
    if (N(["キズぐすり", "オボンのみ", "たべのこし"])) return "回復";
    if (N(["ゴツゴツメット", "おおきなマント", "リーフマント", "どくバリ", "スピーダー", "リーフ", "ふうせん"])) return "どうぐ/入替";
    return "その他";
  };
  const supportByRole = {};
  for (const e of tr) { const r = roleOf(nameOf(e)); (supportByRole[r] = supportByRole[r] || []).push(nameOf(e) + "×" + e.n); }

  // ---------- ④シナジー ----------
  const synergy = [];
  if (deckHasAccel) synergy.push("エネ加速でエースの立ち上がりを早める");
  if (toolSyn) synergy.push("どうぐの枚数がそのまま打点になる");
  const supportAbs = pk.filter((e) => hasSupportAb(e.d)).map(nameOf);
  if (supportAbs.length) synergy.push("盤面を回す特性: " + [...new Set(supportAbs)].join("・"));
  const es = energies.map(jt);
  if (es.length === 1) synergy.push(`単色(${es[0]})で色事故が起きにくい`);
  else if (es.length >= 2) synergy.push(`${es.join("+")}の2色 — 色の要求が重いと事故になりやすい`);

  // ---------- ⑤枠配分 ----------
  const basics = pk.filter((e) => isBasicS(e.d)).reduce((a, e) => a + e.n, 0);
  const stage2Lines = new Set(pk.filter((e) => isStage2S(e.d)).map(nameOf)).size;
  const slots = { pk: pkCount, tr: trCount, basics, stage2Lines };

  // ---------- ⑥初手・中盤・終盤 ----------
  const openerCard = pk.find((e) => isBasicS(e.d) &&
    (e.d.a || []).some((a) => (a.c || []).length <= 1 && parseDmg(a.d) >= 20 &&
      (a.c || []).filter(nonC).every((t) => energies.includes(t))));
  const finisher = tr.find((e) => /アカギ|サカキ/.test(nameOf(e)));
  const gamePlan = {
    opener: openerCard ? `${nameOf(openerCard)}で1エネから殴り出す` : "⚠️ 1エネで殴れるたね先鋒が薄い(初動が遅れがち)",
    mid: deckHasAccel ? "加速/進化でエースを育てる" : "手貼りでエースにエネルギーを乗せる",
    finisher: (ace ? `${nameOf(ace.e)}の${ace.atk.dmg}打点` : "エース") + (finisher ? ` + ${nameOf(finisher)}で取り漏らしを回収` : ""),
  };

  // ---------- ⑦事故率・再現性 ----------
  let consist = 60;
  const cf = [];
  if (es.length <= 1) { consist += 15; cf.push("単色(+)"); } else { consist -= 10; cf.push("2色(−)"); }
  if (basics >= 6) { consist += 10; cf.push("たね6枚以上(+)"); } else if (basics <= 4) { consist -= 10; cf.push("たねが薄い(−)"); }
  const evoLines = new Set(pk.filter((e) => !isBasicS(e.d)).map((e) => nameOf(e))).size;
  if (stage2Lines >= 2) { consist -= 8; cf.push("2進化2本(事故−)"); }
  const drawCount = tr.filter((e) => /研究|モノマネ|ものまね|ボール|アオイ|ナンジャモ/.test(nameOf(e))).reduce((a, e) => a + e.n, 0);
  if (drawCount >= 6) { consist += 12; cf.push("ドロー/サーチ厚め(+)"); } else if (drawCount <= 3) { consist -= 8; cf.push("ドロー/サーチ薄い(−)"); }
  if (!openerCard) { consist -= 6; cf.push("先鋒不在(−)"); }
  consist = Math.max(0, Math.min(100, consist));

  // ---------- ⑧メタ相性 ----------
  const metaW = meta?.weak || null, metaA = meta?.atk || null;
  const aceType = ace ? (ace.e.d.t || [])[0] : null;
  const aceWeak = ace ? (ace.e.d.w || [])[0]?.t : null;
  let metaScore = 55; const mNotes = [];
  if (metaW && aceType && metaW[aceType]) { metaScore += Math.round(metaW[aceType] * 40); mNotes.push(`自分の${jt(aceType)}がメタの弱点(${Math.round(metaW[aceType] * 100)}%)を突ける`); }
  if (metaA && aceWeak && metaA[aceWeak]) { metaScore -= Math.round(metaA[aceWeak] * 50); mNotes.push(`⚠️ エースの弱点${jt(aceWeak)}をメタの${Math.round(metaA[aceWeak] * 100)}%が突いてくる`); }
  if (!mNotes.length) mNotes.push("メタに対して大きな有利不利は出ていない");
  metaScore = Math.max(0, Math.min(100, metaScore));

  // ---------- ⑨不要カード候補 ----------
  const cuts = [];
  const weakestLine = scored[scored.length - 1];
  if (scored.length > 3 && weakestLine && weakestLine.atk.dmg < (ace ? ace.atk.dmg : 0) * 0.5)
    cuts.push(`${nameOf(weakestLine.e)}(打点が低く、エースの脇として弱い)`);
  if (es.length >= 2) {
    const offColor = pk.find((e) => { const t = (e.d.t || [])[0]; return t && nonC(t) && !energies.includes(t); });
    if (offColor) cuts.push(`${nameOf(offColor)}(デッキ色から外れている)`);
  }
  if (!cuts.length) cuts.push("目立って浮いたカードはなし");

  // ---------- ⑩採点 ----------
  const aceScore = ace ? Math.min(100, 30 + koLines * 14 + (ace.ex ? 10 : 0)) : 30;
  const curveScore = Math.max(0, Math.min(100, 100 - (ace ? Math.max(0, ace.atk.cost - 2) * 18 : 0) - (stage2Lines >= 2 ? 10 : 0)));
  const total = Math.round(aceScore * 0.28 + consist * 0.30 + metaScore * 0.22 + curveScore * 0.20);

  const suggestions = [];
  if (consist < 60) suggestions.push("ドロー/サーチかたね先鋒を増やして初動の安定を上げる");
  if (!openerCard) suggestions.push("1エネで20以上出せるたねを1種入れて先鋒を確保する");
  if (metaA && aceWeak && metaA[aceWeak] > 0.2) suggestions.push(`エースの弱点(${jt(aceWeak)})持ちが多い環境。壁や2体目で保険を`);
  if (ace && ace.atk.cost >= 3 && !deckHasAccel) suggestions.push("エースが重いのに加速がない。エネ加速手段を足すと安定する");
  if (stage2Lines >= 2) suggestions.push("2進化ラインが2本。片方を軽い相方にすると事故が減る");
  if (!suggestions.length) suggestions.push("バランス良好。あとは好みのテック枠を調整するだけ");

  return {
    win, ace: ace && { name: nameOf(ace.e), dmg: ace.atk.dmg, cost: ace.atk.cost, atkName: ace.atk.name, hp: ace.hp, ex: ace.ex, koLines },
    energies: es, support: supportByRole, synergy, slots, gamePlan,
    consistency: { score: consist, factors: cf }, meta: { score: metaScore, notes: mNotes },
    cuts, score: total, breakdown: { ace: aceScore, consistency: consist, meta: metaScore, curve: curveScore }, suggestions,
  };
}
