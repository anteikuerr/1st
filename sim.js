/* ポケポケ簡易対戦シミュレータ v3
 * デッキの強さをモンテカルロ対戦で見積もる。基本ルールをモデル化:
 *  - 3ポイント先取 / ex=2pt / メガex=3pt
 *  - 初手5枚 (たね保証) / ベンチ3匹 / 先攻の最初の番はエネルギーなし
 *  - 出した番と最初の番は進化できない / ふしぎなアメ
 *  - 弱点+20 / タイプ指定コスト
 * v2: ワザの付帯効果 (コイン/狙撃/自傷/回復/加速/どく・ねむり・マヒ/軽減/可変ダメージ)
 * v3: 特性 (軽減/HP増/打点強化/エネ加速/設置ダメージ/毎ターン回復・狙撃)、
 *     やけど・こんらん、ワザロック、相手エネ破壊、味方エネ加速、
 *     条件付き追加ダメージ、全体攻撃、連続攻撃 (メガガルーラex)
 * 未対応: docs/simulation-notes.md の未対応リスト参照
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

// ワザの効果テキスト(英語)を解析して構造化する
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
  else if ((m = text.match(/This attack does (\d+) damage to each of your opponent'?s Pokémon\./i))) fx.hitAll = +m[1];
  else if ((m = text.match(/This attack does (\d+) damage to 1 of your opponent's Pokémon/i))) fx.snipeAny = +m[1];
  if ((m = text.match(/Heal (\d+) damage from this Pokémon/i))) fx.heal = +m[1];
  if (/Active Pokémon is now Poisoned/i.test(text)) fx.poison = true;
  if (/Active Pokémon is now Asleep/i.test(text)) fx.sleep = true;
  if (/Active Pokémon is now Burned/i.test(text)) fx.burn = true;
  if (/Active Pokémon is now Confused/i.test(text)) fx.confuse = true;
  if (/Active Pokémon is now Paralyzed/i.test(text)) {
    if (/If heads/i.test(text)) fx.paralyzeFlip = true;
    else fx.paralyze = true;
  }
  if ((m = text.match(/Discard (a|\d+) \{\w\} Energy from this Pokémon/i))) fx.discardSelf = m[1] === "a" ? 1 : +m[1];
  if (/Discard all(?: \{\w\}| Water| Fire)? Energy from this Pokémon/i.test(text)) fx.discardSelf = 99;
  if ((m = text.match(/Take a \{(\w)\} Energy from your Energy Zone and attach it to this Pokémon/i))) {
    fx.accelSelf = SIM_ENERGY_LETTER[m[1]] || "Colorless";
  }
  if ((m = text.match(/Take (a|\d+) \{(\w)\} Energy from your Energy Zone and attach (?:it|them) to (?:1 of your Benched|your Benched)/i))) {
    fx.accelBench = { n: m[1] === "a" ? 1 : +m[1], type: SIM_ENERGY_LETTER[m[2]] || "Colorless" };
  }
  if ((m = text.match(/During your opponent's next turn, this Pokémon takes [−–-](\d+) damage from attacks/i))) fx.shield = +m[1];
  if ((m = text.match(/does (\d+) more damage for each Energy attached to your opponent's Active Pokémon/i))) fx.perOppEnergy = +m[1];
  if ((m = text.match(/does (\d+) more damage for each (?:\{(\w)\} )?Energy attached to this Pokémon/i))) {
    fx.perSelfEnergy = { per: +m[1], type: m[2] ? SIM_ENERGY_LETTER[m[2]] : null };
  }
  if ((m = text.match(/This attack does (\d+)( more)? damage for each of your Benched/i))) {
    fx.perMyBench = { per: +m[1], more: !!m[2] };
  }
  // ワザロック (このワザを受けたポケモンは次の番ワザが使えない)
  if (/the Defending Pokémon can'?t attack/i.test(text)) fx.lockAttack = true;
  // 相手のエネルギー破壊
  if ((m = text.match(/[Dd]iscard (a|\d+) random Energy from your opponent'?s Active Pokémon/i))) {
    fx.oppDiscard = m[1] === "a" ? 1 : +m[1];
    if (/Flip a coin\. If heads,[^.]*discard/i.test(text)) fx.oppDiscardFlip = true;
  } else if (/[Dd]iscard an? \{\w\} Energy from your opponent'?s Active Pokémon/i.test(text)) {
    fx.oppDiscard = 1;
  }
  // 条件付き追加ダメージ
  if ((m = text.match(/If your opponent'?s Active Pokémon is a Pokémon \{?ex\}?, this attack does (\d+) more damage/i))) fx.ifOppEx = +m[1];
  if ((m = text.match(/If your opponent'?s Active Pokémon has damage on it, this attack does (\d+) more damage/i))) fx.ifOppDamaged = +m[1];
  if ((m = text.match(/If your opponent'?s Active Pokémon is a Basic Pokémon, this attack does (\d+) more damage/i))) fx.ifOppBasic = +m[1];
  if ((m = text.match(/If your opponent'?s Active Pokémon is (?:Poisoned|affected by a Special Condition), this attack does (\d+) more damage/i))) fx.ifOppStatus = +m[1];
  if ((m = text.match(/If this Pokémon has damage on it, this attack does (\d+) more damage/i))) fx.ifSelfDamaged = +m[1];
  if ((m = text.match(/If this Pokémon has no damage on it, this attack does (\d+) more damage/i))) fx.ifSelfClean = +m[1];
  // 連続攻撃 (メガガルーラex)
  if ((m = text.match(/This attack is used twice in a row\. The second attack does (\d+) damage/i))) fx.doubleSecond = +m[1];
  return Object.keys(fx).length ? fx : null;
}

// 特性の効果テキストを解析する
function parseAbilityFx(text) {
  if (!text) return null;
  const fx = {};
  let m;
  if ((m = text.match(/This Pokémon takes [−–-](\d+) damage from attacks/i))) fx.reduce = +m[1];
  if ((m = text.match(/gets \+(\d+) HP/i))) fx.hpPlus = +m[1];
  if ((m = text.match(/Attacks used by your (?:\{(\w)\} )?Pokémon(?: and \{\w\} Pokémon)? do \+(\d+) damage to your opponent'?s Active Pokémon/i))) {
    fx.teamBoost = { type: m[1] ? SIM_ENERGY_LETTER[m[1]] : null, amount: +m[2] };
  }
  if ((m = text.match(/Whenever you attach an? \{(\w)\} Energy from your Energy Zone to this Pokémon, do (\d+) damage to your opponent'?s Active Pokémon/i))) {
    fx.onAttach = { type: SIM_ENERGY_LETTER[m[1]] || null, dmg: +m[2] };
  }
  if ((m = text.match(/Once during your turn, you may take (?:a|an|1|(\d+)) \{(\w)\} Energy from your Energy Zone and attach it to (.+?)\./i))) {
    const target = m[3];
    fx.accel = {
      n: +(m[1] || 1),
      type: SIM_ENERGY_LETTER[m[2]] || "Colorless",
      to: /this Pokémon/i.test(target) ? "self"
        : /Active Spot/i.test(target) ? "active"
        : "best",
    };
  }
  if ((m = text.match(/Once during your turn, you may heal (\d+) damage from your Active Pokémon/i))) fx.turnHealActive = +m[1];
  else if ((m = text.match(/Once during your turn, you may heal (\d+) damage/i))) fx.turnHeal = +m[1];
  if ((m = text.match(/Once during your turn, [^.]*you may do (\d+) damage to your opponent'?s Active Pokémon/i))) fx.turnSnipe = +m[1];
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
  if (fx.perSelfEnergy) ev += fx.perSelfEnergy.per * 3;
  if (fx.snipeAny) ev = Math.max(ev, fx.snipeAny * 0.9);
  if (fx.hitAll) ev = Math.max(ev, fx.hitAll * 3);
  if (fx.benchAll) ev += fx.benchAll;
  if (fx.benchSnipe) ev += fx.benchSnipe * 0.5;
  if (fx.selfDmg) ev -= fx.selfDmg * 0.3;
  if (fx.heal) ev += fx.heal * 0.4;
  if (fx.poison) ev += 15;
  if (fx.burn) ev += 15;
  if (fx.sleep || fx.paralyze) ev += 20;
  if (fx.confuse) ev += 12;
  if (fx.paralyzeFlip) ev += 10;
  if (fx.lockAttack) ev += 20;
  if (fx.oppDiscard) ev += (fx.oppDiscardFlip ? 8 : 15) * Math.min(fx.oppDiscard, 2);
  if (fx.discardSelf) ev -= fx.discardSelf === 99 ? 30 : fx.discardSelf * 10;
  if (fx.accelSelf) ev += 15;
  if (fx.accelBench) ev += 10;
  if (fx.shield) ev += fx.shield * 0.5;
  if (fx.ifOppEx) ev += fx.ifOppEx * 0.4;
  if (fx.ifOppDamaged) ev += fx.ifOppDamaged * 0.5;
  if (fx.ifOppBasic) ev += fx.ifOppBasic * 0.4;
  if (fx.ifOppStatus) ev += fx.ifOppStatus * 0.3;
  if (fx.ifSelfDamaged) ev += fx.ifSelfDamaged * 0.5;
  if (fx.ifSelfClean) ev += fx.ifSelfClean * 0.4;
  if (fx.doubleSecond) ev += fx.doubleSecond;
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
      let abFx = null;
      for (const ab of d.ab || []) {
        const f = parseAbilityFx(ab.e);
        if (f) abFx = { ...(abFx || {}), ...f };
      }
      cards.push({
        id,
        name: card.name,
        pokemon: isPokemon,
        basic: isPokemon && (d.s === "Basic" || d.s === "たね"),
        stage2: isPokemon && /2|Stage2|Stage 2/.test(d.s || ""),
        evolvesFrom: d.dv ? (typeof jaCardName === "function" ? jaCardName(d.dv) : d.dv) : null,
        hp: (d.h || 0) + (abFx?.hpPlus || 0),
        ex: /ex$/.test(card.name),
        mega: /ex$/.test(card.name) && (/^メガ/.test(card.name) || /^Mega /.test(card.enName || card.name)),
        rc: d.rc || 0,
        weakness: (d.w || [])[0]?.t || null,
        types: d.t || [],
        attacks,
        abFx,
        trainer: !isPokemon ? (card.enName || card.name) : null,
      });
    }
  }
  return { cards, energies: energies.length ? energies : ["Colorless"] };
}

function simulateGame(simDeckA, simDeckB, rng, stats) {
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
    return { deck, hand, energies: simDeck.energies, active: null, bench: [], points: 0, turn: 0, candy: 0, etrash: [] };
  };

  const inst = (c, turn) => ({
    ...c, energy: [], damage: 0, playedTurn: turn,
    poison: false, burn: false, sleep: false, para: false, confuse: false,
    lockAttack: false, shieldUntil: -1, shieldValue: 0,
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

  const pointsFor = (mon) => (mon.mega ? 3 : mon.ex ? 2 : 1);
  const knockOut = (me, op, mon) => {
    if (mon === op.active) {
      me.points += pointsFor(mon);
      op.active = null;
      if (me.points >= 3 || !op.bench.length) return true;
      op.bench.sort((x, y) => attackerValue(y) - attackerValue(x));
      op.active = op.bench.shift();
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

  // ダメージ軽減 (特性の常時軽減 + ワザのシールド)
  const applyReduction = (def, dmg, turnNo) => {
    let out = dmg;
    if (def.abFx?.reduce) out -= def.abFx.reduce;
    if (def.shieldUntil >= turnNo) out -= def.shieldValue;
    return Math.max(0, out);
  };

  // エネルギーゾーンからmonにエネルギーをつける (特性の設置ダメージ発動込み)
  const attachEnergy = (me, op, mon, type, turnNo) => {
    mon.energy.push(type);
    const oa = mon.abFx?.onAttach;
    if (oa && (!oa.type || oa.type === type) && op.active) {
      op.active.damage += oa.dmg;
      if (op.active.damage >= op.active.hp) return knockOut(me, op, op.active);
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
      } else if (t === "Sabrina" || t === "ナツメ") {
        // 相手のバトルポケモンをベンチへ (新しいバトルポケモンは相手が選ぶ)
        // 育ったアタッカーを一時的にベンチへ下げさせるテンポ妨害
        if (op.active && op.active.energy.length >= 2 && op.bench.length) {
          op.bench.sort((x, y) => attackerValue(y) - attackerValue(x));
          const incoming = op.bench.shift();
          const outgoing = op.active;
          outgoing.poison = outgoing.burn = outgoing.sleep = outgoing.para = outgoing.confuse = false;
          op.active = incoming;
          op.bench.push(outgoing);
          me.hand.splice(i, 1);
        }
      } else if (t === "Giovanni" || t === "サカキ") {
        // この番のダメージ+10 (きぜつ圏に入るときだけ使う)
        if (me.active && op.active) {
          const atk = bestUsable(me.active);
          const gap = op.active.hp - op.active.damage;
          if (atk && atk.ev < gap && atk.ev + 10 >= gap) {
            me.plusDmg = (me.plusDmg || 0) + 10;
            me.hand.splice(i, 1);
          }
        }
      } else if (t === "Red Card" || t === "レッドカード") {
        // 相手の手札を山札に戻して3枚引かせる (手札が多いときに使う)
        if (op.hand.length > 4) {
          op.deck.push(...op.hand.splice(0));
          op.deck = shuffle(op.deck);
          op.hand.push(...op.deck.splice(0, 3));
          me.hand.splice(i, 1);
        }
      } else if (t === "Giant Cape" || t === "おおきなマント") {
        // HP+20のどうぐ (1体1枚)
        const target = board(me).find((m) => !m.cape);
        if (target) {
          target.cape = true;
          target.hp += 20;
          me.hand.splice(i, 1);
        }
      } else if (t === "Volkner" || t === "デンジ") {
        // トラッシュの雷エネ2個をエレキブル/レントラーへ
        const tgt = board(me).find((m) =>
          ["Electivire", "エレキブル", "Luxray", "レントラー"].includes(m.name));
        if (tgt && me.etrash.includes("Lightning")) {
          for (let k = 0; k < 2; k++) {
            const j = me.etrash.indexOf("Lightning");
            if (j < 0) break;
            me.etrash.splice(j, 1);
            tgt.energy.push("Lightning");
          }
          me.hand.splice(i, 1);
        }
      } else if (t === "Kiawe" || t === "カキ") {
        // アローラガラガラ/バクガメスに炎エネ2個 (この番はワザが使えない)
        const tgt = board(me).find((m) =>
          ["Alolan Marowak", "アローラガラガラ", "Turtonator", "バクガメス"].includes(m.name));
        if (tgt && !bestUsable(tgt) && me.turn <= 3) {
          tgt.energy.push("Fire", "Fire");
          me.noAttack = true;
          me.hand.splice(i, 1);
        }
      } else if (t === "Fantina" || t === "メリッサ") {
        // フワライド/ムウマージそれぞれに超エネ1個
        const tgts = board(me).filter((m) =>
          ["Drifblim", "フワライド", "Mismagius", "ムウマージ"].includes(m.name));
        if (tgts.length) {
          for (const tgt of tgts) tgt.energy.push("Psychic");
          me.hand.splice(i, 1);
        }
      } else if (t === "Brock" || t === "タケシ") {
        // ゴローニャ/イワークに闘エネ1個
        const tgt = board(me).find((m) =>
          ["Golem", "ゴローニャ", "Onix", "イワーク"].includes(m.name));
        if (tgt) {
          tgt.energy.push("Fighting");
          me.hand.splice(i, 1);
        }
      } else if (t === "Electric Generator" || t === "エレキジェネレーター") {
        // コインオモテならベンチの雷ポケモンに雷エネ1個
        const tgt = me.bench
          .filter((m) => (m.types || []).includes("Lightning"))
          .sort((x, y) => attackerValue(y) - attackerValue(x))[0];
        if (tgt) {
          if (rng() < 0.5) tgt.energy.push("Lightning");
          me.hand.splice(i, 1);
        }
      } else if (t === "Flame Patch" || t === "ほのおのパッチ") {
        // トラッシュの炎エネ1個をバトル場の炎ポケモンへ
        const j = me.etrash.indexOf("Fire");
        if (j >= 0 && me.active && (me.active.types || []).includes("Fire")) {
          me.etrash.splice(j, 1);
          me.active.energy.push("Fire");
          me.hand.splice(i, 1);
        }
      } else if (t === "X Speed" || t === "スピーダー" || t === "Leaf" || t === "リーフ") {
        // にげる補助: ベンチに明確に強いアタッカーがいるとき無償で入れ替え
        if (me.active && me.bench.length) {
          const bestIdx = me.bench.reduce((bi, m, idx, arr) =>
            attackerValue(m) > attackerValue(arr[bi]) ? idx : bi, 0);
          if (attackerValue(me.bench[bestIdx]) > attackerValue(me.active) + 15) {
            const tmp = me.active;
            tmp.poison = tmp.burn = tmp.sleep = tmp.para = tmp.confuse = false;
            me.active = me.bench[bestIdx];
            me.bench[bestIdx] = tmp;
            me.hand.splice(i, 1);
          }
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
          const upgraded = { ...inst(evo, me.turn), energy: spot.energy, damage: spot.damage };
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
      if (target && attachEnergy(me, op, target, type, turnNo)) return me === A ? 1 : 0;
    }

    // 特性 (毎ターン1回系)
    for (const mon of board(me)) {
      const ab = mon.abFx;
      if (!ab) continue;
      if (ab.accel) {
        let target = null;
        if (ab.accel.to === "self") target = mon;
        else if (ab.accel.to === "active") target = me.active;
        else {
          const cands = board(me).sort((x, y) => attackerValue(y) - attackerValue(x));
          target = cands[0];
        }
        if (target) {
          for (let k = 0; k < ab.accel.n; k++) {
            if (attachEnergy(me, op, target, ab.accel.type, turnNo)) return me === A ? 1 : 0;
          }
        }
      }
      if (ab.turnHealActive && me.active) me.active.damage = Math.max(0, me.active.damage - ab.turnHealActive);
      if (ab.turnHeal && me.active) me.active.damage = Math.max(0, me.active.damage - ab.turnHeal);
      if (ab.turnSnipe && op.active) {
        op.active.damage += ab.turnSnipe;
        if (op.active.damage >= op.active.hp && knockOut(me, op, op.active)) return me === A ? 1 : 0;
      }
    }

    // にげる (ルール: にげるコスト分のエネルギーをトラッシュ。ねむり/マヒ中は不可)
    // 攻撃できないバトルポケモンを、攻撃できるベンチと入れ替える。
    // コストを払えない重いポケモンはそのまま前に居座る = にげるコストのテンポ損
    if (me.active && !bestUsable(me.active) && !me.active.sleep && !me.active.para &&
        me.active.energy.length >= me.active.rc) {
      const readyIdx = me.bench.findIndex((m) => bestUsable(m));
      if (readyIdx >= 0 && attackerValue(me.bench[readyIdx]) > attackerValue(me.active)) {
        const tmp = me.active;
        me.etrash.push(...tmp.energy.splice(0, tmp.rc)); // にげるコスト分をトラッシュ
        tmp.poison = tmp.burn = tmp.sleep = tmp.para = tmp.confuse = false;
        me.active = me.bench[readyIdx];
        me.bench[readyIdx] = tmp;
      }
    }

    // 攻撃 (ねむり/マヒ/ワザロック中は不可)
    let attackAllowed = me.active && !me.active.sleep && !me.active.para && !me.active.lockAttack && !me.noAttack;
    // こんらん: コインでウラならワザ失敗
    if (attackAllowed && me.active.confuse && rng() < 0.5) attackAllowed = false;

    if (attackAllowed) {
      const attack = bestUsable(me.active);
      if (attack && op.active) {
        if (stats && me === A && !A.firstAtkTurn) {
          A.firstAtkTurn = me.turn;
          stats.firstAtk.push(me.turn);
        }
        const fx = attack.fx || {};
        const boost = () => {
          // 特性の打点強化 (自分の場全体から集計)
          let b = 0;
          for (const mon of board(me)) {
            const tb = mon.abFx?.teamBoost;
            if (tb && (!tb.type || (me.active.types || []).includes(tb.type))) b += tb.amount;
          }
          return b;
        };

        const resolveHit = (baseDmg) => {
          // 1回分の攻撃解決。勝敗が決まったら 'A' か 'B' を返す
          let dmg = baseDmg;
          if (dmg > 0) {
            dmg += boost();
            if (op.active.weakness && (me.active.types || []).includes(op.active.weakness)) dmg += 20;
            dmg = applyReduction(op.active, dmg, turnNo);
            op.active.damage += dmg;
            if (op.active.damage >= op.active.hp) {
              if (knockOut(me, op, op.active)) return me === A ? "A" : "B";
            }
          }
          return null;
        };

        let dmg = attack.dmg + (me.plusDmg || 0); // サカキ等の打点補正
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
        if (fx.perMyBench) {
          dmg = fx.perMyBench.more ? dmg + fx.perMyBench.per * me.bench.length : fx.perMyBench.per * me.bench.length;
        }
        if (fx.perOppEnergy) dmg += fx.perOppEnergy * op.active.energy.length;
        if (fx.perSelfEnergy) {
          const n = fx.perSelfEnergy.type
            ? me.active.energy.filter((t) => t === fx.perSelfEnergy.type).length
            : me.active.energy.length;
          dmg += fx.perSelfEnergy.per * n;
        }
        // 条件付き追加ダメージ
        if (fx.ifOppEx && op.active.ex) dmg += fx.ifOppEx;
        if (fx.ifOppDamaged && op.active.damage > 0) dmg += fx.ifOppDamaged;
        if (fx.ifOppBasic && op.active.basic) dmg += fx.ifOppBasic;
        if (fx.ifOppStatus && (op.active.poison || op.active.burn || op.active.sleep || op.active.para || op.active.confuse)) dmg += fx.ifOppStatus;
        if (fx.ifSelfDamaged && me.active.damage > 0) dmg += fx.ifSelfDamaged;
        if (fx.ifSelfClean && me.active.damage === 0) dmg += fx.ifSelfClean;

        // 全体攻撃
        if (fx.hitAll) {
          for (const tgt of board(op).slice()) {
            tgt.damage += fx.hitAll;
            if (tgt.damage >= tgt.hp && knockOut(me, op, tgt)) return me === A ? 1 : 0;
          }
          dmg = 0;
        }
        // 狙撃
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

        // 本体ダメージ (+ 連続攻撃の2発目)
        const r1 = resolveHit(dmg);
        if (r1) return r1 === "A" ? 1 : 0;
        if (fx.doubleSecond && op.active) {
          const r2 = resolveHit(fx.doubleSecond);
          if (r2) return r2 === "A" ? 1 : 0;
        }

        // 自分への効果
        if (fx.selfDmg) me.active.damage += fx.selfDmg;
        if (fx.heal) me.active.damage = Math.max(0, me.active.damage - fx.heal);
        if (fx.accelSelf && attachEnergy(me, op, me.active, fx.accelSelf, turnNo)) return me === A ? 1 : 0;
        if (fx.accelBench && me.bench.length) {
          const tgt = me.bench.slice().sort((x, y) => attackerValue(y) - attackerValue(x))[0];
          for (let k = 0; k < fx.accelBench.n; k++) {
            if (attachEnergy(me, op, tgt, fx.accelBench.type, turnNo)) return me === A ? 1 : 0;
          }
        }
        if (fx.discardSelf) {
          me.etrash.push(...me.active.energy.splice(0, fx.discardSelf === 99 ? me.active.energy.length : fx.discardSelf));
        }
        if (fx.shield) {
          me.active.shieldUntil = turnNo + 1;
          me.active.shieldValue = fx.shield;
        }

        // 相手への追加効果
        if (op.active) {
          if (fx.oppDiscard && (!fx.oppDiscardFlip || rng() < 0.5)) {
            for (let k = 0; k < fx.oppDiscard && op.active.energy.length; k++) {
              op.etrash.push(...op.active.energy.splice(Math.floor(rng() * op.active.energy.length), 1));
            }
          }
          if (fx.poison) op.active.poison = true;
          if (fx.burn) op.active.burn = true;
          if (fx.sleep) op.active.sleep = true;
          if (fx.confuse) op.active.confuse = true;
          if (fx.paralyze || (fx.paralyzeFlip && rng() < 0.5)) op.active.para = true;
          if (fx.lockAttack) op.active.lockAttack = true;
        }

        // 反動きぜつ
        if (me.active && me.active.damage >= me.active.hp) {
          if (knockOut(op, me, me.active)) return op === A ? 1 : 0;
        }
      }
    } else if (me.active && me.active.para) {
      me.active.para = false; // マヒは自分の番が終わると回復
    }
    if (me.active) me.active.lockAttack = false; // ワザロックは1ターンで解除
    me.plusDmg = 0; // 打点補正はこの番のみ
    me.noAttack = false; // カキ等の「この番は終わる」も解除

    // ポケモンチェック (どく / やけど / ねむり判定)
    for (const [pl, opp] of [[A, B], [B, A]]) {
      if (pl.active?.poison) {
        pl.active.damage += 10;
        if (pl.active.damage >= pl.active.hp && knockOut(opp, pl, pl.active)) return opp === A ? 1 : 0;
      }
      if (pl.active?.burn) {
        pl.active.damage += 20;
        if (pl.active.damage >= pl.active.hp && knockOut(opp, pl, pl.active)) return opp === A ? 1 : 0;
        if (rng() < 0.5) pl.active.burn = false;
      }
      if (pl.active?.sleep && rng() < 0.5) pl.active.sleep = false;
    }
  }
  return 0.5;
}

function simulateMatch(simDeckA, simDeckB, games, seed = 42, stats = null) {
  const rng = mulberry32(seed);
  let winA = 0;
  for (let i = 0; i < games; i++) {
    if (i % 2 === 0) winA += simulateGame(simDeckA, simDeckB, rng, stats);
    else winA += 1 - simulateGame(simDeckB, simDeckA, rng, stats && null);
  }
  return winA / games;
}
