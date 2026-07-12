/* ポケポケ簡易対戦シミュレータ
 * デッキの強さをモンテカルロ対戦で見積もる。基本ルールをモデル化:
 *  - 3ポイント先取 / exはきぜつで2ポイント
 *  - 初手5枚 (たねが出るまで引き直し) / ベンチ3匹
 *  - 先攻の最初の番はエネルギーなし
 *  - エネルギーゾーンから毎番1個 (デッキのタイプからランダム)
 *  - 出した番と最初の番は進化できない / ふしぎなアメで2進化に飛べる
 *  - 弱点+20 / ワザはコスト(タイプ指定含む)を満たしたときのみ
 * 簡略化している点: 特性・ワザの付帯効果・にげる・特殊状態は扱わない。
 * あくまで「デッキの速度と火力とHPライン」の比較用。
 */

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// デッキ(id->枚数)をシミュレーション用の形に前処理する
function buildSimDeck({ deck, energies, cardById, details }) {
  const NONC = (t) => t !== "Colorless" && t !== "無色";
  const cards = [];
  for (const [id, count] of Object.entries(deck)) {
    const card = cardById.get(id);
    const d = details.get(id);
    if (!card || !d) continue;
    for (let i = 0; i < count; i++) {
      const isPokemon = d.c === "Pokemon" || d.c === "ポケモン";
      cards.push({
        id,
        name: card.name,
        pokemon: isPokemon,
        basic: isPokemon && (d.s === "Basic" || d.s === "たね"),
        stage2: isPokemon && /2|Stage2|Stage 2/.test(d.s || ""),
        evolvesFrom: d.dv ? (typeof jaCardName === "function" ? jaCardName(d.dv) : d.dv) : null,
        hp: d.h || 0,
        ex: /ex$/.test(card.name),
        weakness: (d.w || [])[0]?.t || null,
        attacks: (d.a || []).map((a) => ({
          cost: (a.c || []).length,
          typed: (a.c || []).filter(NONC),
          dmg: (() => { const m = String(a.d ?? "").match(/\d+/); return m ? +m[0] : 0; })(),
        })).filter((a) => a.dmg > 0),
        trainer: !isPokemon ? (card.enName || card.name) : null,
      });
    }
  }
  return { cards, energies: energies.length ? energies : ["Colorless"] };
}

function simulateGame(simDeckA, simDeckB, rng) {
  const shuffle = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  const mkPlayer = (simDeck) => {
    let deck, hand;
    // たねが引けるまで引き直し (公式ルール準拠)
    do {
      deck = shuffle(simDeck.cards);
      hand = deck.splice(0, 5);
    } while (!hand.some((c) => c.basic));
    return {
      deck, hand,
      energies: simDeck.energies,
      active: null, bench: [],
      points: 0, turn: 0,
      candy: 0, // 手札のふしぎなアメの概算管理
    };
  };

  const inst = (c, turn) => ({ ...c, energy: [], damage: 0, playedTurn: turn, evolvedTurn: turn });
  const board = (p) => [p.active, ...p.bench].filter(Boolean);

  const canPay = (mon, attack) => {
    if (mon.energy.length < attack.cost) return false;
    const pool = mon.energy.slice();
    for (const t of attack.typed) {
      const i = pool.indexOf(t);
      if (i < 0) return false;
      pool.splice(i, 1);
    }
    return true;
  };
  const bestUsable = (mon) => {
    let best = null;
    for (const a of mon.attacks) if (canPay(mon, a) && (!best || a.dmg > best.dmg)) best = a;
    return best;
  };
  const bestPotential = (mon) => Math.max(0, ...mon.attacks.map((a) => a.dmg));
  // 足りないエネルギーが少なく火力が高いものを優先
  const attackerValue = (mon) => {
    let best = 0;
    for (const a of mon.attacks) {
      const missing = Math.max(0, a.cost - mon.energy.length);
      best = Math.max(best, a.dmg / (1 + missing * 2));
    }
    return best + mon.hp / 50;
  };

  const A = mkPlayer(simDeckA);
  const B = mkPlayer(simDeckB);

  // 初期配置: たねを場に出す
  for (const p of [A, B]) {
    const basics = p.hand.filter((c) => c.basic);
    basics.sort((x, y) => bestPotential(y) + y.hp / 10 - bestPotential(x) - x.hp / 10);
    p.active = inst(basics[0], 0);
    p.hand.splice(p.hand.indexOf(basics[0]), 1);
    for (const b of basics.slice(1, 4)) {
      p.bench.push(inst(b, 0));
      p.hand.splice(p.hand.indexOf(b), 1);
    }
  }

  let turnNo = 0;
  while (turnNo < 60) {
    turnNo++;
    const me = turnNo % 2 === 1 ? A : B;
    const op = turnNo % 2 === 1 ? B : A;
    me.turn++;

    // ドロー
    if (me.deck.length) me.hand.push(me.deck.shift());

    // トレーナーズ (簡易効果)
    for (let i = me.hand.length - 1; i >= 0; i--) {
      const c = me.hand[i];
      if (!c.trainer) continue;
      const t = c.trainer;
      if (t === "Poké Ball" || t === "モンスターボール") {
        const bi = me.deck.findIndex((x) => x.basic);
        if (bi >= 0) me.hand.push(me.deck.splice(bi, 1)[0]);
        me.hand.splice(i, 1);
      } else if (t === "Professor's Research" || t === "博士の研究") {
        me.hand.push(...me.deck.splice(0, 2));
        me.hand.splice(i, 1);
      } else if (t === "Rare Candy" || t === "ふしぎなアメ") {
        me.candy++;
        me.hand.splice(i, 1);
      } else if (t === "Potion" || t === "キズぐすり") {
        if (me.active && me.active.damage >= 20) {
          me.active.damage -= 20;
          me.hand.splice(i, 1);
        }
      } else if (t === "Misty" || t === "カスミ") {
        // 水ポケモンにコイン: オモテが続く限りエネルギー
        const water = board(me).find((m) => m.attacks.some((a) => a.typed.includes("Water")));
        if (water) {
          while (rng() < 0.5) water.energy.push("Water");
          me.hand.splice(i, 1);
        }
      } else {
        me.hand.splice(i, 1); // その他は未対応 (枠を消費するぶん弱くなる)
      }
    }

    // たねをベンチへ
    for (let i = me.hand.length - 1; i >= 0 && me.bench.length < 3; i--) {
      if (me.hand[i].basic) me.bench.push(inst(me.hand.splice(i, 1)[0], me.turn));
    }

    // 進化 (出した番と自分の最初の番は不可)
    if (me.turn > 1) {
      for (const spot of board(me)) {
        if (spot.playedTurn >= me.turn) continue;
        let idx = me.hand.findIndex((c) => c.pokemon && c.evolvesFrom === spot.name);
        // ふしぎなアメ: たね→2進化
        if (idx < 0 && me.candy > 0 && spot.basic) {
          idx = me.hand.findIndex((c) => {
            if (!c.stage2) return false;
            const mid = c.evolvesFrom;
            return me.hand.some((h) => h.name === mid && h.evolvesFrom === spot.name) ||
                   simDeckACache(spot.name, mid, me);
          });
          if (idx >= 0) me.candy--;
        }
        if (idx >= 0) {
          const evo = me.hand.splice(idx, 1)[0];
          const upgraded = { ...evo, energy: spot.energy, damage: spot.damage, playedTurn: me.turn, evolvedTurn: me.turn };
          if (me.active === spot) me.active = upgraded;
          else me.bench[me.bench.indexOf(spot)] = upgraded;
        }
      }
    }

    // エネルギー (先攻の最初の番はなし)
    if (!(turnNo === 1)) {
      const type = me.energies[Math.floor(rng() * me.energies.length)];
      // アタッチ先: バトル場が次のワザに必要なら優先、そうでなければ有望なベンチ
      let target = me.active;
      const need = me.active && me.active.attacks.some((a) => !canPay(me.active, a) && a.dmg > 0);
      if (!need && me.bench.length) {
        const cands = [me.active, ...me.bench].filter(Boolean);
        cands.sort((x, y) => attackerValue(y) - attackerValue(x));
        target = cands[0];
      }
      if (target) target.energy.push(type);
    }

    // バトル場が攻撃不能でベンチに攻撃可能がいれば交代 (にげるコストは簡略化)
    if (me.active && !bestUsable(me.active)) {
      const readyIdx = me.bench.findIndex((m) => bestUsable(m));
      if (readyIdx >= 0 && attackerValue(me.bench[readyIdx]) > attackerValue(me.active)) {
        const tmp = me.active;
        me.active = me.bench[readyIdx];
        me.bench[readyIdx] = tmp;
      }
    }

    // 攻撃
    const attack = me.active && bestUsable(me.active);
    if (attack && op.active) {
      let dmg = attack.dmg;
      const myType = me.active.attacks[0]?.typed[0] || null;
      if (op.active.weakness && me.active && cardTypeMatches(me.active, op.active.weakness)) dmg += 20;
      op.active.damage += dmg;
      if (op.active.damage >= op.active.hp) {
        me.points += op.active.ex ? 2 : 1;
        op.active = null;
        if (me.points >= 3) return me === A ? 1 : 0;
        if (!op.bench.length) return me === A ? 1 : 0;
        op.bench.sort((x, y) => attackerValue(y) - attackerValue(x));
        op.active = op.bench.shift();
      }
    }
  }
  return 0.5; // 引き分け (ターン上限)
}

// ワザのタイプで弱点判定 (ポケモン自身のタイプ情報はワザのタイプで代用)
function cardTypeMatches(mon, weaknessType) {
  return mon.attacks.some((a) => a.typed.includes(weaknessType));
}

// ふしぎなアメ用: 中間進化が手札になくても山札にライン一致があれば許容する簡易判定
function simDeckACache(basicName, midName, player) {
  return player.deck.some((h) => h.name === midName && h.evolvesFrom === basicName);
}

function simulateMatch(simDeckA, simDeckB, games, seed = 42) {
  const rng = mulberry32(seed);
  let winA = 0;
  for (let i = 0; i < games; i++) {
    // 先攻を交互に
    if (i % 2 === 0) winA += simulateGame(simDeckA, simDeckB, rng);
    else winA += 1 - simulateGame(simDeckB, simDeckA, rng);
  }
  return winA / games;
}
