/* ポケポケ簡易対戦シミュレータ v2
 * デッキの強さをモンテカルロ対戦で見積もる。基本ルールをモデル化:
 *  - 3ポイント先取 / exはきぜつで2ポイント
 *  - 初手5枚 (たねが出るまで引き直し) / ベンチ3匹
 *  - 先攻の最初の番はエネルギーなし
 *  - エネルギーゾーンから毎番1個 (デッキのタイプからランダム)
 *  - 出した番と最初の番は進化できない / ふしぎなアメで2進化に飛べる
 *  - 弱点+20 / ワザはコスト(タイプ指定含む)を満たしたときのみ
 * v2で追加: ワザの付帯効果を効果テキストから解析して実際に処理する
 *  - コイン依存ダメージ (オモテ追加 / ウラ失敗 / N枚×X / ウラまで)
 *  - ベンチ狙撃・ベンチ全体・自傷・回復・自己エネ加速・自己エネトラッシュ
 *  - どく/ねむり/マヒ、次ターンのダメージ軽減
 * 未対応: 特性、上記以外の効果 (テキストが読めないものは素点のみ)
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

const SIM_ENERGY_LETTER = { G: "Grass", R: "Fire", W: "Water", L: "Lightning", P: "Psychic", F: "Fighting", D: "Darkness", M: "Metal" };

// 効果テキスト(英語)を解析して構造化する
function parseAttackFx(text) {
  if (!text) return null;
  const fx = {};
  let m;
  if ((m = text.match(/Flip (\d+) coins?\. This attack does (\d+)( more)? damage for each heads/i))) {
    fx.multiFlip = { n: +m[1], per: +m[2], more: !!m[3] };
  }
  if ((m = text.match(/Flip a coin until you get tails\. This attack does (\d+)( more)? damage for each heads/i))) {
    fx.untilTails = { per: +m[1], more: !!m[2] };
  }
  if ((m = text.match(/Flip a coin\. If heads, this attack does (\d+) more damage/i))) fx.flipBonus = +m[1];
  if (/Flip a coin\. If tails, this attack does nothing/i.test(text)) fx.tailsNothing = true;
  if ((m = text.match(/This Pokémon also does (\d+) damage to itself/i))) fx.selfDmg = +m[1];
  if ((m = text.match(/does (\d+) damage to each of your opponent's Benched Pokémon/i))) fx.benchAll = +m[1];
  else if ((m = text.match(/does (\d+) damage to 1 of your opponent's Benched Pokémon/i))) fx.benchSnipe = +m[1];
  else if ((m = text.match(/This attack does (\d+) damage to 1 of your opponent's Pokémon/i))) fx.snipeAny = +m[1];
  if ((m = text.match(/Heal (\d+) damage from this Pokémon/i))) fx.heal = +m[1];
  if (/Active Pokémon is now Poisoned/i.test(text)) fx.poison = true;
  if (/Active Pokémon is now Asleep/i.test(text)) fx.sleep = true;
  if (/Active Pokémon is now Paralyzed/i.test(text)) {
    if (/If heads/i.test(text)) fx.paralyzeFlip = true;
    else fx.paralyze = true;
  }
  if ((m = text.match(/Discard (a|\d+) \{\w\} Energy from this Pokémon/i))) fx.discardSelf = m[1] === "a" ? 1 : +m[1];
  if (/Discard all(?: \{\w\})? Energy from this Pokémon/i.test(text)) fx.discardSelf = 99;
  if ((m = text.match(/Take a \{(\w)\} Energy from your Energy Zone and attach it to this Pokémon/i))) {
    fx.accelSelf = SIM_ENERGY_LETTER[m[1]] || "Colorless";
  }
  if ((m = text.match(/During your opponent's next turn, this Pokémon takes [−–-](\d+) damage from attacks/i))) fx.shield = +m[1];
  if ((m = text.match(/does (\d+) more damage for each Energy attached to your opponent's Active Pokémon/i))) fx.perOppEnergy = +m[1];
  if ((m = text.match(/This attack does (\d+)( more)? damage for each of your Benched/i))) {
    fx.perMyBench = { per: +m[1], more: !!m[2] };
  }
  return Object.keys(fx).length ? fx : null;
}

// 期待値 (ワザ選択用の見積もり: ベンチ2匹・相手エネ2個を仮定)
function attackEv(dmg, fx) {
  if (!fx) return dmg;
  let ev = dmg;
  if (fx.multiFlip) ev = fx.multiFlip.n * fx.multiFlip.per * 0.5 + (fx.multiFlip.more ? dmg : 0);
  if (fx.untilTails) ev = fx.untilTails.per * 1 + (fx.untilTails.more ? dmg : 0);
  if (fx.flipBonus) ev += fx.flipBonus * 0.5;
  if (fx.tailsNothing) ev *= 0.5;
  if (fx.perMyBench) ev = fx.perMyBench.more ? ev + fx.perMyBench.per * 2 : fx.perMyBench.per * 2;
  if (fx.perOppEnergy) ev += fx.perOppEnergy * 2;
  if (fx.snipeAny) ev = Math.max(ev, fx.snipeAny * 0.9);
  if (fx.benchAll) ev += fx.benchAll;
  if (fx.benchSnipe) ev += fx.benchSnipe * 0.5;
  if (fx.selfDmg) ev -= fx.selfDmg * 0.3;
  if (fx.heal) ev += fx.heal * 0.4;
  if (fx.poison) ev += 15;
  if (fx.sleep || fx.paralyze) ev += 20;
  if (fx.paralyzeFlip) ev += 10;
  if (fx.discardSelf) ev -= fx.discardSelf === 99 ? 30 : fx.discardSelf * 10;
  if (fx.accelSelf) ev += 15;
  if (fx.shield) ev += fx.shield * 0.5;
  return ev;
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
      const attacks = (d.a || []).map((a) => {
        const dmg = (() => { const mm = String(a.d ?? "").match(/\d+/); return mm ? +mm[0] : 0; })();
        const fx = parseAttackFx(a.e);
        return {
          cost: (a.c || []).length,
          typed: (a.c || []).filter(NONC),
          dmg, fx,
          ev: attackEv(dmg, fx),
        };
      }).filter((a) => a.ev > 0);
      cards.push({
        id,
        name: card.name,
        pokemon: isPokemon,
        basic: isPokemon && (d.s === "Basic" || d.s === "たね"),
        stage2: isPokemon && /2|Stage2|Stage 2/.test(d.s || ""),
        evolvesFrom: d.dv ? (typeof jaCardName === "function" ? jaCardName(d.dv) : d.dv) : null,
        hp: d.h || 0,
        ex: /ex$/.test(card.name),
        // メガex: きぜつすると相手に3ポイント入る
        mega: /ex$/.test(card.name) && (/^メガ/.test(card.name) || /^Mega /.test(card.enName || card.name)),
        weakness: (d.w || [])[0]?.t || null,
        types: d.t || [],
        attacks,
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
    do {
      deck = shuffle(simDeck.cards);
      hand = deck.splice(0, 5);
    } while (!hand.some((c) => c.basic));
    return { deck, hand, energies: simDeck.energies, active: null, bench: [], points: 0, turn: 0, candy: 0 };
  };

  const inst = (c, turn) => ({
    ...c, energy: [], damage: 0, playedTurn: turn,
    poison: false, sleep: false, para: false, shieldUntil: -1,
  });
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
    for (const a of mon.attacks) if (canPay(mon, a) && (!best || a.ev > best.ev)) best = a;
    return best;
  };
  const bestPotential = (mon) => Math.max(0, ...mon.attacks.map((a) => a.ev));
  const attackerValue = (mon) => {
    let best = 0;
    for (const a of mon.attacks) {
      const missing = Math.max(0, a.cost - mon.energy.length);
      best = Math.max(best, a.ev / (1 + missing * 2));
    }
    return best + mon.hp / 50;
  };

  const A = mkPlayer(simDeckA);
  const B = mkPlayer(simDeckB);

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

  // きぜつ処理: trueを返したら勝敗確定 (meが勝ち)
  const pointsFor = (mon) => (mon.mega ? 3 : mon.ex ? 2 : 1);
  const knockOut = (me, op, mon) => {
    if (mon === op.active) {
      me.points += pointsFor(mon);
      op.active = null;
      if (me.points >= 3 || !op.bench.length) return true;
      op.bench.sort((x, y) => attackerValue(y) - attackerValue(x));
      op.active = op.bench.shift();
      // バトル場に出ると特殊状態は消える (新しく出る子は状態なし)
    } else {
      const i = op.bench.indexOf(mon);
      if (i >= 0) {
        op.bench.splice(i, 1);
        me.points += pointsFor(mon);
        if (me.points >= 3) return true;
      }
    }
    return false;
  };

  let turnNo = 0;
  while (turnNo < 60) {
    turnNo++;
    const me = turnNo % 2 === 1 ? A : B;
    const op = turnNo % 2 === 1 ? B : A;
    me.turn++;

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
        const water = board(me).find((m) => m.attacks.some((a) => a.typed.includes("Water")));
        if (water) {
          while (rng() < 0.5) water.energy.push("Water");
          me.hand.splice(i, 1);
        }
      } else {
        me.hand.splice(i, 1);
      }
    }

    // たねをベンチへ
    for (let i = me.hand.length - 1; i >= 0 && me.bench.length < 3; i--) {
      if (me.hand[i].basic) me.bench.push(inst(me.hand.splice(i, 1)[0], me.turn));
    }

    // 進化
    if (me.turn > 1) {
      for (const spot of board(me)) {
        if (spot.playedTurn >= me.turn) continue;
        let idx = me.hand.findIndex((c) => c.pokemon && c.evolvesFrom === spot.name);
        if (idx < 0 && me.candy > 0 && spot.basic) {
          idx = me.hand.findIndex((c) => {
            if (!c.stage2) return false;
            const mid = c.evolvesFrom;
            return me.hand.some((h) => h.name === mid && h.evolvesFrom === spot.name) ||
                   me.deck.some((h) => h.name === mid && h.evolvesFrom === spot.name);
          });
          if (idx >= 0) me.candy--;
        }
        if (idx >= 0) {
          const evo = me.hand.splice(idx, 1)[0];
          const upgraded = {
            ...inst(evo, me.turn),
            energy: spot.energy, damage: spot.damage,
          };
          // 進化すると特殊状態は回復する (公式ルール)
          if (me.active === spot) me.active = upgraded;
          else me.bench[me.bench.indexOf(spot)] = upgraded;
        }
      }
    }

    // エネルギー (先攻の最初の番はなし)
    if (turnNo !== 1) {
      const type = me.energies[Math.floor(rng() * me.energies.length)];
      let target = me.active;
      const need = me.active && me.active.attacks.some((a) => !canPay(me.active, a) && a.ev > 0);
      if (!need && me.bench.length) {
        const cands = board(me);
        cands.sort((x, y) => attackerValue(y) - attackerValue(x));
        target = cands[0];
      }
      if (target) target.energy.push(type);
    }

    // 交代 (簡易: にげるコスト無視、攻撃不能時のみ)
    if (me.active && !bestUsable(me.active) && !me.active.sleep && !me.active.para) {
      const readyIdx = me.bench.findIndex((m) => bestUsable(m));
      if (readyIdx >= 0 && attackerValue(me.bench[readyIdx]) > attackerValue(me.active)) {
        const tmp = me.active;
        // 逃げると特殊状態は消える
        tmp.poison = tmp.sleep = tmp.para = false;
        me.active = me.bench[readyIdx];
        me.bench[readyIdx] = tmp;
      }
    }

    // 攻撃 (ねむり/マヒ中は不可)
    if (me.active && !me.active.sleep && !me.active.para) {
      const attack = bestUsable(me.active);
      if (attack && op.active) {
        const fx = attack.fx || {};
        let dmg = attack.dmg;

        // コイン系
        if (fx.multiFlip) {
          let heads = 0;
          for (let i = 0; i < fx.multiFlip.n; i++) if (rng() < 0.5) heads++;
          dmg = fx.multiFlip.per * heads + (fx.multiFlip.more ? attack.dmg : 0);
        }
        if (fx.untilTails) {
          let heads = 0;
          while (rng() < 0.5) heads++;
          dmg = fx.untilTails.per * heads + (fx.untilTails.more ? attack.dmg : 0);
        }
        if (fx.flipBonus && rng() < 0.5) dmg += fx.flipBonus;
        if (fx.tailsNothing && rng() < 0.5) dmg = 0;

        // 可変ダメージ
        if (fx.perMyBench) {
          dmg = fx.perMyBench.more ? dmg + fx.perMyBench.per * me.bench.length : fx.perMyBench.per * me.bench.length;
        }
        if (fx.perOppEnergy) dmg += fx.perOppEnergy * op.active.energy.length;

        if (dmg > 0) {
          // 弱点 (自分のタイプで判定)
          if (op.active.weakness && (me.active.types || []).includes(op.active.weakness)) dmg += 20;
          // 相手の軽減シールド
          if (op.active.shieldUntil >= turnNo) dmg = Math.max(0, dmg - op.active.shieldValue);
        }

        // 狙撃 / ベンチ全体
        if (fx.snipeAny) {
          const targets = board(op);
          targets.sort((x, y) => (y.hp - y.damage <= fx.snipeAny ? 1 : 0) - (x.hp - x.damage <= fx.snipeAny ? 1 : 0) || attackerValue(y) - attackerValue(x));
          const tgt = targets[0];
          if (tgt) {
            tgt.damage += fx.snipeAny;
            if (tgt.damage >= tgt.hp && knockOut(me, op, tgt)) return me === A ? 1 : 0;
          }
        }
        if (fx.benchSnipe && op.bench.length) {
          const tgt = op.bench.slice().sort((x, y) => attackerValue(y) - attackerValue(x))[0];
          tgt.damage += fx.benchSnipe;
          if (tgt.damage >= tgt.hp && knockOut(me, op, tgt)) return me === A ? 1 : 0;
        }
        if (fx.benchAll) {
          for (const tgt of op.bench.slice()) {
            tgt.damage += fx.benchAll;
            if (tgt.damage >= tgt.hp && knockOut(me, op, tgt)) return me === A ? 1 : 0;
          }
        }

        // 本体ダメージ
        if (dmg > 0 && op.active) {
          op.active.damage += dmg;
        }

        // 自分への効果
        if (fx.selfDmg) me.active.damage += fx.selfDmg;
        if (fx.heal) me.active.damage = Math.max(0, me.active.damage - fx.heal);
        if (fx.accelSelf) me.active.energy.push(fx.accelSelf);
        if (fx.discardSelf) {
          me.active.energy.splice(0, fx.discardSelf === 99 ? me.active.energy.length : fx.discardSelf);
        }
        if (fx.shield) {
          me.active.shieldUntil = turnNo + 1;
          me.active.shieldValue = fx.shield;
        }

        // 特殊状態
        if (op.active && dmg >= 0) {
          if (fx.poison) op.active.poison = true;
          if (fx.sleep) op.active.sleep = true;
          if (fx.paralyze || (fx.paralyzeFlip && rng() < 0.5)) op.active.para = true;
        }

        // きぜつ判定
        if (op.active && op.active.damage >= op.active.hp) {
          if (knockOut(me, op, op.active)) return me === A ? 1 : 0;
        }
        if (me.active && me.active.damage >= me.active.hp) {
          if (knockOut(op, me, me.active)) return op === A ? 1 : 0;
        }
      }
    } else if (me.active && me.active.para) {
      me.active.para = false; // マヒは自分の番が終わると回復
    }

    // ポケモンチェック (どく / ねむり判定)
    for (const [pl, opp] of [[A, B], [B, A]]) {
      if (pl.active?.poison) {
        pl.active.damage += 10;
        if (pl.active.damage >= pl.active.hp && knockOut(opp, pl, pl.active)) return opp === A ? 1 : 0;
      }
      if (pl.active?.sleep && rng() < 0.5) pl.active.sleep = false;
    }
  }
  return 0.5;
}

function simulateMatch(simDeckA, simDeckB, games, seed = 42) {
  const rng = mulberry32(seed);
  let winA = 0;
  for (let i = 0; i < games; i++) {
    if (i % 2 === 0) winA += simulateGame(simDeckA, simDeckB, rng);
    else winA += 1 - simulateGame(simDeckB, simDeckA, rng);
  }
  return winA / games;
}
