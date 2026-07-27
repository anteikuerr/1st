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
  // ポケモンのどうぐシナジー (デデンネex/エモンガ: 場のどうぐの数×N / ヒスイドレディア: 装備で+N)
  if ((m = text.match(/This attack does (\d+) damage for each Pokémon Tool attached to all of your Pokémon/i))) {
    fx.perTool = +m[1];
  }
  if ((m = text.match(/If this Pokémon has a Pokémon Tool attached, this attack does (\d+) more damage/i))) {
    fx.ifSelfTool = +m[1];
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
  // 反動: 次の自分の番はこのポケモンが攻撃できない (カイリューex ギガインパクト等)
  if (/During your next turn, this Pokémon can'?t attack/i.test(text)) fx.selfLockNext = true;
  // 余剰エネルギーによる追加ダメージ (「余分に{E}がN個ついていれば+M」)
  if ((m = text.match(/If this Pokémon has at least (\d+) extra \{(\w)\} Energy attached, this attack does (\d+) more damage/i))) {
    fx.extraEnergy = { n: +m[1], type: SIM_ENERGY_LETTER[m[2]] || null, bonus: +m[3] };
  } else if ((m = text.match(/If this Pokémon has at least (\d+) extra Energy attached, this attack does (\d+) more damage/i))) {
    fx.extraEnergy = { n: +m[1], type: null, bonus: +m[2] };
  }
  // 相手のベンチ数に比例した追加ダメージ
  if ((m = text.match(/does (\d+) more damage for each of your opponent'?s Benched Pokémon/i))) fx.perOppBench = +m[1];
  // 攻撃後に自分をベンチと入れ替える (ヒットアンドラン)
  if (/Switch this Pokémon with \d+ of your Benched Pokémon/i.test(text) ||
      /You may switch this Pokémon with 1 of your Benched Pokémon/i.test(text)) fx.selfSwitch = true;
  // コインで全ダメージ無効 (次の相手の番)
  if (/Flip a coin\. If heads, during your opponent'?s next turn, prevent all damage/i.test(text)) fx.coinShield = true;
  // 確定で全ダメージ無効 (コインなし)
  else if (/During your opponent'?s next turn, prevent all damage (?:done to this Pokémon )?(?:from|by) attacks/i.test(text)) fx.fullShield = true;
  // 相手をにげられなくする (次の相手の番、バトルポケモンがにげられない)
  if (/During your opponent'?s next turn, the Defending Pokémon can'?t retreat/i.test(text)) fx.trapOpp = true;
  // ワザでドロー
  if (/(?:^|\. )Draw a card\.?/i.test(text) && !/opponent/i.test(text)) fx.draw = (fx.draw || 0) + 1;
  if ((m = text.match(/Draw (\d+) cards/i))) fx.draw = +m[1];
  // 自分のエネルギーをランダムにトラッシュ (discardSelf 未設定時のみ)
  if (fx.discardSelf === undefined && /Discard a random Energy from this Pokémon/i.test(text)) fx.discardSelf = 1;

  /* --- ここから下は「未解釈のワザ276種」の棚卸しで見つかった穴 ---
   * とくに自分側のデメリットを読み落とすと、そのワザを「打ち得」と誤評価してしまう。
   * デメリットは打点と違って目立たないぶん、実装の優先度が高い。 */

  // 自傷の状態異常 (カビゴン「ねむる」/キテルグマ等 計13枚)。
  // 打点だけ見て強いワザに見えるが、自分がねむり/こんらんになるのは大きな代償
  if (/This Pokémon is now Asleep/i.test(text)) fx.selfSleep = true;
  if (/This Pokémon is now Confused/i.test(text)) fx.selfConfuse = true;

  // 反動で次の番そのワザが使えない (マッシブーンex/ビリジオン等 計11枚)。
  // 既存の selfLockNext は「攻撃できない」表記のみを見ていて、
  // 「can't use <ワザ名>」形式を取りこぼしていた
  if (/During your next turn, this Pokémon can'?t use /i.test(text)) fx.selfLockNext = true;

  // 自分のエネを色指定で複数トラッシュ (ルギアex「Discard a {R}, {W}, and {L} Energy」)
  if (fx.discardSelf === undefined) {
    const multi = text.match(/Discard (?:a |an )?(\{\w\}(?:, ?(?:and )?\{\w\})+) Energy from this Pokémon/i);
    if (multi) fx.discardSelf = (multi[1].match(/\{/g) || []).length;
  }

  // 相手の打点を下げる (スイクン/カラカラ等 計11枚)。自分の耐久が実質上がる
  if ((m = text.match(/During your opponent'?s next turn, attacks used by the Defending Pokémon do [−–-](\d+) damage/i))) {
    fx.weakenOpp = +m[1];
  }

  // 山札からポケモンを手札/ベンチへ (サニーゴ/キャタピー/ミツハニー等 計22枚)。
  // 攻撃しながら盤面を作れるので、実質的なテンポ獲得
  if (/Put (?:a|1) random (?:\{\w\} )?(?:Basic )?Pokémon from your deck into your hand/i.test(text)) fx.searchHand = 1;
  if (/Put (?:a|1) random (?:\{\w\} )?(?:Basic )?Pokémon from your deck onto your Bench/i.test(text)) fx.searchBench = 1;

  // 自分のベンチ全体へのエネ加速 (ホウオウex/マナフィ等)。色は問わず総量で数える
  if ((m = text.match(/Take (?:a|\d+) \{\w\}(?:, ?(?:and )?\{\w\})* Energy from your Energy Zone and attach (?:it|them) to your Benched/i))) {
    fx.accelBenchAny = (text.match(/\{/g) || []).length;
  }
  // コインの数だけ加速 (ファイヤーex)
  if (/Take an amount of \{(\w)\} Energy from your Energy Zone equal to the number of heads/i.test(text)) {
    const t2 = text.match(/Flip (\d+) coins/i);
    fx.accelFlip = { n: t2 ? +t2[1] : 3, type: SIM_ENERGY_LETTER[text.match(/amount of \{(\w)\}/i)[1]] || "Colorless" };
  }

  // 自分に乗っているダメージ分だけ打点が伸びる (レジギガス等)
  if (/This attack does more damage equal to the damage this Pokémon has on it/i.test(text)) fx.plusSelfDamage = true;

  /* --- 第3弾: 提案デッキに実際に入っているのに素点だけで殴っていたワザ --- */
  // 取ったサイドの数だけ打点が伸びる (メガライボルトex)。終盤に爆発する
  if ((m = text.match(/does (\d+) more damage for each point you have gotten/i))) fx.perMyPoint = +m[1];
  // 味方の{X}ポケモンに好きなように3個加速 (メガサーナイトex)
  if ((m = text.match(/Take (\d+) \{(\w)\} Energy from your Energy Zone and attach (?:it|them) to your \{\w\} Pokémon in any way you like/i))) {
    fx.accelSpread = { n: +m[1], type: SIM_ENERGY_LETTER[m[2]] || "Colorless" };
  }
  // 相手のワザをコピーして使う (ミュウex)。相手の主力打点を借りる想定で評価する
  if (/Choose 1 of your opponent'?s Active Pokémon'?s attacks and use it as this attack/i.test(text)) fx.copyAttack = true;
  // 場のエネルギーを両者から1個ずつ落とす (ギャラドスex)
  if (/Discard a random Energy from among the Energy attached to all Pokémon \(both yours and your opponent'?s\)/i.test(text)) fx.discardAllBoth = true;
  // 相手の手札からサポートを抜く (メガアブソルex)
  if (/Your opponent reveals their hand\. Choose a Supporter card you find there and discard it/i.test(text)) fx.stripSupporter = true;
  // 自分に乗っているダメージと同じ打点 (ゴマゾウ)。plusSelfDamage とは別物(置き換え型)
  if (/This attack does damage to your opponent'?s Active Pokémon equal to the damage this Pokémon has on it/i.test(text)) fx.dmgEqualsSelf = true;
  // バトル場に居る限り打点が累積する (メガクチートex)
  if ((m = text.match(/Until this Pokémon leaves the Active Spot, this Pokémon'?s .+ attack does \+(\d+) damage/i))) fx.stackWhileActive = +m[1];
  // コインで相手の手札を1枚山札へ (ゴース)
  if (/Flip a coin\. If heads, your opponent reveals a random card from their hand and shuffles it into their deck/i.test(text)) fx.bounceHandFlip = true;

  /* --- 第2弾: 収録枚数の多い未解釈ワザ --- */

  // 自分に複数個まとめて加速 (リザードンex「Take 3 {R} Energy ... to this Pokémon」)。
  // 既存の accelSelf は「a」(単数) しか見ておらず、一番大きい加速を取りこぼしていた
  if (!fx.accelSelf && (m = text.match(/Take (\d+) \{(\w)\} Energy from your Energy Zone and attach (?:it|them) to this Pokémon/i))) {
    fx.accelSelf = SIM_ENERGY_LETTER[m[2]] || "Colorless";
    fx.accelSelfN = +m[1];
  }
  // ベンチの複数体へ加速 (マナフィ「Choose 2 of your Benched Pokémon. For each ...」)
  if ((m = text.match(/Choose (\d+) of your Benched Pokémon\. For each of those Pokémon, take a \{(\w)\} Energy/i))) {
    fx.accelBench = { n: +m[1], type: SIM_ENERGY_LETTER[m[2]] || "Colorless", each: true };
  }
  // ついているエネルギーの数だけコインを投げ、表の数×N (セレビィex)
  if ((m = text.match(/Flip a coin for each Energy attached to this Pokémon\. This attack does (\d+) damage for each heads/i))) {
    fx.coinPerEnergy = +m[1];
  }
  // ランダムな相手ポケモンにダメージ (ウミディグダ/ウミトリオex/メガデンリュウex)
  if ((m = text.match(/1 of your opponent'?s (?:Benched )?Pokémon is chosen at random (\d+) times?\. For each time a Pokémon was chosen, (?:also )?do (\d+) damage/i))) {
    fx.randomHit = { times: +m[1], dmg: +m[2] };
  } else if ((m = text.match(/1 of your opponent'?s Pokémon is chosen at random\. Do (\d+) damage to it/i))) {
    fx.randomHit = { times: 1, dmg: +m[1] };
  }
  // 相手の場のエネルギー総数に比例 (エーフィ)
  if ((m = text.match(/does (\d+) damage for each Energy attached to all of your opponent'?s Pokémon/i))) fx.perAllOppEnergy = +m[1];
  // 両者のベンチ数に比例 (スイクンex)
  if ((m = text.match(/does (\d+) damage for each Benched Pokémon \(both yours and your opponent'?s\)/i))) fx.perBothBench = +m[1];
  // 相手のにげるコストに比例 (エルフーンex)
  if ((m = text.match(/does (\d+) more damage for each Energy in your opponent'?s Active Pokémon'?s Retreat Cost/i))) fx.perOppRetreat = +m[1];
  // 相手が特性持ちなら追加 (マギアナ)
  if ((m = text.match(/If your opponent'?s Active Pokémon has an Ability, this attack does (\d+) more damage/i))) fx.ifOppAbility = +m[1];
  // この番に進化していれば追加 (サンダース)
  if ((m = text.match(/If this Pokémon evolved during this turn, this attack does (\d+) more damage/i))) fx.ifEvolvedNow = +m[1];
  // 前の番に自分のポケモンが倒されていれば追加 (マーシャドー等 10枚)
  if ((m = text.match(/If any of your Pokémon were Knocked Out by damage from an attack during your opponent'?s last turn, this attack does (\d+) more damage/i))) fx.ifAllyKod = +m[1];
  // ワザで相手を引きずり出す/下げる (オトスパス)
  if (/Switch out your opponent'?s Active Pokémon to the Bench/i.test(text)) fx.gustAttack = true;
  // 手札を1枚捨てるコスト。払えないとワザ自体が不発 (ヤミラミ)
  if (/Discard a card from your hand\. If you can'?t, this attack does nothing/i.test(text)) fx.handCost = 1;
  // 相手の行動を縛る (クワガノン=グッズ / コダック=サポート / ジュペッタ=エネルギー)
  if (/During your opponent'?s next turn, they can'?t play any Item cards/i.test(text)) fx.lockItemNext = true;
  if (/Your opponent can'?t use any Supporter cards from their hand during their next turn/i.test(text)) fx.lockSupporterNext = true;
  if (/they can'?t take any Energy from their Energy Zone to attach/i.test(text)) fx.lockEnergyNext = true;
  // 相手のワザのコストを重くする (ポリゴンZ)
  if ((m = text.match(/During your opponent'?s next turn, attacks used by the Defending Pokémon cost (\d+) Colorless more/i))) fx.costUpNext = +m[1];
  // 次の相手の番に殴られたら反撃 (アローラサンドパン)
  if ((m = text.match(/During your opponent'?s next turn, if this Pokémon is damaged by an attack, do (\d+) damage to the Attacking Pokémon/i))) fx.counterNext = +m[1];
  // 次の自分の番、このワザの打点が上がる (モトトカゲ/ケケンカニex)
  if ((m = text.match(/During your next turn, this Pokémon'?s .+ attack does \+(\d+) damage/i))) fx.rampNext = +m[1];
  // 自分の山札から進化先を引っ張って自己進化 (コイキング)
  if (/Put a random card from your deck that evolves from this Pokémon onto this Pokémon to evolve it/i.test(text)) fx.selfEvolve = true;

  // 条件付き追加打点で、盤面から判定できるもの
  if ((m = text.match(/If you played a Supporter card from your hand during this turn, this attack does (\d+) more damage/i))) fx.ifSupporterPlayed = +m[1];
  if ((m = text.match(/If this Pokémon moved from your Bench to the Active Spot this turn, this attack does (\d+) more damage/i))) fx.ifJustMoved = +m[1];

  return Object.keys(fx).length ? fx : null;
}

// 特性の効果テキストを解析する
function parseAbilityFx(text) {
  if (!text) return null;
  const fx = {};
  let m;
  // 進化時誘発のワザ文は末尾で onEvolve として拾う。汎用の「毎ターン加速/回復/狙撃」
  // 正規表現が同じ文を二重に拾わないよう、進化時誘発かどうかを先に判定しておく
  const isOnEvolve = /when you play this Pokémon from your hand to evolve/i.test(text);
  if ((m = text.match(/This Pokémon takes [−–-](\d+) damage from attacks/i))) fx.reduce = +m[1];
  // コイン依存の軽減 (「ダメージを受けたらコインを投げ、オモテなら−N」)
  if ((m = text.match(/If any damage is done to this Pokémon by attacks, flip a coin\. If heads, this Pokémon takes [−–-](\d+) damage from that attack/i))) fx.reduceFlip = +m[1];
  if ((m = text.match(/gets \+(\d+) HP/i))) fx.hpPlus = +m[1];
  if ((m = text.match(/Attacks used by your (?:\{(\w)\} )?Pokémon(?: and \{\w\} Pokémon)? do \+(\d+) damage to your opponent'?s Active Pokémon/i))) {
    fx.teamBoost = { type: m[1] ? SIM_ENERGY_LETTER[m[1]] : null, amount: +m[2] };
  }
  if ((m = text.match(/Whenever you attach an? \{(\w)\} Energy from your Energy Zone to this Pokémon, do (\d+) damage to your opponent'?s Active Pokémon/i))) {
    fx.onAttach = { type: SIM_ENERGY_LETTER[m[1]] || null, dmg: +m[2] };
  }
  // 「自分の番に1回,(このポケモンがバトル場にいるなら,)〜してよい」の任意節を許容。
  // 進化時誘発(onEvolve)の文はここでは拾わない(二重加速を防ぐ)
  if (!isOnEvolve && (m = text.match(/Once during your turn,[^.]*?you may take (?:a|an|1|(\d+)) \{(\w)\} Energy from your Energy Zone and attach it to (.+?)\./i))) {
    const target = m[3];
    fx.accel = {
      n: +(m[1] || 1),
      type: SIM_ENERGY_LETTER[m[2]] || "Colorless",
      to: /this Pokémon/i.test(target) ? "self"
        : /Active Spot/i.test(target) ? "active"
        : "best",
    };
  }
  if (!isOnEvolve && (m = text.match(/Once during your turn,[^.]*?you may heal (\d+) damage from your Active Pokémon/i))) fx.turnHealActive = +m[1];
  else if (!isOnEvolve && (m = text.match(/Once during your turn,[^.]*?you may heal (\d+) damage/i))) fx.turnHeal = +m[1];
  if (!isOnEvolve && (m = text.match(/Once during your turn, [^.]*you may do (\d+) damage to your opponent'?s Active Pokémon/i))) fx.turnSnipe = +m[1];
  // 自分の番に1回、相手のポケモン1匹に固定ダメージ (ゲッコウガ「みずしゅりけん」等)
  else if (!isOnEvolve && (m = text.match(/Once during your turn,[^.]*?you may do (\d+) damage to 1 of your opponent'?s Pokémon/i))) fx.turnSnipe = +m[1];
  // 反撃特性: バトル場でワザのダメージを受けたとき、ワザを使ったポケモンへ反撃
  if ((m = text.match(/is damaged by an attack from your opponent'?s Pokémon, do (\d+) damage to the Attacking Pokémon/i))) fx.counter = +m[1];
  if (/is damaged by an attack from your opponent'?s Pokémon, the Attacking Pokémon is now Poisoned/i.test(text)) fx.counterPoison = true;
  // ポケモンチェック時の受動ダメージ/回復 (バトル場にいるとき)
  if ((m = text.match(/During Pokémon Checkup, if this Pokémon is in the Active Spot, do (\d+) damage to each of your opponent'?s Pokémon/i))) fx.checkupDmg = { amount: +m[1], all: true };
  else if ((m = text.match(/During Pokémon Checkup, if this Pokémon is in the Active Spot, do (\d+) damage to your opponent'?s Active/i))) fx.checkupDmg = { amount: +m[1], all: false };
  if ((m = text.match(/During Pokémon Checkup, heal (\d+) damage from each of your Pokémon/i))) fx.checkupHealAll = +m[1];
  // きぜつ時: ワザを使ったポケモンへ反動 / コインで相手のポイント獲得を拒否
  if ((m = text.match(/is Knocked Out by damage from an attack from your opponent'?s Pokémon,[^.]*?do (\d+) damage to the Attacking Pokémon/i))) fx.onKoAttacker = +m[1];
  if (/When this Pokémon is Knocked Out, flip a coin\. If heads, your opponent can'?t get any points/i.test(text)) fx.denyPointFlip = true;
  // 相手をベンチへ下げる妨害 (自分の番に1回)
  if (/Once during your turn,[^.]*?you may switch (?:out your opponent'?s Active Pokémon|in 1 of your opponent'?s Benched)/i.test(text)) fx.turnDisrupt = true;
  // バトル場にいる限りの常時効果
  if (/As long as this Pokémon is in the Active Spot, your opponent can'?t use any Supporter cards/i.test(text)) fx.lockSupporter = true;
  if (/As long as this Pokémon is in the Active Spot, your opponent can'?t play any Stadium cards/i.test(text)) fx.lockStadium = true;
  if ((m = text.match(/As long as this Pokémon is in the Active Spot, attacks used by your opponent'?s Active Pokémon do [−–-](\d+) damage/i))) fx.reduce = Math.max(fx.reduce || 0, +m[1]);
  // エネルギーがついていればにげるコスト0 (レビテト等)
  if (/If this Pokémon has any Energy attached, (?:it|this Pokémon) has no Retreat Cost/i.test(text)) fx.noRetreatIfEnergy = true;
  // 進化時の誘発効果 (ハッピーリボン=2ドロー / イグニッション=エネ加速 等の一貫性エンジン)
  if (/when you play this Pokémon from your hand to evolve/i.test(text)) {
    const ev = {};
    if ((m = text.match(/you may draw (\d+) cards/i))) ev.draw = +m[1];
    if ((m = text.match(/you may heal (\d+) damage/i))) ev.heal = +m[1];
    if ((m = text.match(/take a \{(\w)\} Energy from your Energy Zone and attach it to your Active/i))) ev.accel = SIM_ENERGY_LETTER[m[1]] || "Colorless";
    if ((m = text.match(/you may do (\d+) damage to your opponent'?s Active/i))) ev.snipe = +m[1];
    if (/discard a random Energy from your opponent'?s Active/i.test(text)) ev.oppDiscard = 1;
    if (Object.keys(ev).length) fx.onEvolve = ev;
  }

  /* --- 棚卸しで見つかった未対応の特性 (収録枚数の多い順) --- */
  // 場に居るだけで毎ターン引く (エンテイex系。13枚)。デッキの回り方が根本的に変わる
  if (/At the end of your turn, if this Pokémon is in the Active Spot, draw a card/i.test(text)) fx.endTurnDraw = 1;
  // 状態異常を受けない (アルセウスex系。7枚)
  if (/can'?t be affected by any Special Conditions/i.test(text)) fx.statusImmune = true;
  // ベンチ→バトル場へ自力で入れ替え (ソルガレオex/ゲッコウガex系。11枚)。
  // にげるコストを踏み倒せるので、実質フリーリトリートとして扱う
  if (/Once during your turn, if this Pokémon is on your Bench, you may switch it with your Active Pokémon/i.test(text) ||
      /Once during your turn, you may switch your Active \{?\w*\}? ?Pokémon with 1 of your Benched/i.test(text)) fx.freeSwitch = true;
  // 自分の番に何度でもエネ移動 (シャワーズ系)。ベンチに貯めて前に集められる
  if (/As often as you like during your turn, you may move a \{(\w)\} Energy from 1 of your Benched/i.test(text)) fx.energyShuttle = true;
  // エネルギーが2個分として働く (ジャローダ)。重いワザが一気に軽くなる
  if (/Each \{(\w)\} Energy attached to your \{\w\} Pokémon provides 2 \{\w\} Energy/i.test(text)) fx.energyDouble = true;
  // 最初の1発を無効化 (ミミッキュex)
  if (/When this Pokémon is first damaged by an attack after coming into play, prevent that damage/i.test(text)) fx.firstHitShield = true;
  // exのワザを受け付けない (オドリドリ)
  if (/Prevent all damage done to this Pokémon by attacks from your opponent'?s Pokémon ex/i.test(text)) fx.exImmune = true;
  // 相手の進化を止める (プテラex)
  if (/Your opponent can'?t play any Pokémon from their hand to evolve/i.test(text)) fx.lockEvolve = true;
  // エネルギーをまとめて前に移す (ルナアーラex 7枚)。重いエースを一気に起動できる
  if (/Once during your turn, you may move all \{(\w)\} Energy from 1 of your Benched/i.test(text)) fx.energyBulkMove = true;
  // トラッシュから貼り直しつつ削る (ブースターex 5枚)
  if ((m = text.match(/Once during your turn, you may attach a \{(\w)\} Energy from your discard pile to this Pokémon\. If you do, do (\d+) damage/i))) {
    fx.recycleAccel = { type: SIM_ENERGY_LETTER[m[1]] || "Colorless", dmg: +m[2] };
  }
  // ベンチに居るだけで味方のにげるコストを軽くする (シェイミ/ワタッコ/シャリタツ 10枚)
  if (/your Active (?:Basic )?Poke?[ée]?mon'?s Retreat Cost is 1 less|Your Active Pokémon has no Retreat Cost|Your Active \w+ has no Retreat Cost/i.test(text)) fx.teamRetreatCut = true;
  // 相手のワザを重くする (ムーランド 3枚)
  if (/attacks used by your opponent'?s Active Pokémon cost (\d+) Colorless more/i.test(text)) fx.oppCostUp = true;
  // 自分の番に1回、コインで相手を状態異常に (スリーパー/マタドガス)
  if (/Once during your turn,[\s\S]*?your opponent'?s Active Pokémon is now Asleep/i.test(text)) fx.turnSleepFlip = true;
  if (/Once during your turn,[^.]*?make your opponent'?s Active Pokémon Poisoned/i.test(text)) fx.turnPoison = true;
  // 手札を切ってドロー (ガブリアス)
  if (/You must discard a card from your hand in order to use this Ability\. Once during your turn, you may draw a card/i.test(text)) fx.turnDrawCost = true;
  // 番の終わりに自己回復 (カビゴンex 4枚)
  if ((m = text.match(/At the end of your turn, if this Pokémon is in the Active Spot, heal (\d+) damage from it/i))) fx.endTurnHeal = +m[1];
  // コインでダメージ無効 (トゲキッス 3枚)
  if (/If any damage is done to this Pokémon by attacks, flip a coin\. If heads, prevent that damage/i.test(text)) fx.coinPrevent = true;
  // 殴られたらエネを得る (ブルンゲル 3枚)
  if ((m = text.match(/is damaged by an attack from your opponent'?s Pokémon, take a \{(\w)\} Energy from your Energy Zone/i))) {
    fx.onHitAccel = SIM_ENERGY_LETTER[m[1]] || "Colorless";
  }
  // 最初の番の終わりに自分へエネ加速 (ゼラオラ)
  if ((m = text.match(/At the end of your first turn, take a \{(\w)\} Energy from your Energy Zone and attach it to this Pokémon/i))) {
    fx.firstTurnAccel = SIM_ENERGY_LETTER[m[1]] || "Colorless";
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
  if (fx.perTool) ev = Math.max(ev, fx.perTool * 2.5); // どうぐ平均2.5個を想定した打点
  if (fx.ifSelfTool) ev += fx.ifSelfTool * 0.6;
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
  if (fx.selfLockNext) ev -= dmg * 0.35;               // 次番殴れない反動は大きく割り引く
  if (fx.extraEnergy) ev += fx.extraEnergy.bonus * 0.5; // 条件を満たす確率ぶん
  if (fx.perOppBench) ev += fx.perOppBench * 2;         // 相手ベンチ2匹想定
  if (fx.selfSwitch) ev += 5;                           // ピボットの小さな価値
  // 棚卸しで追加した効果の期待値。自傷デメリットは打点の"見かけの強さ"を打ち消す
  if (fx.selfSleep) ev -= dmg * 0.4 + 15;   // 自分がねむると次番動けない可能性が高い
  if (fx.selfConfuse) ev -= dmg * 0.25;     // こんらんは攻撃がコイン依存になる
  if (fx.weakenOpp) ev += fx.weakenOpp * 0.6;
  if (fx.searchHand) ev += 12;              // 殴りながら手札を作れる
  if (fx.searchBench) ev += 14;             // 殴りながら盤面を作れる (より強い)
  if (fx.accelBenchAny) ev += fx.accelBenchAny * 10;
  if (fx.accelFlip) ev += fx.accelFlip.n * 0.5 * 12;
  if (fx.plusSelfDamage) ev += 25;          // 削られてから撃つ前提の打点
  if (fx.ifSupporterPlayed) ev += fx.ifSupporterPlayed * 0.7; // ほぼ毎ターン満たせる
  if (fx.ifJustMoved) ev += fx.ifJustMoved * 0.3;
  // 第2弾の期待値
  if (fx.accelSelfN) ev += (fx.accelSelfN - 1) * 14;      // accelSelf の +15 に上乗せ
  if (fx.accelBench?.each) ev += fx.accelBench.n * 10;
  if (fx.coinPerEnergy) ev = Math.max(ev, fx.coinPerEnergy * 1.5); // エネ3個想定の半分が表
  if (fx.randomHit) ev += fx.randomHit.times * fx.randomHit.dmg * 0.5;
  if (fx.perAllOppEnergy) ev += fx.perAllOppEnergy * 3;   // 相手の場に3個想定
  if (fx.perBothBench) ev += fx.perBothBench * 4;         // 両者ベンチ計4想定
  if (fx.perOppRetreat) ev += fx.perOppRetreat * 1.3;
  if (fx.ifOppAbility) ev += fx.ifOppAbility * 0.45;
  if (fx.ifEvolvedNow) ev += fx.ifEvolvedNow * 0.35;
  if (fx.ifAllyKod) ev += fx.ifAllyKod * 0.4;
  if (fx.gustAttack) ev += 18;
  if (fx.handCost) ev -= 8;                               // 手札を1枚失う
  if (fx.lockItemNext) ev += 10;
  if (fx.lockSupporterNext) ev += 14;
  if (fx.lockEnergyNext) ev += 24;                        // 相手の1ターンを実質奪う
  if (fx.costUpNext) ev += fx.costUpNext * 12;
  if (fx.counterNext) ev += fx.counterNext * 0.4;
  if (fx.rampNext) ev += fx.rampNext * 0.5;
  if (fx.selfEvolve) ev += 20;                            // 殴りながら進化 = 大きなテンポ
  // 第3弾
  if (fx.perMyPoint) ev += fx.perMyPoint * 1.2;           // 平均1.2点取っている想定
  if (fx.accelSpread) ev += fx.accelSpread.n * 12;
  if (fx.copyAttack) ev += 45;                            // 相手の主力を借りる
  if (fx.discardAllBoth) ev += 8;                         // 自分も巻き込むので控えめ
  if (fx.stripSupporter) ev += 12;
  if (fx.dmgEqualsSelf) ev += 30;                         // 削られてから撃つ前提
  if (fx.stackWhileActive) ev += fx.stackWhileActive * 0.8;
  if (fx.bounceHandFlip) ev += 5;
  if (fx.coinShield) ev += 12;
  if (fx.fullShield) ev += 22;
  if (fx.trapOpp) ev += 10;
  if (fx.draw) ev += fx.draw * 3;
  return ev;
}

// デッキ(id->枚数)をシミュレーション用の形に前処理する
// ポケモン名の検出用正規表現をカードプール単位でキャッシュする
// (名指しサポートの条件判定に使う。デッキごとに作り直すと重い)
let _simPokeRe = null;
function simPokeNameRe(cardById, details) {
  if (_simPokeRe && _simPokeRe.size === cardById.size) return _simPokeRe.re;
  if (typeof buildPokemonNameRegex !== "function") return null;
  const re = buildPokemonNameRegex([...cardById.values()], details);
  _simPokeRe = { size: cardById.size, re };
  return re;
}

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
        trainerType: !isPokemon ? (d.tt || null) : null,
        ex: /ex$/.test(card.name),
        mega: /ex$/.test(card.name) && (/^メガ/.test(card.name) || /^Mega /.test(card.enName || card.name)),
        rc: d.rc || 0,
        weakness: (d.w || [])[0]?.t || null,
        types: d.t || [],
        attacks,
        abFx,
        trainer: !isPokemon ? (card.enName || card.name) : null,
        // トレーナーの効果を構造化したもの (trainers.js)。名前ごとの個別実装が無い札も
        // 役割ベースで汎用処理できるようにする。未実装=手札で腐る、という偏りをなくす
        tfx: !isPokemon && typeof classifyTrainer === "function"
          ? classifyTrainer(card, d, simPokeNameRe(cardById, details)) : null,
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
    // 特性でエネルギーが2個分として働く (ジャローダ)。重いワザが一気に軽くなるので、
    // 支払い判定の段階で色エネを2倍に数える
    const doubled = mon.abFx?.energyDouble;
    const eff = doubled ? mon.energy.flatMap((t) => [t, t]) : mon.energy;
    // 相手のワザで一時的にコストが重くなっている (ポリゴンZ)。
    // turnNo は同じスコープの let なので、呼ばれる時点では必ず初期化済み
    // 相手のバトル場の特性でコストが重くなっている (ムーランド) 場合も同様
    const extra = ((mon.costUpUntil || -1) >= turnNo ? 1 : 0) + (mon._oppCostUp ? 1 : 0);
    if (eff.length < attack.cost + extra) return false;
    const pool = eff.slice();
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

  // サイドの点数。アイリス等の「倒したらサイドを1枚多く取る」は me.bonusPoint で加算
  const pointsFor = (mon, me) => (mon.mega ? 3 : mon.ex ? 2 : 1) + (me?.bonusPoint || 0);
  const knockOut = (me, op, mon) => {
    const ab = mon.abFx;
    // きぜつ時特性: コインで相手のポイント獲得を拒否 (フェードイントゥダークネス等)
    const denied = ab?.denyPointFlip && rng() < 0.5;
    if (mon === op.active) {
      // バトル場でのきぜつ反動: ワザを使ったポケモン(me.active)にダメージ
      if (ab?.onKoAttacker && me.active) me.active.damage += ab.onKoAttacker;
      if (!denied) me.points += pointsFor(mon, me);
      op.lostThisTurn = true; // マーシャドー系「前の番に倒されていたら+N」の判定用
      op.active = null;
      if (me.points >= 3 || !op.bench.length) return true;
      op.bench.sort((x, y) => attackerValue(y) - attackerValue(x));
      op.active = op.bench.shift();
    } else {
      const i = op.bench.indexOf(mon);
      if (i >= 0) {
        op.bench.splice(i, 1);
        if (!denied) me.points += pointsFor(mon, me);
        op.lostThisTurn = true;
        if (me.points >= 3) return true;
      }
    }
    return false;
  };

  // ダメージ軽減 (特性の常時軽減 + ワザのシールド)
  const applyReduction = (def, dmg, turnNo, attacker) => {
    let out = dmg;
    // 特性: exのワザを一切受けない (オドリドリ)
    if (def.abFx?.exImmune && attacker?.ex) return 0;
    // 特性: 場に出てから最初に受けるダメージを無効 (ミミッキュex)
    if (def.abFx?.firstHitShield && !def.tookFirstHit) { def.tookFirstHit = true; return 0; }
    if (def.abFx?.reduce) out -= def.abFx.reduce;
    if (def.abFx?.reduceFlip && rng() < 0.5) out -= def.abFx.reduceFlip; // ヒスイヌメルゴン等
    if (def.abFx?.coinPrevent && rng() < 0.5) return 0;                   // トゲキッス
    if (def.shieldUntil >= turnNo) out -= def.shieldValue;
    return Math.max(0, out);
  };

  // エネルギーゾーンからmonにエネルギーをつける (特性の設置ダメージ発動込み)
  // 特性で状態異常を受け付けないポケモンには状態異常を乗せない
  const canStatus = (mon) => mon && !mon.abFx?.statusImmune;

  const attachEnergy = (me, op, mon, type, turnNo) => {
    mon.energy.push(type);
    const oa = mon.abFx?.onAttach;
    if (oa && (!oa.type || oa.type === type) && op.active) {
      op.active.damage += oa.dmg;
      if (op.active.damage >= op.active.hp) return knockOut(me, op, op.active);
    }
    return false;
  };

  /* 個別実装のないトレーナーを、trainers.js の分類(c.tfx)から汎用的に処理する。
   * 使えたら手札から取り除いて true を返す。使う価値がない状況なら false (手札に残す)。
   * 目的は「実装済みの札だけが強く見える」偏りを消すこと —— 収録カードの大半は
   * 打点補正/HP増強/回復/加速/ドロー/サーチ/引きずり出し のどれかに収まる。 */
  const genericTrainer = (c, i, me, op, turnNo) => {
    const f = c.tfx;
    const mine = board(me);
    if (!mine.length) return false;
    // 名指し条件: 対象が自分の場にいなければ使えない
    const namedOk = !f.named.length || mine.some((m) => f.named.includes(m.name) || f.named.includes(m.enName));
    const typeOk = (m) => !f.type || (m.types || []).includes(f.type);
    const use = () => { me.hand.splice(i, 1); return true; };

    // --- 打点補正 (この番だけ): 攻撃できる状態で、条件を満たすときだけ切る ---
    if (f.boost && f.boostPerTurn && me.active && namedOk && typeOk(me.active)) {
      const named = !f.named.length || f.named.includes(me.active.name);
      const vsExOk = !f.boostVsEx || op.active?.ex;
      if (named && vsExOk && bestUsable(me.active) && op.active) {
        me.plusDmg = (me.plusDmg || 0) + f.boost;
        return use();
      }
      return false;
    }
    // --- 追加サイド (アイリス等): 名指しが攻撃できるときに使う ---
    if (f.extraPoint && me.active && namedOk && f.named.includes(me.active.name) && bestUsable(me.active)) {
      me.bonusPoint = (me.bonusPoint || 0) + 1;
      return use();
    }
    // --- HP増強どうぐ ---
    if (f.hpUp && c.trainerType === "Tool") {
      const tgt = mine.find((m) => !m.tool && typeOk(m) && (!f.named.length || f.named.includes(m.name)));
      if (tgt) { tgt.tool = c.trainer; tgt.hp += f.hpUp; return use(); }
      return false;
    }
    // --- ダメージ軽減 ---
    if (f.reduce) {
      if (c.trainerType === "Tool") {
        const tgt = mine.find((m) => !m.tool && typeOk(m));
        if (tgt) { tgt.tool = c.trainer; tgt.shieldUntil = turnNo + 1; tgt.shieldValue = f.reduce; return use(); }
        return false;
      }
      // サポート/グッズ: 次の相手の番だけ守る。殴られる直前(=ダメージが乗っている)に使う
      if (me.active && namedOk && typeOk(me.active) && me.active.damage > 0) {
        me.active.shieldUntil = turnNo + 1;
        me.active.shieldValue = Math.max(me.active.shieldValue || 0, f.reduce);
        return use();
      }
      return false;
    }
    // --- 回復 (無駄撃ちしない: 実際に回復できるダメージがあるときだけ) ---
    if (f.heal) {
      const hurt = mine.filter((m) => m.damage > 0 && typeOk(m) && (!f.named.length || f.named.includes(m.name)))
        .sort((x, y) => y.damage - x.damage)[0];
      if (hurt && hurt.damage >= Math.min(f.heal, 20)) {
        hurt.damage = Math.max(0, hurt.damage - f.heal);
        if (c.trainerType === "Tool") hurt.tool = c.trainer;
        return use();
      }
      return false;
    }
    // --- エネ加速 ---
    if (f.roles.includes("accel") && namedOk) {
      const wantType = f.type || me.energies[0];
      const pick = mine.filter((m) => typeOk(m) && (!f.named.length || f.named.includes(m.name)))
        .sort((x, y) => (bestPotential(y) || 0) - (bestPotential(x) || 0))[0];
      if (!pick) return false;
      if (f.accelMove) {
        // ベンチからバトル場へ移すだけ (総量は増えない)
        const from = me.bench.find((m) => m.energy.length);
        if (from && me.active && from !== me.active) {
          me.active.energy.push(from.energy.pop());
          return use();
        }
        return false;
      }
      if (f.accelFromDiscard) {
        const j = me.etrash.indexOf(wantType);
        if (j < 0) return false;
        me.etrash.splice(j, 1);
        pick.energy.push(wantType);
        return use();
      }
      // 番が終わる加速は、対象がまだ殴れない立ち上がりのときだけ価値がある
      if (f.endsTurn && (bestUsable(pick) || me.turn > 3)) return false;
      // エネルギーゾーンから直接。コイン依存はその都度判定する
      let n = f.accelN || 1;
      if (f.coin) { n = 0; while (rng() < 0.5) { n++; if (n > 6) break; } if (!n) return use(); }
      for (let k = 0; k < n; k++) {
        if (attachEnergy(me, op, pick, wantType, turnNo)) return use();
      }
      if (f.endsTurn) me.noAttack = true; // 「この番は終わる」札は攻撃を放棄する
      return use();
    }
    // --- ドロー ---
    if (f.drawN >= 1) {
      if (!me.deck.length) return false;
      me.hand.push(...me.deck.splice(0, Math.min(Math.round(f.drawN), me.deck.length)));
      return use();
    }
    // --- サーチ (カテゴリごとに山札から引っ張る) ---
    if (f.roles.includes("search")) {
      const match = {
        basic: (x) => x.basic && (!f.searchHpMax || x.hp <= f.searchHpMax),
        stage1: (x) => x.pokemon && x.evolvesFrom && !x.stage2,
        stage2: (x) => x.stage2,
        mega: (x) => x.mega,
        tool: (x) => x.trainerType === "Tool",
        stadium: (x) => x.trainerType === "Stadium",
        named: (x) => f.named.includes(x.name),
        typed: (x) => x.pokemon && typeOk(x),
        pokemon: (x) => x.pokemon,
      }[f.searchFor || "pokemon"];
      const idxs = me.deck.map((x, k) => (match(x) ? k : -1)).filter((k) => k >= 0);
      if (!idxs.length) return false;
      me.hand.push(me.deck.splice(idxs[Math.floor(rng() * idxs.length)], 1)[0]);
      return use();
    }
    // --- 引きずり出し (相手のベンチをバトル場へ) ---
    if (f.roles.includes("gust") && op.active && op.bench.length) {
      let pool = op.bench.filter((x) => (!f.gustNeedsDamage || x.damage > 0) && (!f.gustBasicOnly || x.basic));
      if (!pool.length) return false;
      // 自分で選べる札は「倒しやすい/育っている」相手を、選べない札は無条件に入れ替える
      const atkEv = me.active ? (bestUsable(me.active)?.ev || bestPotential(me.active)) : 0;
      pool = pool.sort((x, y) =>
        (y.hp - y.damage <= atkEv ? 1 : 0) - (x.hp - x.damage <= atkEv ? 1 : 0) ||
        attackerValue(y) - attackerValue(x));
      const tgt = f.gustChoose ? pool[0] : pool[Math.floor(rng() * pool.length)];
      const bi = op.bench.indexOf(tgt);
      op.bench.splice(bi, 1);
      const out = op.active;
      out.poison = out.burn = out.sleep = out.para = out.confuse = false;
      op.active = tgt;
      op.bench.push(out);
      return use();
    }
    // --- 進化補助 (山札から直接進化させる。アメ相当は candy で処理済み) ---
    if (f.roles.includes("evoAid") && !f.evoSkip) {
      for (const spot of mine) {
        if (spot.playedTurn >= me.turn || !typeOk(spot)) continue;
        const k = me.deck.findIndex((x) => x.pokemon && x.evolvesFrom === spot.name);
        if (k < 0) continue;
        const evo = me.deck.splice(k, 1)[0];
        const up = { ...inst(evo, me.turn), energy: spot.energy, damage: spot.damage };
        if (spot === me.active) me.active = up;
        else me.bench[me.bench.indexOf(spot)] = up;
        return use();
      }
      return false;
    }
    // --- にげるコスト軽減 ---
    if (f.retreatCut) {
      if (me.active && me.active.rc > 0 && me.active.damage > 0 && me.bench.length) {
        me.retreatCut = Math.max(me.retreatCut || 0, f.retreatCut);
        return use();
      }
      return false;
    }
    // --- 相手のエネルギーを落とす妨害 ---
    if (f.energyAttack && op.active?.energy.length) {
      let n = 1;
      if (f.coin) { n = 0; while (rng() < 0.5) { n++; if (n > 5) break; } if (!n) return use(); }
      for (let k = 0; k < n && op.active.energy.length; k++) {
        op.etrash.push(...op.active.energy.splice(Math.floor(rng() * op.active.energy.length), 1));
      }
      return use();
    }
    return false;
  };

  // スタジアム (場に1枚。新しいものを出すと前のものは消える)
  let stadium = null; // { key, owner }
  const STADIUM_KEY = {
    "Training Area": "Training Area", "トレーニングエリア": "Training Area",
    "Starting Plains": "Starting Plains", "はじまりの平原": "Starting Plains",
    "Peculiar Plaza": "Peculiar Plaza", "ふしぎな広場": "Peculiar Plaza",
    "Mesagoza": "Mesagoza", "テーブルシティ": "Mesagoza",
  };

  let turnNo = 0;
  while (turnNo < 60) {
    turnNo++;
    const me = turnNo % 2 === 1 ? A : B;
    const op = turnNo % 2 === 1 ? B : A;
    me.turn++;
    me.supporterUsed = false; // サポートは1ターン1枚
    me.lostLastTurn = me.lostThisTurn;  // 直前の相手の番で自分のポケモンが倒されたか
    me.lostThisTurn = false;
    /* 相手のバトル場の特性で自分のワザが重くなるか (ムーランド)。
     * canPay は持ち主を知らないので、番の頭に自分の場へ印を付けておく。 */
    const heavy = !!op.active?.abFx?.oppCostUp;
    for (const mon of board(me)) mon._oppCostUp = heavy;

    if (me.deck.length) me.hand.push(me.deck.shift());

    // スタジアム: はじまりの平原 (場のたね全員+20HP) の適用/解除を同期
    for (const pl of [A, B]) {
      for (const mon of board(pl)) {
        const want = stadium?.key === "Starting Plains" && mon.basic;
        if (want && !mon.plains) { mon.hp += 20; mon.plains = true; }
        else if (!want && mon.plains) { mon.hp -= 20; mon.plains = false; }
      }
    }
    // スタジアム: テーブルシティ (毎ターンコインでポケモンサーチ)
    if (stadium?.key === "Mesagoza" && rng() < 0.5) {
      const pi = me.deck.findIndex((x) => x.pokemon);
      if (pi >= 0) me.hand.push(me.deck.splice(pi, 1)[0]);
    }

    // トレーナーズ (簡易効果)
    for (let i = me.hand.length - 1; i >= 0; i--) {
      const c = me.hand[i];
      if (!c.trainer) continue;
      const t = c.trainer;
      if (c.trainerType === "Supporter" && me.supporterUsed) continue;
      // ワザによる封じ (コダック=サポート / クワガノン=グッズ)
      if (c.trainerType === "Supporter" && me.noSupporterTurn === me.turn) continue;
      if (c.trainerType === "Item" && me.noItemTurn === me.turn) continue;
      // 相手のバトルポケモンの特性でサポート/スタジアムを封じられている
      if (c.trainerType === "Supporter" && op.active?.abFx?.lockSupporter) continue;
      if (c.trainerType === "Stadium" && op.active?.abFx?.lockStadium) continue;
      if (t === "Poké Ball" || t === "モンスターボール") {
        const bi = me.deck.findIndex((x) => x.basic);
        if (bi >= 0) me.hand.push(me.deck.splice(bi, 1)[0]);
        me.hand.splice(i, 1);
      } else if (t === "Cyrus" || t === "アカギ") {
        // フィニッシャー: ダメージののった相手ベンチをバトル場に引きずり出す。
        // 自分のワザで倒し切れる相手を優先(この番きぜつを狙う)。倒せなくても
        // 育ちかけの脅威を引きずり出せるが、無駄撃ちを避けるため倒せる時だけ使う
        if (op.active && op.bench.length) {
          const atkEv = bestUsable(me.active)?.ev || bestPotential(me.active);
          const dmgd = op.bench.filter((x) => x.damage > 0);
          const killable = dmgd.filter((x) => x.hp - x.damage <= atkEv)
            .sort((x, y) => attackerValue(y) - attackerValue(x))[0];
          const target = killable || dmgd.sort((x, y) => attackerValue(y) - attackerValue(x))[0];
          if (target) {
            const bi = op.bench.indexOf(target);
            op.bench.splice(bi, 1);
            const outgoing = op.active;
            outgoing.poison = outgoing.burn = outgoing.sleep = outgoing.para = outgoing.confuse = false;
            op.active = target;
            op.bench.push(outgoing);
            me.supporterUsed = true;
            me.hand.splice(i, 1);
          }
        }
      } else if (t === "Copycat" || t === "ものまね娘" || t === "モノマネむすめ") {
        // 相手の手札の枚数ぶんドロー (手札を切って引き直す)。手詰まり時に使う
        if (me.hand.length - 1 <= 3 && me.deck.length) {
          me.hand.splice(i, 1);
          const back = me.hand.splice(0);
          me.deck.push(...back);
          me.deck = shuffle(me.deck);
          me.hand.push(...me.deck.splice(0, Math.min(op.hand.length, me.deck.length)));
          me.supporterUsed = true;
          break;
        }
      } else if (t === "Professor's Research" || t === "博士の研究") {
        me.hand.push(...me.deck.splice(0, 2));
        me.hand.splice(i, 1);
      } else if (t === "Iono" || t === "ナンジャモ") {
        // 手札を山札に戻して同数引き直す (詰まった手札のリフレッシュ)。
        // 手札(このカード除く)が2枚以下=手詰まりのときだけ使う
        if (me.hand.length - 1 <= 2 && me.deck.length) {
          me.hand.splice(i, 1);                 // ナンジャモを使用
          const back = me.hand.splice(0);       // 残り手札を山札へ
          me.deck.push(...back);
          me.deck = shuffle(me.deck);
          me.hand.push(...me.deck.splice(0, back.length));
          me.supporterUsed = true;
          break;                                 // 手札が入れ替わったので再スキャン(次の番)
        }
      } else if (t === "Juliana" || t === "アオイ") {
        // 山札から2進化ポケモンをランダムに手札へ (2進化デッキの安定札)
        const idxs = me.deck.map((x, k) => (x.stage2 ? k : -1)).filter((k) => k >= 0);
        if (idxs.length) {
          me.hand.push(me.deck.splice(idxs[Math.floor(rng() * idxs.length)], 1)[0]);
          me.hand.splice(i, 1);
        }
      } else if (t === "Serena" || t === "セレナ") {
        // 山札からメガシンカポケモンexをランダムに手札へ
        const idxs = me.deck.map((x, k) => (x.mega ? k : -1)).filter((k) => k >= 0);
        if (idxs.length) {
          me.hand.push(me.deck.splice(idxs[Math.floor(rng() * idxs.length)], 1)[0]);
          me.hand.splice(i, 1);
        }
      } else if (t === "Lisia" || t === "ルチア") {
        // 山札からHP50以下のたねポケモンを2枚ランダムに手札へ
        let got = 0;
        for (let k = 0; k < 2; k++) {
          const idxs = me.deck.map((x, j) => (x.basic && x.hp <= 50 ? j : -1)).filter((j) => j >= 0);
          if (!idxs.length) break;
          me.hand.push(me.deck.splice(idxs[Math.floor(rng() * idxs.length)], 1)[0]);
          got++;
        }
        if (got) me.hand.splice(i, 1);
      } else if (t === "Pokémon Communication" || t === "ポケモン通信") {
        // 手札のポケモン1枚を山札のランダムなポケモンと入れ替える (進化先を掘る)。
        // 場に出ているたねの進化先が山札にあり、手札に余剰ポケモンがあるときだけ
        const needEvo = board(me).some((mon) =>
          me.deck.some((x) => x.evolvesFrom === mon.name));
        const spareJ = me.hand.findIndex((x, j) => j !== i && x.pokemon);
        const deckPokeIdxs = me.deck.map((x, k) => (x.pokemon ? k : -1)).filter((k) => k >= 0);
        if (needEvo && spareJ >= 0 && deckPokeIdxs.length) {
          const pulled = me.deck.splice(deckPokeIdxs[Math.floor(rng() * deckPokeIdxs.length)], 1)[0];
          const spare = me.hand.splice(spareJ, 1)[0];
          me.deck.push(spare);
          me.hand.push(pulled);
          // splice(spareJ) が i より前ならインデックスがずれるので取り直して除去
          const selfIdx = me.hand.indexOf(c);
          if (selfIdx >= 0) me.hand.splice(selfIdx, 1);
        }
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
        const target = board(me).find((m) => !m.tool);
        if (target) {
          target.tool = "Giant Cape";
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
      } else if (t === "Rocky Helmet" || t === "ゴツゴツメット" || t === "Poison Barb" || t === "どくバリ") {
        // 反撃系どうぐ: バトル場につける (1体1枚)
        if (me.active && !me.active.tool) {
          me.active.tool = (t === "どくバリ" || t === "Poison Barb") ? "Poison Barb" : "Rocky Helmet";
          me.hand.splice(i, 1);
        }
      } else if (t === "Leaf Cape" || t === "リーフマント") {
        // 草ポケモンのHP+30
        const target = board(me).find((m) => !m.tool && (m.types || []).includes("Grass"));
        if (target) {
          target.tool = "Leaf Cape";
          target.hp += 30;
          me.hand.splice(i, 1);
        }
      } else if (t === "Leftovers" || t === "たべのこし") {
        // 自分の番の終わりにバトル場ならHP10回復
        if (me.active && !me.active.tool) {
          me.active.tool = "Leftovers";
          me.hand.splice(i, 1);
        }
      } else if (t === "Sitrus Berry" || t === "オボンのみ" || t === "Lum Berry" || t === "ラムのみ") {
        const key = (t === "Sitrus Berry" || t === "オボンのみ") ? "Sitrus Berry" : "Lum Berry";
        const target = board(me).find((m) => !m.tool);
        if (target) {
          target.tool = key;
          me.hand.splice(i, 1);
        }
      } else if (c.trainerType === "Stadium") {
        // スタジアム: 効果を実装済みのものだけ出す (前のスタジアムは消える)
        const key = STADIUM_KEY[t];
        if (key && (!stadium || (stadium.owner !== me && stadium.key !== key))) {
          stadium = { key, owner: me };
          me.hand.splice(i, 1);
        } else if (!key) {
          me.hand.splice(i, 1); // 効果未実装のスタジアムは手札を圧迫しないよう捨てる
        }
      } else if (c.tfx && genericTrainer(c, i, me, op, turnNo)) {
        /* 汎用処理で使えた (下の genericTrainer が手札から取り除く) */
      }
      /* 【重要】使えなかったトレーナーは手札に残す。
       * 以前はここで捨てていたが、それだと「今は使えないカード」——
       * 無傷のときのキズぐすり、相手のベンチが空のときのアカギ、確定数が動かない場面の
       * サカキ —— が引いた瞬間に消えることになり、状況を選ぶ札が一切働かなかった。
       * 結果として「いつでも使える札(ボール/博士/加速)」だけが強く評価され、
       * 構築の幅を広げようとすると必ず勝率が下がる、という偏りを生んでいた。
       * 実際のプレイでは使えない札は手札に残って場を待つので、そちらに合わせる。 */
      // サポートを実際に使った(手札から離れた)ら1ターン1枚の枠を消費。
      // ドロー/サーチ系は手札が増えるので、枚数差ではなくカードの消失で判定する
      if (c.trainerType === "Supporter" && me.hand.indexOf(c) < 0) me.supporterUsed = true;
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
          // 進化時の誘発特性 (一貫性エンジン: ドロー/加速/回復/狙撃/相手エネ破壊)
          const oe = upgraded.abFx?.onEvolve;
          if (oe) {
            if (oe.draw) me.hand.push(...me.deck.splice(0, oe.draw));
            if (oe.heal) upgraded.damage = Math.max(0, upgraded.damage - oe.heal);
            if (oe.accel && me.active) me.active.energy.push(oe.accel);
            if (oe.snipe && op.active) {
              op.active.damage += oe.snipe;
              if (op.active.damage >= op.active.hp && knockOut(me, op, op.active)) return me === A ? 1 : 0;
            }
            if (oe.oppDiscard && op.active?.energy.length) {
              op.etrash.push(...op.active.energy.splice(Math.floor(rng() * op.active.energy.length), 1));
            }
          }
        }
      }
    }

    // エネルギー (先攻の最初の番はなし / ジュペッタ系のワザで封じられている番もなし)
    if (turnNo !== 1 && me.noEnergyTurn !== me.turn) {
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
      // 相手のバトルポケモンをベンチへ下げる妨害 (育ったアタッカーを一時退場)
      // 特性: ベンチのエネをまとめて前へ (ルナアーラex)。前が殴れないときだけ使う
      if (ab.energyBulkMove && me.active && !bestUsable(me.active)) {
        const from = me.bench.filter((x) => x.energy.length).sort((x, y) => y.energy.length - x.energy.length)[0];
        if (from) { me.active.energy.push(...from.energy.splice(0)); }
      }
      // 特性: トラッシュから貼り直しつつ削る (ブースターex)
      if (ab.recycleAccel && mon.energy !== undefined) {
        const j = me.etrash.indexOf(ab.recycleAccel.type);
        if (j >= 0) {
          me.etrash.splice(j, 1);
          mon.energy.push(ab.recycleAccel.type);
          if (op.active) {
            op.active.damage += ab.recycleAccel.dmg;
            if (op.active.damage >= op.active.hp && knockOut(me, op, op.active)) return me === A ? 1 : 0;
          }
        }
      }
      // 特性: コイン/確定で相手を状態異常に (スリーパー/マタドガス)
      if (ab.turnSleepFlip && mon === me.active && op.active && rng() < 0.5 && canStatus(op.active)) op.active.sleep = true;
      if (ab.turnPoison && mon === me.active && op.active && canStatus(op.active)) op.active.poison = true;
      // 特性: 手札を切ってドロー (ガブリアス)
      if (ab.turnDrawCost && me.hand.length && me.deck.length) {
        me.hand.splice(0, 1);
        me.hand.push(me.deck.shift());
      }
      if (ab.turnDisrupt && mon === me.active && op.active && op.active.energy.length >= 2 && op.bench.length) {
        op.bench.sort((x, y) => attackerValue(y) - attackerValue(x));
        const incoming = op.bench.shift();
        const outgoing = op.active;
        outgoing.poison = outgoing.burn = outgoing.sleep = outgoing.para = outgoing.confuse = false;
        op.active = incoming;
        op.bench.push(outgoing);
      }
    }

    // にげる (ルール: にげるコスト分のエネルギーをトラッシュ。ねむり/マヒ中は不可)
    // 攻撃できないバトルポケモンを、攻撃できるベンチと入れ替える。
    // コストを払えない重いポケモンはそのまま前に居座る = にげるコストのテンポ損
    const effRc = !me.active ? 0
      // 特性で自力入れ替えできるならコストは要らない (ソルガレオex系)
      : (me.active.abFx?.freeSwitch || me.bench.some((m) => m.abFx?.freeSwitch)) ? 0
      : (me.active.abFx?.noRetreatIfEnergy && me.active.energy.length) ? 0
      : Math.max(0, me.active.rc -
          // スタジアム: ふしぎな広場 (超ポケモンのにげるコスト-2、お互い)
          (stadium?.key === "Peculiar Plaza" && (me.active.types || []).includes("Psychic") ? 2 : 0) -
          (me.retreatCut || 0) -
          // 特性: ベンチに居るだけで味方のにげるコストを軽くする (シェイミ/ワタッコ)
          (board(me).some((x) => x.abFx?.teamRetreatCut) ? 1 : 0));
    if (me.active && !bestUsable(me.active) && !me.active.sleep && !me.active.para &&
        me.active.noRetreatTurn !== me.turn &&
        me.active.energy.length >= effRc) {
      const readyIdx = me.bench.findIndex((m) => bestUsable(m));
      if (readyIdx >= 0 && attackerValue(me.bench[readyIdx]) > attackerValue(me.active)) {
        const tmp = me.active;
        me.etrash.push(...tmp.energy.splice(0, effRc)); // にげるコスト分をトラッシュ
        tmp.poison = tmp.burn = tmp.sleep = tmp.para = tmp.confuse = false;
        me.active = me.bench[readyIdx];
        me.bench[readyIdx] = tmp;
      }
    }

    // 攻撃 (ねむり/マヒ/ワザロック中は不可)
    let attackAllowed = me.active && !me.active.sleep && !me.active.para && !me.active.lockAttack && !me.noAttack &&
      me.active.cantAttackTurn !== me.turn; // 反動で攻撃不能の番
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
            // スタジアム: トレーニングエリア (1進化ポケモンのワザ+10、お互い)
            if (stadium?.key === "Training Area" && me.active.evolvesFrom && !me.active.stage2) dmg += 10;
            if (op.active.weakness && (me.active.types || []).includes(op.active.weakness)) dmg += 20;
            dmg = applyReduction(op.active, dmg, turnNo, me.active);
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
        if (fx.perTool) {
          // 「40×」表記: 基礎0で、場の自分のポケモン全体のどうぐの数×N
          dmg = fx.perTool * board(me).filter((x) => x.tool).length;
        }
        if (fx.ifSelfTool && me.active.tool) dmg += fx.ifSelfTool;
        if (fx.perOppEnergy) dmg += fx.perOppEnergy * op.active.energy.length;
        if (fx.perOppBench) dmg += fx.perOppBench * op.bench.length;
        if (fx.extraEnergy) {
          const attached = fx.extraEnergy.type
            ? me.active.energy.filter((t) => t === fx.extraEnergy.type).length
            : me.active.energy.length;
          if (attached - attack.cost >= fx.extraEnergy.n) dmg += fx.extraEnergy.bonus;
        }
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
        // 第2弾: 盤面から決まる追加打点
        if (fx.coinPerEnergy) {
          let heads = 0;
          for (let i = 0; i < me.active.energy.length; i++) if (rng() < 0.5) heads++;
          dmg = fx.coinPerEnergy * heads;
        }
        if (fx.perAllOppEnergy) dmg = fx.perAllOppEnergy * board(op).reduce((a, x) => a + x.energy.length, 0);
        if (fx.perBothBench) dmg = fx.perBothBench * (me.bench.length + op.bench.length);
        if (fx.perOppRetreat) dmg += fx.perOppRetreat * (op.active.rc || 0);
        if (fx.ifOppAbility && op.active.abFx) dmg += fx.ifOppAbility;
        if (fx.ifEvolvedNow && me.active.playedTurn === me.turn) dmg += fx.ifEvolvedNow;
        if (fx.ifAllyKod && me.lostLastTurn) dmg += fx.ifAllyKod;
        if (fx.rampNext && me.active.rampUntil === me.turn) dmg += me.active.rampValue || 0;
        // 第3弾: 盤面から決まる打点
        if (fx.perMyPoint) dmg += fx.perMyPoint * me.points;
        if (fx.dmgEqualsSelf) dmg = me.active.damage;
        if (fx.stackWhileActive) dmg += (me.active.stackDmg || 0);
        if (fx.copyAttack && op.active) {
          // 相手のバトルポケモンの最大打点をそのまま借りる
          const borrowed = Math.max(0, ...(op.active.attacks || []).map((a) => a.dmg || 0));
          dmg = Math.max(dmg, borrowed);
        }

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

        // 反撃 (どうぐ・特性): 生き残った防御側の反撃効果
        if (dmg > 0 && op.active && op.active.damage > 0 && me.active) {
          let counter = 0;
          if (op.active.tool === "Rocky Helmet") counter += 20;
          if (op.active.abFx?.counter) counter += op.active.abFx.counter; // 反撃特性
          if (counter) {
            me.active.damage += counter;
            if (me.active.damage >= me.active.hp && knockOut(op, me, me.active)) return op === A ? 1 : 0;
          }
          if ((op.active.tool === "Poison Barb" || op.active.abFx?.counterPoison) && canStatus(me.active)) me.active.poison = true;
          // 特性: 殴られたらエネルギーを得る (ブルンゲル)
          if (op.active.abFx?.onHitAccel) op.active.energy.push(op.active.abFx.onHitAccel);
          // ワザで張った反撃 (アローラサンドパン)
          if ((op.active.counterUntil || -1) >= turnNo && me.active) {
            me.active.damage += op.active.counterValue || 0;
            if (me.active.damage >= me.active.hp && knockOut(op, me, me.active)) return me === A ? 0 : 1;
          }
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
        if ((fx.coinShield && rng() < 0.5) || fx.fullShield) {
          me.active.shieldUntil = turnNo + 1;
          me.active.shieldValue = 9999; // 全ダメージ無効
        }
        if (fx.draw) me.hand.push(...me.deck.splice(0, fx.draw));
        // 反動: 次の自分の番はこのポケモンで攻撃できない
        if (fx.selfLockNext && me.active) me.active.cantAttackTurn = me.turn + 1;
        // 第2弾: 盤面への作用
        if (fx.accelSelfN && me.active) {
          for (let k = 1; k < fx.accelSelfN; k++) {   // 1個目は既存の accelSelf が処理
            if (attachEnergy(me, op, me.active, fx.accelSelf, turnNo)) return me === A ? 1 : 0;
          }
        }
        if (fx.accelBench?.each) {
          const tgts = me.bench.slice().sort((x, y) => (bestPotential(y) || 0) - (bestPotential(x) || 0)).slice(0, fx.accelBench.n);
          for (const t of tgts) if (attachEnergy(me, op, t, fx.accelBench.type, turnNo)) return me === A ? 1 : 0;
        }
        if (fx.randomHit) {
          for (let k = 0; k < fx.randomHit.times; k++) {
            const pool = board(op);
            if (!pool.length) break;
            const tgt = pool[Math.floor(rng() * pool.length)];
            tgt.damage += fx.randomHit.dmg;
            if (tgt.damage >= tgt.hp && knockOut(me, op, tgt)) return me === A ? 1 : 0;
          }
        }
        if (fx.gustAttack && op.bench.length && op.active) {
          const i2 = Math.floor(rng() * op.bench.length);   // 相手が選ぶので無作為
          const tgt = op.bench.splice(i2, 1)[0];
          const out = op.active;
          out.poison = out.burn = out.sleep = out.para = out.confuse = false;
          op.active = tgt; op.bench.push(out);
        }
        if (fx.handCost) me.hand.splice(0, 1);
        if (fx.lockItemNext) op.noItemTurn = op.turn + 1;
        if (fx.lockSupporterNext) op.noSupporterTurn = op.turn + 1;
        if (fx.lockEnergyNext) op.noEnergyTurn = op.turn + 1;
        if (fx.costUpNext && op.active) op.active.costUpUntil = turnNo + 1;
        if (fx.counterNext && me.active) { me.active.counterUntil = turnNo + 1; me.active.counterValue = fx.counterNext; }
        if (fx.rampNext && me.active) { me.active.rampUntil = me.turn + 1; me.active.rampValue = fx.rampNext; }
        if (fx.accelSpread) {
          for (let k = 0; k < fx.accelSpread.n; k++) {
            const tgt = board(me).slice().sort((x, y) => (bestPotential(y) || 0) - (bestPotential(x) || 0))[0];
            if (!tgt) break;
            if (attachEnergy(me, op, tgt, fx.accelSpread.type, turnNo)) return me === A ? 1 : 0;
          }
        }
        if (fx.discardAllBoth) {
          for (const pl of [me, op]) for (const mon of board(pl)) {
            if (mon.energy.length) pl.etrash.push(...mon.energy.splice(Math.floor(rng() * mon.energy.length), 1));
          }
        }
        if (fx.stripSupporter) {
          const k = op.hand.findIndex((x) => x.trainerType === "Supporter");
          if (k >= 0) op.hand.splice(k, 1);
        }
        if (fx.bounceHandFlip && rng() < 0.5 && op.hand.length) {
          op.deck.push(op.hand.splice(Math.floor(rng() * op.hand.length), 1)[0]);
        }
        // バトル場に居る限り打点が累積 (メガクチートex)
        if (fx.stackWhileActive && me.active) {
          me.active.stackDmg = (me.active.stackDmg || 0) + fx.stackWhileActive;
        }
        if (fx.selfEvolve && me.active) {
          const k = me.deck.findIndex((x) => x.pokemon && x.evolvesFrom === me.active.name);
          if (k >= 0) {
            const evo = me.deck.splice(k, 1)[0];
            me.active = { ...inst(evo, me.turn), energy: me.active.energy, damage: me.active.damage };
          }
        }
        // 自傷の状態異常 (カビゴンのねむる等)。相手の付与と同じ扱いで自分に乗せる
        if (fx.selfSleep && canStatus(me.active)) me.active.sleep = true;
        if (fx.selfConfuse && canStatus(me.active)) me.active.confuse = true;
        // 相手の打点を下げる = 自分に一時的なシールドを張るのと同じ
        if (fx.weakenOpp && me.active) {
          me.active.shieldUntil = turnNo + 1;
          me.active.shieldValue = Math.max(me.active.shieldValue || 0, fx.weakenOpp);
        }
        // 殴りながら山札からポケモンを持ってくる / ベンチに出す
        if (fx.searchHand) {
          const k = me.deck.findIndex((x) => x.pokemon);
          if (k >= 0) me.hand.push(me.deck.splice(k, 1)[0]);
        }
        if (fx.searchBench && me.bench.length < 3) {
          const k = me.deck.findIndex((x) => x.basic);
          if (k >= 0) me.bench.push(inst(me.deck.splice(k, 1)[0], me.turn));
        }
        // ベンチ全体へのエネ加速 / コイン枚数ぶんの加速
        if (fx.accelBenchAny) {
          for (let k = 0; k < fx.accelBenchAny; k++) {
            const tgt = me.bench.slice().sort((x, y) => (bestPotential(y) || 0) - (bestPotential(x) || 0))[0];
            if (!tgt) break;
            if (attachEnergy(me, op, tgt, me.energies[Math.floor(rng() * me.energies.length)], turnNo)) return me === A ? 1 : 0;
          }
        }
        if (fx.accelFlip && me.active) {
          for (let k = 0; k < fx.accelFlip.n; k++) {
            if (rng() < 0.5 && attachEnergy(me, op, me.active, fx.accelFlip.type, turnNo)) return me === A ? 1 : 0;
          }
        }
        // ヒットアンドラン: 攻撃後にベンチの最良アタッカーと入れ替え
        if (fx.selfSwitch && me.bench.length) {
          const bi = me.bench.reduce((b, m, k, arr) => attackerValue(m) > attackerValue(arr[b]) ? k : b, 0);
          if (attackerValue(me.bench[bi]) >= attackerValue(me.active)) {
            const tmp = me.active;
            me.active = me.bench[bi];
            me.bench[bi] = tmp;
          }
        }

        // 相手への追加効果
        if (op.active) {
          if (fx.oppDiscard && (!fx.oppDiscardFlip || rng() < 0.5)) {
            for (let k = 0; k < fx.oppDiscard && op.active.energy.length; k++) {
              op.etrash.push(...op.active.energy.splice(Math.floor(rng() * op.active.energy.length), 1));
            }
          }
          if (fx.poison && canStatus(op.active)) op.active.poison = true;
          if (fx.burn && canStatus(op.active)) op.active.burn = true;
          if (fx.sleep && canStatus(op.active)) op.active.sleep = true;
          if (fx.confuse && canStatus(op.active)) op.active.confuse = true;
          if ((fx.paralyze || (fx.paralyzeFlip && rng() < 0.5)) && canStatus(op.active)) op.active.para = true;
          if (fx.lockAttack) op.active.lockAttack = true;
          if (fx.trapOpp) op.active.noRetreatTurn = op.turn + 1;
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
    me.bonusPoint = 0; // 追加サイドもこの番のみ
    me.retreatCut = 0; // にげる軽減もこの番のみ
    me.noAttack = false; // カキ等の「この番は終わる」も解除

    // 特性: 番の終わりに自己回復 (カビゴンex系)
    if (me.active?.abFx?.endTurnHeal && me.active.damage > 0) {
      me.active.damage = Math.max(0, me.active.damage - me.active.abFx.endTurnHeal);
    }
    // 特性: バトル場にいるだけで毎ターン1ドロー (エンテイex系)
    if (me.active?.abFx?.endTurnDraw && me.deck.length) {
      me.hand.push(...me.deck.splice(0, me.active.abFx.endTurnDraw));
    }
    // 特性: 最初の番の終わりに自分へエネ加速 (ゼラオラ)
    if (me.turn === 1) {
      for (const mon of board(me)) {
        const ft = mon.abFx?.firstTurnAccel;
        if (ft && attachEnergy(me, op, mon, ft, turnNo)) return me === A ? 1 : 0;
      }
    }
    // ターン終了時のどうぐ効果
    if (me.active?.tool === "Leftovers") {
      me.active.damage = Math.max(0, me.active.damage - 10); // たべのこし
    }
    for (const pl of [A, B]) {
      for (const mon of board(pl)) {
        if (mon.tool === "Sitrus Berry" && mon.damage > 0 && mon.hp - mon.damage <= mon.hp / 2) {
          mon.damage = Math.max(0, mon.damage - 30); // オボンのみ (使ったら剥がれる)
          mon.tool = null;
        } else if (mon.tool === "Lum Berry" &&
                   (mon.poison || mon.burn || mon.sleep || mon.para || mon.confuse)) {
          mon.poison = mon.burn = mon.sleep = mon.para = mon.confuse = false; // ラムのみ
          mon.tool = null;
        }
      }
    }

    // ポケモンチェック時の特性 (受動ダメージ/全体回復)
    for (const [pl, opp] of [[A, B], [B, A]]) {
      const cd = pl.active?.abFx?.checkupDmg;
      if (cd && opp.active) {
        const targets = cd.all ? board(opp) : [opp.active];
        for (const tgt of targets.slice()) {
          tgt.damage += cd.amount;
          if (tgt.damage >= tgt.hp && knockOut(pl, opp, tgt)) return pl === A ? 1 : 0;
        }
      }
      const ch = pl.active?.abFx?.checkupHealAll;
      if (ch) for (const mon of board(pl)) mon.damage = Math.max(0, mon.damage - ch);
    }

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
