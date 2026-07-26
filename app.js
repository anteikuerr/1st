/* ポケポケ デッキビルダー
 * カードデータ・画像: TCGdex API (https://tcgdex.dev) の Pokémon TCG Pocket シリーズを利用
 * ルール: デッキは20枚ちょうど / 同名カードは2枚まで / エネルギーはタイプ選択(最大3)
 */

const API_BASE = "https://api.tcgdex.net/v2";
const SERIES_ID = "tcgp";
const CACHE_KEY = "ppdb.cards.v3";
const DETAILS_KEY = "ppdb.details.v3"; // v3: 進化元(dv)を含む
const DECKS_KEY = "ppdb.decks.v1";
const CURRENT_KEY = "ppdb.current.v1";
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24時間

const DECK_SIZE = 20;
const MAX_PER_NAME = 2;

const ENERGY_TYPES = [
  { id: "grass", label: "草", icon: "🌿" },
  { id: "fire", label: "炎", icon: "🔥" },
  { id: "water", label: "水", icon: "💧" },
  { id: "lightning", label: "雷", icon: "⚡" },
  { id: "psychic", label: "超", icon: "🔮" },
  { id: "fighting", label: "闘", icon: "✊" },
  { id: "darkness", label: "悪", icon: "🌙" },
  { id: "metal", label: "鋼", icon: "⚙️" },
];

// ---------- 状態 ----------
const state = {
  allCards: [],          // { id, localId, name, image, setId, setName }
  cardById: new Map(),
  sets: [],              // { id, name }
  lang: "ja",
  filtered: [],
  typeFilter: "",        // タイプチップの選択値
  deck: {},              // cardId -> count
  deckName: "",
  energies: [],          // energy type ids (max 3)
  savedDecks: [],
  details: new Map(),    // cardId -> { c: category, t: types[], h: hp, s: stage, r: rarity }
  detailCache: new Map(),// cardId -> フル詳細 (モーダル用)
  localData: null,       // download_cards.py の data/ を使用中なら { high: bool }
  baseStatus: "",
  modalCardId: null,
};

// ---------- DOM ----------
const $ = (sel) => document.querySelector(sel);
const els = {
  search: $("#search"),
  setFilter: $("#set-filter"),
  categoryFilter: $("#category-filter"),
  typeChips: $("#type-chips"),
  stageFilter: $("#stage-filter"),
  rarityFilter: $("#rarity-filter"),
  sortFilter: $("#sort-filter"),
  resultCount: $("#result-count"),
  deckProgressFill: $("#deck-progress-fill"),
  reloadBtn: $("#reload-btn"),
  status: $("#status"),
  grid: $("#card-grid"),
  deckPanel: $("#deck-panel"),
  deckToggle: $("#deck-toggle"),
  deckClose: $("#deck-close"),
  deckCount: $("#deck-count"),
  deckCountBadge: $("#deck-count-badge"),
  deckName: $("#deck-name"),
  energyPicker: $("#energy-picker"),
  deckWarnings: $("#deck-warnings"),
  deckList: $("#deck-list"),
  savedDeckList: $("#saved-deck-list"),
  cardModal: $("#card-modal"),
  diagModal: $("#diag-modal"),
  explainModal: $("#explain-modal"),
  explainBody: $("#explain-body"),
  choiceModal: $("#choice-modal"),
  choiceDesc: $("#choice-desc"),
  supportModal: $("#support-modal"),
  supportList: $("#support-list"),
  supportNote: $("#support-note"),
  chatModal: $("#chat-modal"),
  chatLog: $("#chat-log"),
  chatControls: $("#chat-controls"),
  metaModal: $("#meta-modal"),
  metaDeckList: $("#meta-deck-list"),
  diagResults: $("#diag-results"),
  modalImg: $("#modal-img"),
  modalInfo: $("#modal-info"),
  modalAdd: $("#modal-add"),
  importModal: $("#import-modal"),
  importText: $("#import-text"),
  toast: $("#toast"),
};

// ---------- ユーティリティ ----------
function toast(msg, ms = 1800) {
  els.toast.textContent = msg;
  els.toast.classList.remove("hidden");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => els.toast.classList.add("hidden"), ms);
}

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

// ひらがな→カタカナ変換して検索を寛容に
function normalize(s) {
  return String(s ?? "")
    .toLowerCase()
    .replace(/[ぁ-ん]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) + 0x60));
}

// 画像URL: 直リンク形式(.png等)ならそのまま、TCGdex形式なら解像度サフィックスを付ける
const isDirectImage = (url) => /\.(png|webp|jpe?g)$/i.test(url || "");

function thumbUrl(card) {
  if (state.localData) return `data/img/${card.id}.png`;
  if (!card.image) return null;
  return isDirectImage(card.image) ? card.image : `${card.image}/low.webp`;
}
function largeUrl(card) {
  if (state.localData) return `data/img/${card.id}.png`;
  if (!card.image) return null;
  return isDirectImage(card.image) ? card.image : `${card.image}/high.webp`;
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} (${url})`);
  return res.json();
}

// ---------- カードデータ読み込み ----------
async function loadCards(forceReload = false) {
  els.status.textContent = "カードデータを読み込み中…";

  // download_cards.py で作成したローカルデータがあれば最優先 (完全オフライン動作)
  try {
    const local = await fetchJson("data/cards.json");
    if (local?.cards?.length) {
      state.lang = local.lang || "ja";
      state.localData = { high: !!local.high };
      applyCardData(local.sets || [], local.cards);
      state.details = new Map(Object.entries(local.details || {}));
      refreshDetailFilterOptions();
      renderWarnings();
      setBaseStatus(`${local.cards.length}枚のカードを読み込みました（ローカルデータ / オフライン対応）`);
      return;
    }
  } catch { /* ローカルデータなし → オンライン取得へ */ }
  state.localData = null;

  // アプリ同梱のメタデータ (carddata.json / GitHub Actionsが週次更新)。
  // 詳細も同梱済みなので、新カードの差分以外はAPIを叩かずに済む
  try {
    const bundled = await fetchJson("carddata.json");
    if (bundled?.cards?.length) {
      state.lang = bundled.lang || "ja";
      applyCardData(bundled.sets || [], bundled.cards);
      setBaseStatus(`${bundled.cards.length}枚のカードを読み込みました`);
      hydrateDetails(bundled.details);
      return;
    }
  } catch { /* 同梱データなし → API取得へ */ }

  if (!forceReload) {
    try {
      const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
      if (cached && Date.now() - cached.time < CACHE_TTL && cached.cards?.length) {
        state.lang = cached.lang || "ja";
        applyCardData(cached.sets, cached.cards);
        setBaseStatus(`${state.allCards.length}枚のカードを読み込みました（キャッシュ）`);
        hydrateDetails();
        return;
      }
    } catch { /* キャッシュ破損は無視して再取得 */ }
  }

  // 日本語→英語の順でフォールバック
  for (const lang of ["ja", "en"]) {
    try {
      const series = await fetchJson(`${API_BASE}/${lang}/series/${SERIES_ID}`);
      const setBriefs = series.sets || [];
      const sets = [];
      const cards = [];

      const results = await Promise.allSettled(
        setBriefs.map((s) => fetchJson(`${API_BASE}/${lang}/sets/${s.id}`))
      );
      for (const r of results) {
        if (r.status !== "fulfilled") continue;
        const set = r.value;
        sets.push({ id: set.id, name: set.name });
        for (const c of set.cards || []) {
          cards.push({
            id: c.id,
            localId: c.localId,
            name: c.name,
            image: c.image || null,
            setId: set.id,
            setName: set.name,
          });
        }
      }
      if (!cards.length) throw new Error("カードが0枚でした");

      state.lang = lang;
      applyCardData(sets, cards);
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ time: Date.now(), lang, sets, cards }));
      } catch { /* 容量オーバーは無視 */ }
      setBaseStatus(`${cards.length}枚のカードを読み込みました`);
      hydrateDetails();
      return;
    } catch (e) {
      console.warn(`[${lang}] 読み込み失敗:`, e);
    }
  }

  els.status.innerHTML =
    '<span class="error">カードデータの取得に失敗しました。ネットワーク接続を確認して 🔄 で再試行してください。</span>';
}

function applyCardData(sets, cards) {
  // 英語データにフォールバックした場合は表示を日本語化 (ja.js / 訳せないものは英語のまま)
  if (state.lang === "en") {
    for (const s of sets) s.name = jaSetName(s.id, s.name);
    for (const c of cards) {
      if (!c.enName) c.enName = c.name;
      c.name = jaCardName(c.enName);
      c.setName = jaSetName(c.setId, c.setName);
    }
  }
  state.sets = sets;
  state.allCards = cards;
  state.cardById = new Map(cards.map((c) => [c.id, c]));

  els.setFilter.innerHTML =
    '<option value="">すべての拡張パック</option>' +
    sets.map((s) => `<option value="${esc(s.id)}">${esc(s.name)} (${esc(s.id)})</option>`).join("");

  applyFilter();
  renderDeck(); // サムネ解決のため再描画
}

function setBaseStatus(msg) {
  state.baseStatus = msg;
  els.status.textContent = msg;
}

// ---------- カード詳細の一括取り込み ----------
// タイプ・進化・レアリティ等での絞り込み用の詳細データ。
// preloaded (同梱データ) と localStorage キャッシュにあるものはそのまま使い、
// 足りない分だけバックグラウンドでAPIから取得して永続キャッシュする
async function hydrateDetails(preloaded) {
  let cache = {};
  try { cache = JSON.parse(localStorage.getItem(DETAILS_KEY) || "{}"); } catch { /* ignore */ }
  if (cache.lang !== state.lang || !cache.cards) cache = { lang: state.lang, cards: {} };

  state.details = new Map([
    ...Object.entries(cache.cards),
    ...Object.entries(preloaded || {}),
  ]);

  const queue = state.allCards.map((c) => c.id).filter((id) => !state.details.has(id));
  const total = queue.length;
  refreshDetailFilterOptions();

  if (!total) return;

  let done = 0;
  const persist = () => {
    try { localStorage.setItem(DETAILS_KEY, JSON.stringify(cache)); } catch { /* ignore */ }
  };
  const workers = Array.from({ length: 20 }, async () => {
    while (queue.length) {
      const id = queue.shift();
      try {
        const d = await fetchJson(`${API_BASE}/${state.lang}/cards/${id}`);
        const slim = {
          c: d.category || null,
          t: d.types || [],
          h: d.hp || null,
          s: d.stage || null,
          r: d.rarity || null,
        };
        if (d.attacks?.length) {
          slim.a = d.attacks.map((a) => {
            const atk = { c: a.cost || [], n: a.name };
            if (a.damage != null) atk.d = a.damage;
            if (a.effect) atk.e = a.effect;
            return atk;
          });
        }
        if (d.abilities?.length) slim.ab = d.abilities.map((a) => ({ n: a.name, e: a.effect }));
        if (d.weaknesses?.length) slim.w = d.weaknesses.map((w) => ({ t: w.type, v: w.value }));
        if (d.retreat != null) slim.rc = d.retreat;
        if (d.evolveFrom) slim.dv = d.evolveFrom;
        state.details.set(id, slim);
        cache.cards[id] = slim;
      } catch { /* 失敗したカードは次回に再試行 */ }
      done++;
      if (done % 100 === 0) {
        persist();
        refreshDetailFilterOptions();
        els.status.textContent = `${state.baseStatus} · 詳細データ取得中 ${done}/${total}`;
        if (detailFilterActive()) applyFilter();
      }
    }
  });
  await Promise.all(workers);
  persist();
  refreshDetailFilterOptions();
  renderWarnings();
  els.status.textContent = state.baseStatus;
  if (detailFilterActive()) applyFilter();
}

function detailFilterActive() {
  return !!(els.categoryFilter.value || state.typeFilter ||
            els.stageFilter.value || els.rarityFilter.value);
}

const CATEGORY_LABELS = { Pokemon: "ポケモン", Trainer: "トレーナーズ", Energy: "エネルギー" };

// 取得済みの詳細データから絞り込み候補を動的に作る(APIの表記に依存しない)
function refreshDetailFilterOptions() {
  const categories = new Map(); // value -> label
  const types = new Set();
  const stages = new Set();
  const rarities = new Set();
  for (const d of state.details.values()) {
    if (d.c) categories.set(d.c, CATEGORY_LABELS[d.c] || d.c);
    for (const t of d.t || []) types.add(t);
    if (d.s) stages.add(d.s);
    if (d.r) rarities.add(d.r);
  }
  const TYPE_ORDER = ["草", "炎", "水", "雷", "超", "闘", "悪", "鋼", "無色", "ドラゴン"];
  const STAGE_ORDER = ["たね", "1進化", "2進化"];
  const rank = (order, v) => { const i = order.indexOf(v); return i < 0 ? 99 : i; };

  fillSelect(els.categoryFilter, "カテゴリ", [...categories.entries()]);
  renderTypeChips(
    [...types].map((v) => [v, jaType(v)])
      .sort((a, b) => rank(TYPE_ORDER, a[1]) - rank(TYPE_ORDER, b[1]) || a[1].localeCompare(b[1])));
  fillSelect(els.stageFilter, "進化",
    [...stages].map((v) => [v, jaStage(v)])
      .sort((a, b) => rank(STAGE_ORDER, a[1]) - rank(STAGE_ORDER, b[1]) || a[1].localeCompare(b[1])));
  fillSelect(els.rarityFilter, "レアリティ",
    [...rarities].map((v) => [v, jaRarity(v)]).sort((a, b) => a[1].localeCompare(b[1])));
}

// タイプ絞り込みはワンタップのアイコンチップで
function renderTypeChips(entries) {
  if (entries.length && !entries.some(([v]) => v === state.typeFilter)) state.typeFilter = "";
  els.typeChips.innerHTML = "";
  const all = [["", "すべて"], ...entries];
  for (const [value, label] of all) {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "type-chip" + (state.typeFilter === value ? " active" : "");
    chip.dataset.type = value;
    chip.textContent = value === "" ? "すべて" : `${costIcon(value)} ${label}`;
    chip.addEventListener("click", () => {
      state.typeFilter = value;
      for (const c of els.typeChips.children) c.classList.toggle("active", c.dataset.type === value);
      applyFilter();
    });
    els.typeChips.appendChild(chip);
  }
}

function fillSelect(select, placeholder, entries) {
  const current = select.value;
  select.innerHTML =
    `<option value="">${esc(placeholder)}</option>` +
    entries.map(([v, label]) => `<option value="${esc(v)}">${esc(label)}</option>`).join("");
  if (entries.some(([v]) => v === current)) select.value = current;
}

// ---------- フィルタとグリッド描画 ----------
function applyFilter() {
  const q = normalize(els.search.value.trim());
  const setId = els.setFilter.value;
  const cat = els.categoryFilter.value;
  const type = state.typeFilter;
  const stage = els.stageFilter.value;
  const rarity = els.rarityFilter.value;
  const useDetail = !!(cat || type || stage || rarity);

  state.filtered = state.allCards.filter((c) => {
    if (setId && c.setId !== setId) return false;
    if (q && !normalize(c.name).includes(q) &&
        !normalize(c.enName || "").includes(q) &&
        !normalize(c.id).includes(q)) return false;
    if (useDetail) {
      const d = state.details.get(c.id);
      if (!d) return false; // 詳細未取得のカードは取得され次第反映される
      if (cat && d.c !== cat) return false;
      if (type && !(d.t || []).includes(type)) return false;
      if (stage && d.s !== stage) return false;
      if (rarity && d.r !== rarity) return false;
    }
    return true;
  });

  const sort = els.sortFilter.value;
  const dOf = (c) => state.details.get(c.id) || {};
  const maxDmg = (c) => Math.max(0, ...((dOf(c).a || []).map((a) => { const m = String(a.d ?? "").match(/\d+/); return m ? +m[0] : 0; })));
  const stageRank = (c) => { const s = dOf(c).s || ""; return /2/.test(s) ? 2 : /1|Stage 1/.test(s) ? 1 : dOf(c).c === "Pokemon" || dOf(c).c === "ポケモン" ? 0 : 3; };
  const SORTS = {
    hp: (a, b) => (dOf(b).h || 0) - (dOf(a).h || 0),
    hpAsc: (a, b) => (dOf(a).h || 999) - (dOf(b).h || 999),
    name: (a, b) => a.name.localeCompare(b.name, "ja"),
    dmg: (a, b) => maxDmg(b) - maxDmg(a),
    rarity: (a, b) => jaRarity(dOf(a).r || "").localeCompare(jaRarity(dOf(b).r || ""), "ja"),
    type: (a, b) => ((dOf(a).t || [])[0] || "zz").localeCompare((dOf(b).t || [])[0] || "zz"),
    stage: (a, b) => stageRank(a) - stageRank(b) || (dOf(b).h || 0) - (dOf(a).h || 0),
    retreat: (a, b) => (dOf(a).rc ?? 9) - (dOf(b).rc ?? 9),
  };
  if (SORTS[sort]) state.filtered.sort(SORTS[sort]);

  els.resultCount.textContent = state.allCards.length
    ? `${state.filtered.length} / ${state.allCards.length}枚`
    : "";
  renderGrid();
  schedulePrefetch();
}

// 全件を一度に描画する (画面外セルは content-visibility: auto で描画コストほぼゼロ)
function renderGrid() {
  const frag = document.createDocumentFragment();
  for (const card of state.filtered) {
    frag.appendChild(makeCardCell(card));
  }
  els.grid.innerHTML = "";
  els.grid.appendChild(frag);
}

// ---------- サムネ先読み ----------
// 表示中リストのサムネを裏で順にダウンロードしてブラウザキャッシュを温めておく。
// スクロールが追いついた時にはキャッシュ済みなので即表示される。
let prefetchToken = 0;

function schedulePrefetch() {
  if (navigator.connection?.saveData) return; // 省データモードでは先読みしない
  const token = ++prefetchToken;
  // 画面内に見えている分の読み込みを優先させるため少し待ってから開始
  setTimeout(() => {
    if (token !== prefetchToken) return;
    const urls = state.filtered.map(thumbUrl).filter(Boolean);
    let i = 0;
    const step = () => {
      if (token !== prefetchToken || i >= urls.length) return;
      const img = new Image();
      img.onload = img.onerror = step;
      img.src = urls[i++];
    };
    for (let k = 0; k < 6; k++) step(); // 同時6本で順次先読み
  }, 400);
}

function makeCardCell(card) {
  const cell = document.createElement("div");
  cell.className = "card-cell";
  cell.dataset.cardId = card.id;

  const url = thumbUrl(card);
  if (url) {
    const img = document.createElement("img");
    img.loading = "lazy";
    img.src = url;
    img.alt = card.name;
    img.title = `${card.name} (${card.id})`;
    // 画像が無い/取得漏れの場合はカード名のプレースホルダに置き換える
    img.addEventListener("error", () => {
      const ph = document.createElement("div");
      ph.className = "no-img";
      ph.textContent = card.name;
      img.replaceWith(ph);
    }, { once: true });
    cell.appendChild(img);
  } else {
    const ph = document.createElement("div");
    ph.className = "no-img";
    ph.textContent = card.name;
    cell.appendChild(ph);
  }

  const idTag = document.createElement("span");
  idTag.className = "card-id";
  idTag.textContent = card.id;
  cell.appendChild(idTag);

  const count = state.deck[card.id];
  if (count) {
    const badge = document.createElement("span");
    badge.className = "in-deck";
    badge.textContent = `×${count}`;
    cell.appendChild(badge);
  }

  // クリック=詳細を見て追加 / ダブルクリック不要のシンプル操作
  cell.addEventListener("click", () => openCardModal(card.id));
  return cell;
}

function updateGridBadges() {
  for (const cell of els.grid.children) {
    const id = cell.dataset.cardId;
    let badge = cell.querySelector(".in-deck");
    const count = state.deck[id];
    if (count) {
      if (!badge) {
        badge = document.createElement("span");
        badge.className = "in-deck";
        cell.appendChild(badge);
      }
      badge.textContent = `×${count}`;
    } else if (badge) {
      badge.remove();
    }
  }
}

// ---------- デッキ操作 ----------
function deckTotal() {
  return Object.values(state.deck).reduce((a, b) => a + b, 0);
}

function countByName(name) {
  let n = 0;
  for (const [id, count] of Object.entries(state.deck)) {
    const c = state.cardById.get(id);
    if (c && c.name === name) n += count;
  }
  return n;
}

function addToDeck(cardId) {
  const card = state.cardById.get(cardId);
  if (!card) return;

  if (deckTotal() >= DECK_SIZE) {
    toast(`デッキは${DECK_SIZE}枚までです`);
    return;
  }
  if (countByName(card.name) >= MAX_PER_NAME) {
    toast(`「${card.name}」は同名${MAX_PER_NAME}枚までです`);
    return;
  }
  state.deck[cardId] = (state.deck[cardId] || 0) + 1;
  fetchDetail(cardId); // 統計用に裏で詳細を取得
  onDeckChanged();
  toast(`${card.name} を追加 (${deckTotal()}/${DECK_SIZE})`);
}

function removeFromDeck(cardId) {
  if (!state.deck[cardId]) return;
  state.deck[cardId]--;
  if (state.deck[cardId] <= 0) delete state.deck[cardId];
  onDeckChanged();
}

function clearDeck() {
  if (deckTotal() > 0 && !confirm("編集中のデッキをクリアしますか？")) return;
  state.deck = {};
  state.deckName = "";
  state.energies = [];
  els.deckName.value = "";
  onDeckChanged();
}

function onDeckChanged() {
  renderDeck();
  updateGridBadges();
  persistCurrent();
}

function persistCurrent() {
  try {
    localStorage.setItem(CURRENT_KEY, JSON.stringify({
      name: state.deckName,
      cards: state.deck,
      energies: state.energies,
    }));
  } catch { /* ignore */ }
}

function restoreCurrent() {
  try {
    const cur = JSON.parse(localStorage.getItem(CURRENT_KEY) || "null");
    if (cur) {
      state.deck = cur.cards || {};
      state.deckName = cur.name || "";
      state.energies = cur.energies || [];
      els.deckName.value = state.deckName;
    }
  } catch { /* ignore */ }
}

// 取り込み済みの軽量詳細 (state.details) をフル詳細と同じ形に展開する
function detailFromSlim(cardId) {
  const d = state.details.get(cardId);
  if (!d) return null;
  return {
    category: d.c,
    hp: d.h,
    types: d.t,
    stage: d.s,
    rarity: d.r,
    attacks: (d.a || []).map((a) => ({ cost: a.c, name: a.n, damage: a.d, effect: a.e })),
    abilities: (d.ab || []).map((a) => ({ name: a.n, effect: a.e })),
    weaknesses: (d.w || []).map((w) => ({ type: w.t, value: w.v })),
    retreat: d.rc,
    effect: d.e, // トレーナーカードの効果文
    trainerType: d.tt, // グッズ/サポート/どうぐ/スタジアム
  };
}

const TRAINER_TYPE_LABELS = {
  Item: "グッズ", Supporter: "サポート", Tool: "ポケモンのどうぐ", Stadium: "スタジアム",
};

async function fetchDetail(cardId) {
  if (state.detailCache.has(cardId)) return state.detailCache.get(cardId);
  // 取り込み済みデータがあれば通信せずに使う
  const slim = detailFromSlim(cardId);
  if (slim) {
    state.detailCache.set(cardId, slim);
    renderWarnings();
    if (state.modalCardId === cardId) renderModalInfo(slim);
    return slim;
  }
  if (state.localData) return null;
  try {
    const detail = await fetchJson(`${API_BASE}/${state.lang}/cards/${cardId}`);
    state.detailCache.set(cardId, detail);
    renderWarnings();
    if (state.modalCardId === cardId) renderModalInfo(detail);
    return detail;
  } catch {
    return null;
  }
}

// ---------- デッキ描画 ----------
function renderDeck() {
  const total = deckTotal();
  els.deckCount.textContent = total;
  els.deckCountBadge.textContent = total;
  els.deckProgressFill.style.width = `${(total / DECK_SIZE) * 100}%`;
  els.deckProgressFill.classList.toggle("full", total === DECK_SIZE);

  const entries = Object.entries(state.deck)
    .map(([id, count]) => ({ card: state.cardById.get(id), id, count }))
    .sort((a, b) => (a.card?.id || a.id).localeCompare(b.card?.id || b.id));

  els.deckList.innerHTML = "";
  for (const { card, id, count } of entries) {
    const row = document.createElement("div");
    row.className = "deck-item";

    const url = card ? thumbUrl(card) : null;
    if (url) {
      const img = document.createElement("img");
      img.src = url;
      img.alt = card.name;
      img.addEventListener("click", () => openCardModal(id));
      row.appendChild(img);
    }

    const nameEl = document.createElement("div");
    nameEl.className = "di-name";
    nameEl.innerHTML = `${esc(card?.name || id)}<br><span class="di-id">${esc(id)}</span>`;
    row.appendChild(nameEl);

    const minus = document.createElement("button");
    minus.textContent = "−";
    minus.addEventListener("click", () => removeFromDeck(id));

    const countEl = document.createElement("span");
    countEl.className = "di-count";
    countEl.textContent = count;

    const plus = document.createElement("button");
    plus.textContent = "＋";
    plus.addEventListener("click", () => addToDeck(id));

    row.append(minus, countEl, plus);
    els.deckList.appendChild(row);
  }

  renderEnergyPicker();
  renderWarnings();
}

function renderEnergyPicker() {
  els.energyPicker.innerHTML = "";
  for (const e of ENERGY_TYPES) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "energy-btn" + (state.energies.includes(e.id) ? " active" : "");
    btn.textContent = e.icon;
    btn.title = e.label;
    btn.addEventListener("click", () => {
      if (state.energies.includes(e.id)) {
        state.energies = state.energies.filter((x) => x !== e.id);
      } else if (state.energies.length >= 3) {
        toast("エネルギーは3タイプまでです");
        return;
      } else {
        state.energies.push(e.id);
      }
      renderEnergyPicker();
      persistCurrent();
    });
    els.energyPicker.appendChild(btn);
  }
}

function renderWarnings() {
  const total = deckTotal();
  const msgs = [];

  if (total === DECK_SIZE) {
    // たねポケモンチェック（詳細取得済みのカードから判定できた場合のみ）
    let hasBasic = false;
    let allKnown = true;
    for (const id of Object.keys(state.deck)) {
      const d = state.details.get(id);
      if (!d) { allKnown = false; continue; }
      if ((d.c === "Pokemon" || d.c === "ポケモン") && (d.s === "Basic" || d.s === "たね")) hasBasic = true;
    }
    if (allKnown && !hasBasic) {
      msgs.push("⚠ たねポケモンが入っていません");
    } else {
      msgs.push('<span class="ok">✔ 20枚ちょうど！デッキ完成</span>');
    }
    if (state.energies.length === 0) msgs.push("⚠ エネルギータイプが未選択です");
  } else if (total > 0) {
    msgs.push(`あと${DECK_SIZE - total}枚`);
  }

  els.deckWarnings.innerHTML = msgs.join("<br>");
}

// ---------- おまかせ構築 ----------
const TYPE_TO_ENERGY_ID = {
  Grass: "grass", Fire: "fire", Water: "water", Lightning: "lightning",
  Psychic: "psychic", Fighting: "fighting", Darkness: "darkness", Metal: "metal",
  "草": "grass", "炎": "fire", "水": "water", "雷": "lightning",
  "超": "psychic", "闘": "fighting", "悪": "darkness", "鋼": "metal",
};

function applySuggested(result) {
  state.deck = result.deck;
  state.energies = [...new Set(result.energies.map((t) => TYPE_TO_ENERGY_ID[t]).filter(Boolean))].slice(0, 3);
  state.deckName = result.name;
  els.deckName.value = result.name;
  for (const id of Object.keys(result.deck)) fetchDetail(id);
  onDeckChanged();
  const wc = result.winCondition;
  toast(`「${result.name}」完成 ✨ 勝ち筋: ${wc ? wc.label : "ビートダウン"}` +
    (wc ? `（${wc.plan}）` : ""), 4200);
}

// おまかせ中に、強い2進化ラインを2本目に入れるか選択式で聞く。
// リーン構築(2進化1本)と、2本目を許した構築を比べ、強い2進化が増えるなら提示する。
function detectStrong2ndLine(lean, power) {
  const stg2 = (r) => new Set(Object.keys(r.deck)
    .filter((id) => { const d = state.details.get(id); return d && /2|Stage 2/.test(d.s || ""); })
    .map((id) => state.cardById.get(id)?.name).filter(Boolean));
  const added = [...stg2(power)].filter((n) => !stg2(lean).has(n));
  if (!added.length) return null;
  // 追加される2進化の最大打点で「強い」ものだけを提示 (弱い中継ぎは出さない)
  let best = null;
  for (const name of added) {
    const card = state.allCards.find((c) => c.name === name);
    const d = card && state.details.get(card.id);
    if (!d) continue;
    const dmg = Math.max(0, ...(d.a || []).map((a) => { const m = String(a.d ?? "").match(/\d+/); return m ? +m[0] : 0; }));
    if (dmg >= 100 && (!best || dmg > best.dmg)) best = { name, dmg, hp: d.h || 0 };
  }
  return best;
}

function runSuggest() {
  if (state.details.size < state.allCards.length * 0.5) {
    toast("カードデータの取り込み中です。少し待ってから試してください");
    return;
  }
  const opts = { cards: state.allCards, details: state.details, deck: state.deck };
  const lean = suggestDeck(opts);
  if (lean.error) { toast(lean.error, 3000); return; }
  // 強い2進化ラインを2本目に入れられるなら、ユーザーに選ばせる (パワー型は
  // トレーナーを1枚ぶん削って2本目の進化ラインを収めるので trainerSlots を下げる)
  const power = suggestDeck({ ...opts, weights: { ...SUGGEST_WEIGHTS, maxStage2Lines: 2, trainerSlots: 8 } });
  const strong = (!power.error) ? detectStrong2ndLine(lean, power) : null;
  if (strong) {
    els.choiceDesc.innerHTML =
      `このデッキには強い2進化ライン <b>${esc(strong.name)}</b>（${strong.dmg}打点 / HP${strong.hp}）を` +
      `2本目として足せます。<br>パワーは上がりますが、2進化2本ぶん進化が重くなり事故率も上がります。`;
    state._choiceLean = lean; state._choicePower = power;
    els.choiceModal.classList.remove("hidden");
    return;
  }
  applySuggested(lean);
}

// ---------- 環境デッキギャラリー ----------
// 環境上位・注目コア。デッキ本体は現在のカードデータから構築エンジンが組む
// (環境が変わったらこのリストを更新するだけでよい)
const META_DECKS = [
  { core: "メガルカリオex", tag: "Tier1", desc: "環境トップの闘エース" },
  { core: "メガジュカインex", tag: "Tier1", desc: "素早く育つ草の高打点" },
  { core: "ミライドンex", tag: "Tier1", desc: "雷エネ参照の大技持ち" },
  { core: "ゾロアークex", tag: "Tier1", desc: "手数で押す環境上位デッキ" },
  { core: "ミロカロスex", tag: "新弾", desc: "ミラクルデイズの注目株" },
  { core: "メガディアンシーex", tag: "新弾", desc: "超エネ参照で伸びる大型メガ" },
  { core: "リザードンex", tag: "定番", desc: "王道の2進化パワーデッキ" },
  { core: "ギャラドスex", tag: "定番", desc: "大型フィニッシャーの水デッキ" },
];
const metaDeckCache = new Map(); // core -> suggestDeck結果

function buildMetaDeck(coreName) {
  if (metaDeckCache.has(coreName)) return metaDeckCache.get(coreName);
  const card = state.allCards.find((c) => c.name === coreName);
  if (!card) return null;
  const r = suggestDeck({ cards: state.allCards, details: state.details, deck: { [card.id]: 2 } });
  if (r.error) return null;
  const entry = { ...r, coreCard: card };
  metaDeckCache.set(coreName, entry);
  return entry;
}

function openMetaDecks() {
  if (state.details.size < state.allCards.length * 0.5) {
    toast("カードデータの取り込み中です。少し待ってから試してください");
    return;
  }
  const rows = [];
  for (const [i, m] of META_DECKS.entries()) {
    const built = buildMetaDeck(m.core);
    if (!built) continue;
    const counts = {};
    for (const [id, n] of Object.entries(built.deck)) {
      const c = state.cardById.get(id);
      if (c) counts[c.name] = (counts[c.name] || 0) + n;
    }
    const list = Object.entries(counts).map(([n, c]) => `${c}×${esc(n)}`).join(" / ");
    const energy = built.energies.map((t) => jaType(t)).join("+");
    rows.push(
      `<div class="meta-deck-row">` +
      `<img src="${esc(thumbUrl(built.coreCard) || "")}" alt="" loading="lazy">` +
      `<div class="meta-deck-info">` +
      `<div class="meta-deck-head"><span class="meta-tag meta-tag-${m.tag === "Tier1" ? "t1" : m.tag === "新弾" ? "new" : "std"}">${esc(m.tag)}</span><b>${esc(m.core)}デッキ</b><span class="meta-energy">⚡ ${esc(energy)}</span></div>` +
      `<div class="meta-deck-desc">${esc(m.desc)}</div>` +
      `<div class="meta-deck-cards">${list}</div>` +
      `</div>` +
      `<button type="button" class="meta-load primary" data-core="${esc(m.core)}">読み込む</button>` +
      `</div>`
    );
  }
  els.metaDeckList.innerHTML = rows.join("") ||
    "<p class='hint'>参考デッキを組み立てられませんでした (カードデータ不足)</p>";
  for (const btn of els.metaDeckList.querySelectorAll(".meta-load")) {
    btn.addEventListener("click", () => loadMetaDeck(btn.dataset.core));
  }
  els.metaModal.classList.remove("hidden");
}

function loadMetaDeck(coreName) {
  const built = metaDeckCache.get(coreName);
  if (!built) return;
  if (deckTotal() > 0 && !confirm("いまのデッキを置き換えます。よろしいですか？")) return;
  state.deck = { ...built.deck };
  state.energies = [...new Set(built.energies.map((t) => TYPE_TO_ENERGY_ID[t]).filter(Boolean))].slice(0, 3);
  state.deckName = `${coreName}デッキ`;
  els.deckName.value = state.deckName;
  for (const id of Object.keys(state.deck)) fetchDetail(id);
  onDeckChanged();
  closeModals();
  toast(`「${coreName}デッキ」を読み込みました 🔥 好きに入れ替えてOK`, 3000);
}

/* 重い処理 (構築・シミュレーション) を押したボタンに紐づける。
 * これらは同期処理でメインスレッドを数百ms〜1秒超ブロックするため、
 * 何もしないとクリックの押下表示すら描画されず「反応しない」と見える。
 * 「busyクラス+文言」を先に当て、rAF を2回待って"実際に描画された"ことを
 * 確かめてから本処理に入る (rAF1回だと描画前にブロックが始まることがある)。 */
function onHeavyClick(btn, busyLabel, fn) {
  if (!btn) return;
  btn.addEventListener("click", () => {
    if (btn.dataset.busy) return; // 連打で二重に走らせない
    const original = btn.innerHTML;
    btn.dataset.busy = "1";
    btn.classList.add("is-busy");
    btn.innerHTML = busyLabel;
    const done = () => {
      btn.innerHTML = original;
      btn.classList.remove("is-busy");
      delete btn.dataset.busy;
    };
    requestAnimationFrame(() => requestAnimationFrame(() => {
      try {
        const r = fn();
        // 将来 async 化しても壊れないようにしておく
        if (r && typeof r.finally === "function") r.finally(done);
        else done();
      } catch (e) {
        done();
        throw e;
      }
    }));
  });
}

// ---------- サポート能動提案 ----------
function runRecommendSupport() {
  if (typeof recommendSupport !== "function") return;
  const energies = state.energies.map((id) => ENERGY_ID_TO_TYPE[id]).filter(Boolean);
  const { recs, note } = recommendSupport({
    cards: state.allCards, details: state.details, deck: state.deck,
    energies, cardById: state.cardById,
  });
  const room = DECK_SIZE - deckTotal();
  els.supportNote.textContent = room > 0
    ? `残り${room}枠。おすすめ順に並べました。「＋入れる」で追加できます。` + (note ? ` ${note}` : "")
    : "デッキは20枚です。入れ替えたいカードを外してから追加してください。";
  els.supportList.innerHTML = recs.slice(0, 10).map((r) => {
    const src = thumbUrl(r.card);
    return `<div class="sup-row" data-id="${esc(r.card.id)}">` +
      (src ? `<img class="sup-img" src="${esc(src)}" alt="${esc(r.card.name)}" loading="lazy" data-id="${esc(r.card.id)}">` : "") +
      `<div class="sup-info"><b>${esc(r.card.name)}</b>` +
      (r.roleLabel ? `<span class="sup-role">${esc(r.roleLabel)}</span>` : "") +
      `<div class="sup-reason">${esc(r.reason)}</div></div>` +
      `<button type="button" class="sup-add primary" data-id="${esc(r.card.id)}">＋入れる</button></div>`;
  }).join("") || "<p class='hint'>今のデッキには十分サポートが入っています👍</p>";
  // サムネイルを押したらカード詳細を開く (効果テキストを確認してから入れられる)
  for (const img of els.supportList.querySelectorAll(".sup-img")) {
    img.addEventListener("click", () => openCardModal(img.dataset.id));
  }
  for (const btn of els.supportList.querySelectorAll(".sup-add")) {
    btn.addEventListener("click", () => {
      addToDeck(btn.dataset.id);
      btn.textContent = "追加済";
      btn.disabled = true;
    });
  }
  els.supportModal.classList.remove("hidden");
}

// ---------- 会話でデッキを組む ----------
/* 固定の3ステップウィザードをやめ、いつでも自由に話しかけられる対話にした。
 * 生成AIのような体験にするために必要なのは「毎回同じ順路を通す」ことではなく、
 *   - こちらが常に入力を受け付けていること
 *   - 何を言われても意図を汲んで、必ず一手進めて返すこと
 *   - なぜそう組んだのかを聞かれたら答えられること
 * の3つなので、意図解釈 → 実行 → 説明 のループとして作り直している。 */
const chat = { core: null, result: null, style: null, history: [] };

function chatSay(text, who = "bot") {
  const div = document.createElement("div");
  div.className = `chat-msg chat-${who}`;
  div.innerHTML = who === "bot"
    ? `<span class="chat-face">🎴</span><div class="chat-bubble">${text}</div>`
    : `<div class="chat-bubble">${text}</div>`;
  els.chatLog.appendChild(div);
  els.chatLog.scrollTop = els.chatLog.scrollHeight;
}
function chatControls(html) { els.chatControls.innerHTML = html; }

// 話しかけ方の「型」。デッキの状態に応じて出し分ける
function chatChips() {
  const has = !!chat.result;
  const list = has
    ? ["なんでその構成？", "もっと攻撃的に", "もっと安定させて", "採点して", "別の案も見たい", "これで使う"]
    : ["リザードンex", "水のデッキ", "速いデッキがいい", "おまかせで"];
  return list.map((t) => `<button type="button" class="chat-chip" data-say="${esc(t)}">${esc(t)}</button>`).join("");
}
function chatPrompt() {
  chatControls(
    `<div class="chat-chips">${chatChips()}</div>` +
    `<input id="chat-input" type="text" placeholder="なんでも書いてね（例: もっと硬くして / カスミ入れて / なんで？）" autocomplete="off">` +
    `<div class="chat-btn-row"><button id="chat-send" type="button" class="primary">送信</button>` +
    (chat.result ? `<button id="chat-use" type="button">✅ このデッキを使う</button>` : "") + `</div>`
  );
  const input = $("#chat-input");
  const go = () => { const v = input.value.trim(); if (v) { input.value = ""; chatHandle(v); } };
  $("#chat-send").addEventListener("click", go);
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") go(); });
  for (const b of els.chatControls.querySelectorAll(".chat-chip")) {
    b.addEventListener("click", () => chatHandle(b.dataset.say));
  }
  const use = $("#chat-use");
  if (use) use.addEventListener("click", () => { closeModals(); applySuggested(chat.result); });
  input.focus();
}

function startChatBuild() {
  chat.core = null; chat.result = null; chat.style = null; chat.history = [];
  els.chatLog.innerHTML = "";
  chatSay("こんにちは！一緒にデッキを組もう🎴<br>" +
    "主役にしたいポケモン・使いたいタイプ・こんな戦い方がいい、なんでも書いてね。" +
    "組んだあとも「もっと攻撃的に」「なんでその構成？」みたいに話しかけてくれれば直すよ。");
  chatPrompt();
  els.chatModal.classList.remove("hidden");
}

/* 入力から意図を読む。ポケポケの語彙に寄せた素朴な解釈だが、
 * 「必ず何か1つは実行して返す」ことを優先している (黙って止まらない)。 */
/* 意図判定用の正規化。
 * カード検索用の normalize() は「ひらがな→カタカナ」変換なので、
 * ひらがなで書いた判定パターンをそのまま当てると一致しない。
 * ここでは逆にカタカナ→ひらがなへ寄せて、どちらの入力でも同じ表現で書けるようにする。 */
function chatKana(s) {
  return String(s ?? "").toLowerCase()
    .replace(/[ァ-ヶ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x60));
}

function chatIntent(text) {
  const t = chatKana(text);
  const raw = text;
  if (/^(これでいい|これで使う|使う|けってい|決定|ok|おっけー)/.test(t)) return { kind: "use" };
  if (/なんで|なぜ|どうして|りゆう|理由|せつめい|説明/.test(t)) return { kind: "why" };
  if (/さいてん|採点|てんすう|点数|つよい\?|評価/.test(t)) return { kind: "score" };
  if (/べつ|別|もういちど|もう一度|ほか|他|やりなお/.test(t)) return { kind: "reroll" };
  if (/こうげきてき|攻撃的|つよく|強く|ぱわー|パワー|かち|火力|あたり|一撃/.test(t)) return { kind: "style", style: "power" };
  if (/あんてい|安定|じこ|事故|まわる|回る|ぶれ/.test(t)) return { kind: "style", style: "stable" };
  if (/かたく|硬く|たいきゅう|耐久|かたい|硬い|しぶとく/.test(t)) return { kind: "style", style: "tanky" };
  if (/はやい|速い|はやく|速く|そっこう|速攻|あぐろ/.test(t)) return { kind: "style", style: "fast" };
  const rm = raw.match(/(.+?)\s*(?:を)?\s*(?:ぬいて|抜いて|はずして|外して|けして|消して)/);
  if (rm) return { kind: "remove", name: rm[1].trim() };
  const am = raw.match(/(.+?)\s*(?:を)?\s*(?:いれて|入れて|ついか|追加)/);
  if (am) return { kind: "add", name: am[1].trim() };
  // 「だれが〜できるの？」のようなデッキへの質問。カード名検索に落とさず、
  // 実際のデッキの中身を調べて答える
  const ask = chatAskTopic(t);
  if (ask) return { kind: "ask", topic: ask };
  if (/おまかせ|まかせ|てきとう|適当|なんでも/.test(t)) return { kind: "core", query: "" };
  // 「水のデッキ」「炎タイプで」のように、タイプを言っていると分かる形だけタイプ指定にする
  // (単に「みずポケモン名」を打っただけの入力をタイプ扱いにしないため)
  if (/(?:のでっき|のデッキ|たいぷ|タイプ|でくんで|で組んで|いろ|色)/.test(t)) {
    const ty = chatTypeWord(t);
    if (ty) return { kind: "type", type: ty };
  }
  return { kind: "core", query: raw.trim() };
}
/* デッキへの質問を「何について聞かれたか」に落とす。
 * 疑問符や疑問詞があるのにカード名として検索して「見つからなかった」と返すのが
 * 一番がっかりする挙動なので、まずここで受け止める。 */
function chatAskTopic(t) {
  const isQuestion = /[?？]/.test(t) || /だれ|誰|どれ|どの|なに|何|どこ|いくつ|できる|ある\?|いる\?/.test(t);
  if (!isQuestion) return null;
  const TOPICS = [
    ["status", /じょうたいいじょう|状態異常|どく|毒|ねむり|眠|まひ|麻痺|こんらん|混乱|やけど|火傷|ろっく|ロック/],
    ["accel", /かそく|加速|えねる|エネル|えね|はる|貼る/],
    ["snipe", /そげき|狙撃|べんち|ベンチ/],
    ["tool", /どうぐ|道具/],
    ["draw", /どろー|ドロー|ひく|引く|さーち|サーチ/],
    ["heal", /かいふく|回復/],
    ["gust", /ひきずり|引きずり|よびだ|呼び出/],
    ["ace", /えーす|エース|しゅりょく|主力|いちばんつよ|一番強|かなめ|要|あたっか|アタッカ|うちてん|打点/],
    ["weak", /じゃくてん|弱点|よわ|弱|にがて|苦手|きつい/],
    ["energy", /えねるぎー|エネルギー|いろ|色/],
    ["count", /なんまい|何枚|まいすう|枚数|うちわけ|内訳|こうせい|構成/],
  ];
  for (const [k, re] of TOPICS) if (re.test(t)) return k;
  return "general";
}

/* デッキの中身を実際に調べて答える。効果テキストをそのまま根拠として見せる。 */
function chatAnswer(topic) {
  const r = chat.result;
  if (!r) { chatSay("まだデッキが無いよ。主役にしたいポケモンかタイプを教えて！"); return; }
  const parse = (v) => { const m = String(v ?? "").match(/\d+/); return m ? +m[0] : 0; };
  const entries = Object.keys(r.deck).map((id) => ({
    card: state.cardById.get(id), d: state.details.get(id), n: r.deck[id],
  })).filter((x) => x.card && x.d);
  const pk = entries.filter((x) => x.d.c === "Pokemon" || x.d.c === "ポケモン");

  // ワザ・特性を横断して、条件に合うものを根拠つきで拾う
  const findFx = (re) => {
    const out = [];
    for (const x of pk) {
      for (const a of x.d.a || []) {
        if (re.test(a.e || "")) out.push({ name: x.card.name, kind: "ワザ", label: a.n, dmg: parse(a.d), text: a.e });
      }
      for (const ab of x.d.ab || []) {
        if (re.test(ab.e || "")) out.push({ name: x.card.name, kind: "特性", label: ab.n, text: ab.e });
      }
    }
    return out;
  };
  const show = (list, none, lead) => {
    if (!list.length) { chatSay(none); return; }
    const rows = list.slice(0, 4).map((h) =>
      `・<b>${esc(h.name)}</b> の${h.kind}「${esc(h.label || "")}」` +
      (h.dmg ? `（${h.dmg}打点）` : "") +
      `<br><span class="chat-dim">${esc(jaEffect ? jaEffect(h.text) : h.text)}</span>`).join("<br>");
    chatSay(`${lead}<br><br>${rows}`);
  };

  switch (topic) {
    case "status":
      return show(findFx(/is now (?:Asleep|Poisoned|Confused|Paralyzed|Burned)/i),
        "このデッキに状態異常をかけるカードは入ってないよ。勝ち筋は打点で押すタイプ。" +
        "<br><span class='chat-dim'>入れたいなら「どくバリ入れて」みたいに言ってね。</span>",
        "状態異常をかけられるのはこの子たち:");
    case "accel":
      return show(findFx(/Energy Zone and attach|from your discard pile to|Move (?:a|an|all).{0,24}Energy/i),
        "エネ加速は入ってないよ。エースが重いなら足すと安定するかも。",
        "エネルギーを加速できるのは:");
    case "snipe":
      return show(findFx(/damage to (?:each of )?your opponent'?s Benched|damage to 1 of your opponent'?s Pokémon/i),
        "ベンチを直接叩く手段は入ってないよ。", "ベンチを狙えるのは:");
    case "tool":
      return show(findFx(/Pokémon Tool/i), "どうぐを参照するカードは入ってないよ。", "どうぐが噛み合うのは:");
    case "draw":
      return show(findFx(/draw a card|Draw \d+/i), "特性でのドローは無いから、トレーナーのドローで回すデッキだよ。",
        "特性で引けるのは:");
    case "heal":
      return show(findFx(/[Hh]eal \d+ damage|heal all damage/i), "回復手段は入ってないよ。", "回復できるのは:");
    case "gust":
      return show(findFx(/Switch (?:out|in) 1 of your opponent|your opponent'?s Benched/i),
        "ポケモン側に引きずり出しは無いから、トレーナー(アカギ/ナツメ)の役目だよ。", "引きずり出せるのは:");
    case "ace": {
      let best = null;
      for (const x of pk) for (const a of x.d.a || []) {
        const dm = parse(a.d);
        if (!best || dm > best.dmg) best = { name: x.card.name, dmg: dm, cost: (a.c || []).length, atk: a.n, hp: x.d.h, e: a.e };
      }
      if (!best) { chatSay("アタッカーが見つからなかった…"); return; }
      return chatSay(`エースは <b>${esc(best.name)}</b> だよ。<br>` +
        `ワザ「${esc(best.atk)}」で <b>${best.dmg}打点</b>（${best.cost}エネ / HP${best.hp}）。<br>` +
        `<span class="chat-dim">${esc(best.e ? (jaEffect ? jaEffect(best.e) : best.e) : "追加効果なし")}</span>`);
    }
    case "weak": {
      const w = {};
      for (const x of pk) for (const k of x.d.w || []) w[k.t] = (w[k.t] || 0) + x.n;
      const rows = Object.entries(w).sort((a, b) => b[1] - a[1])
        .map(([t, n]) => `${typeof jaType === "function" ? jaType(t) : t}に弱いのが${n}枚`).join("、");
      return chatSay(`弱点はこう: ${esc(rows || "なし")}。<br>` +
        `<span class="chat-dim">弱点を突かれると+20されるから、同じ弱点が偏っていると苦手なデッキがはっきり出るよ。</span>`);
    }
    case "energy": {
      const es = r.energies.map((t) => (typeof jaType === "function" ? jaType(t) : t)).join("・");
      return chatSay(`エネルギーは <b>${esc(es)}</b>。<br>` +
        `<span class="chat-dim">ポケポケは毎ターン登録した色から1個ランダムでもらえる。` +
        `色を増やすほど欲しい色が来ない番が増えるから、この構成は${r.energies.length === 1 ? "単色で事故りにくい形" : "2色ぶんのブレを見込んだ形"}だよ。</span>`);
    }
    case "count": {
      const { pk: pkStr, tr } = chatDeckRows(r.deck);
      const pkN = pk.reduce((a, x) => a + x.n, 0);
      return chatSay(`ポケモン <b>${pkN}枚</b> / トレーナー <b>${20 - pkN}枚</b> だよ。<br><br>` +
        `<b>ポケモン</b>: ${esc(pkStr)}<br><b>トレーナー</b>: ${esc(tr)}`);
    }
    default:
      return chatSay(
        `そのデッキについてなら、こんなことに答えられるよ:<br>` +
        `<span class="chat-dim">「だれが状態異常かけられる？」「エースは？」「弱点は？」「エネルギーは？」` +
        `「何枚ずつ入ってる？」「なんでその構成？」</span><br><br>` +
        `直したいときは「もっと硬くして」「カスミ入れて」「ヒトカゲ抜いて」みたいに言ってね。`);
  }
}

function chatTypeWord(t) {
  // ひらがな・漢字の両方で拾う (chatKana 済みの文字列を渡す前提)
  const M = [
    [/くさ|草/, "Grass"], [/ほのお|炎|ほのう|火/, "Fire"], [/みず|水/, "Water"],
    [/かみなり|でんき|雷|電/, "Lightning"], [/えすぱー|ちょう|超/, "Psychic"],
    [/かくとう|とう|闘/, "Fighting"], [/あく|悪/, "Darkness"],
    [/はがね|鋼/, "Metal"], [/どらごん|竜|ドラゴン/, "Dragon"],
  ];
  for (const [re, v] of M) if (re.test(t)) return v;
  return null;
}

// スタイルごとの重み。数値の根拠は docs/deck-theory.md の実験に準拠
function chatWeights(style) {
  const W = SUGGEST_WEIGHTS;
  if (style === "power") return { ...W, maxStage2Lines: 2, trainerSlots: 9, exB: W.exB + 15 };
  if (style === "stable") return { ...W, maxEvoLines: 2, maxStage2Lines: 1, trainerSlots: 12 };
  if (style === "tanky") return { ...W, hpW: W.hpW * 2, costP: W.costP - 8 };
  if (style === "fast") return { ...W, stageP: W.stageP * 2.5, costP: W.costP + 12, opener: true };
  return W;
}

function chatHandle(text) {
  chatSay(esc(text), "user");
  const it = chatIntent(text);
  chat.history.push(it.kind);
  switch (it.kind) {
    case "use":
      if (!chat.result) { chatSay("まだデッキが無いよ。主役にしたいポケモンかタイプを教えて！"); break; }
      closeModals(); applySuggested(chat.result); return;
    case "why": chatWhy(); break;
    case "score": chatScore(); break;
    case "reroll": chatBuild({ reroll: true }); break;
    case "style":
      chat.style = it.style;
      chatSay({ power: "パワー寄りに振り直すね💪", stable: "安定寄りに組み直すよ🎯",
        tanky: "耐久寄りにしてみる🛡", fast: "速さ優先で組むね⚡" }[it.style]);
      chatBuild({}); break;
    case "type": chatSay(`${typeof jaType === "function" ? jaType(it.type) : it.type}タイプで組んでみるね！`); chatBuild({ type: it.type }); break;
    case "ask": chatAnswer(it.topic); break;
    case "add": chatEdit(it.name, +2); break;
    case "remove": chatEdit(it.name, -2); break;
    default: chatBuild({ query: it.query }); break;
  }
  chatPrompt();
}

// 名前でカードを引く (ひらがな検索に対応)
function chatFindCard(query, pokemonOnly) {
  const nq = normalize(query);
  if (!nq) return null;
  const pool = state.allCards.filter((c) => {
    const d = state.details.get(c.id);
    if (!d) return false;
    const isPk = d.c === "Pokemon" || d.c === "ポケモン";
    return pokemonOnly ? isPk : true;
  });
  return pool.find((c) => normalize(c.name) === nq) ||
    pool.find((c) => normalize(c.name).includes(nq) || normalize(c.enName || "").includes(nq)) || null;
}

function chatBuild({ query, type, reroll } = {}) {
  let coreDeck = {};
  if (query) {
    const hit = chatFindCard(query, true);
    if (!hit) {
      // カード名として解釈できなかった = 質問や雑談の可能性が高い。
      // 「見つからなかった」で終わらせず、できることを具体的に案内する
      chatSay(`「${esc(query)}」はカード名としては見つからなかった…<br>` +
        (chat.result
          ? `デッキのことなら「だれが状態異常かけられる？」「エースは？」「弱点は？」みたいに聞いてくれれば答えるよ。<br>` +
            `直すなら「もっと硬くして」「カスミ入れて」もOK！`
          : `カード名の一部でもいいし、「水のデッキ」「速いデッキがいい」「おまかせ」でも組めるよ！`));
      return;
    }
    chat.core = hit;
  } else if (type) {
    // そのタイプで一番スコアの高いexを主役にする
    const cands = state.allCards.filter((c) => {
      const d = state.details.get(c.id);
      return d && d.c === "Pokemon" && (d.t || []).includes(type) && /ex$/.test(c.name);
    });
    chat.core = cands[Math.floor(Math.random() * cands.length)] || null;
  } else if (reroll) {
    chat.core = null; // 主役ごと選び直す
  }
  if (chat.core) coreDeck = { [chat.core.id]: 2 };

  const r = suggestDeck({
    cards: state.allCards, details: state.details, deck: coreDeck,
    weights: chatWeights(chat.style),
  });
  if (r.error) { chatSay(`うまく組めなかった…（${esc(r.error)}）別のポケモンで試してみて！`); return; }
  chat.result = r;
  chatDescribe(r);
}

// 組んだデッキを「勝ち筋 → 主力 → 支える札」の順に説明する。
// 一覧は必ず「今のデッキの中身」から作る (組んだ直後の計画を再利用すると、
// あとから手で足し引きした結果とズレて、入れたはずのカードが説明に出てこない)
function chatDeckRows(deck) {
  const pk = [], tr = [];
  for (const [id, n] of Object.entries(deck)) {
    const c = state.cardById.get(id); const d = state.details.get(id);
    if (!c || !d) continue;
    (d.c === "Pokemon" || d.c === "ポケモン" ? pk : tr).push([`${n}×${c.name}`, n]);
  }
  const fmt = (a) => a.sort((x, y) => y[1] - x[1]).map((x) => x[0]).join("、");
  return { pk: fmt(pk), tr: fmt(tr) };
}

function chatDescribe(r) {
  const wc = r.winCondition;
  const { pk, tr } = chatDeckRows(r.deck);
  const total = Object.values(r.deck).reduce((a, b) => a + b, 0);
  chatSay(
    `「<b>${esc(r.name)}</b>」が組めたよ！${total !== DECK_SIZE ? `<b>（${total}枚）</b>` : ""}<br>` +
    `勝ち筋は <b>【${esc(wc.label)}】</b> — ${esc(wc.plan)}<br><br>` +
    `<b>ポケモン</b>: ${esc(pk)}<br><b>トレーナー</b>: ${esc(tr)}<br>` +
    `<span class="chat-dim">エネルギーは ${esc(r.energies.map((t) => (typeof jaType === "function" ? jaType(t) : t)).join("・"))}。` +
    `「なんでその構成？」で理由を話すよ。</span>`
  );
}

// トレーナー選択の理由を、エンジンが実際に使った根拠そのままで説明する
function chatWhy() {
  const r = chat.result;
  if (!r) { chatSay("まだデッキが無いよ。主役にしたいポケモンかタイプを教えて！"); return; }
  const lines = (r.trainerPlan || []).map((t) =>
    `・<b>${esc(t.card.name)}</b>${t.count > 1 ? `×${t.count}` : ""}` +
    `<span class="chat-role">${esc(t.roleLabel)}</span><br><span class="chat-dim">${esc(t.reason)}</span>`);
  chatSay(
    `勝ち筋の <b>【${esc(r.winCondition.label)}】</b> を通すために、こう選んだよ:<br><br>` +
    (lines.join("<br>") || "定番のトレーナーを入れてあるよ。") +
    `<br><br><span class="chat-dim">打点補正やHP補正は「確定数が何%の相手で変わるか」で採点してる。` +
    `変えたいところがあれば「もっと硬くして」みたいに言ってね。</span>`
  );
}

function chatScore() {
  const r = chat.result;
  if (!r) { chatSay("まだデッキが無いよ。まず主役を教えて！"); return; }
  if (typeof analyzeDeck !== "function") { chatSay("採点機能が読み込めてないみたい…"); return; }
  const a = analyzeDeck({
    cards: state.allCards, details: state.details, deck: r.deck,
    energies: r.energies.map((t) => t), cardById: state.cardById,
  });
  const grade = a.score >= 85 ? "S" : a.score >= 72 ? "A" : a.score >= 58 ? "B" : a.score >= 45 ? "C" : "D";
  chatSay(
    `採点は <b>${a.score}点（${grade}）</b>だよ。<br>` +
    `<span class="chat-dim">エース ${a.breakdown.ace} ・ 安定 ${a.breakdown.consistency} ・ ` +
    `メタ ${a.breakdown.meta} ・ カーブ ${a.breakdown.curve}</span>` +
    (a.suggestions[0] ? `<br><br>伸ばしどころ: ${esc(a.suggestions[0])}` : "")
  );
}

// 「〇〇入れて / 〇〇抜いて」に応える。20枚を保ちつつ、指定された札は必ず残す
function chatEdit(name, delta) {
  const r = chat.result;
  if (!r) { chatSay("先にデッキを組もう！主役にしたいポケモンを教えて。"); return; }
  const card = chatFindCard(name, false);
  if (!card) { chatSay(`「${esc(name)}」が見つからなかった…名前の一部でもいいよ！`); return; }
  const deck = { ...r.deck };
  const isPk = (id) => { const d = state.details.get(id); return d && (d.c === "Pokemon" || d.c === "ポケモン"); };

  if (delta < 0) {
    if (!deck[card.id]) { chatSay(`${esc(card.name)}はもともと入ってないよ。`); return; }
    delete deck[card.id];
    chatSay(`${esc(card.name)}を抜いたよ。空いた枠は自動で埋め直すね。`);
  } else {
    if (deck[card.id] >= 2) { chatSay(`${esc(card.name)}はもう2枚入ってるよ（同名は2枚まで）。`); return; }
    deck[card.id] = (deck[card.id] || 0) + 2 - (deck[card.id] || 0);
    chatSay(`${esc(card.name)}を入れるね。`);
  }

  // 20枚を超えたら、評価の低いトレーナーから削って調整する
  // (ポケモンを削ると進化ラインが壊れるので、まずトレーナーから)
  let total = () => Object.values(deck).reduce((a, b) => a + b, 0);
  const plan = [...(r.trainerPlan || [])].reverse();
  while (total() > DECK_SIZE) {
    const victim = plan.find((t) => deck[t.card.id] && t.card.id !== card.id) ||
      Object.keys(deck).find((id) => !isPk(id) && id !== card.id);
    const vid = victim ? (victim.card ? victim.card.id : victim) : null;
    if (!vid) break;
    deck[vid] -= 1;
    if (!deck[vid]) delete deck[vid];
  }
  // 足りなければ同じ評価器で埋める (suggestDeck は「核は5種類まで」なので使わない)
  if (total() < DECK_SIZE && typeof buildTrainerPackage === "function") {
    const pkg = buildTrainerPackage({
      cards: state.allCards, details: state.details, deck, energies: r.energies,
      cardById: state.cardById, winCondition: r.winCondition,
      slots: DECK_SIZE - total(),
      exclude: new Set(Object.keys(deck).map((id) => state.cardById.get(id)?.name).filter(Boolean)),
    });
    for (const pick of pkg.picks) {
      if (total() >= DECK_SIZE) break;
      deck[pick.card.id] = Math.min(2, (deck[pick.card.id] || 0) + pick.count);
    }
  }
  chat.result = { ...r, deck };
  chatDescribe(chat.result);

  // 進化元を失った進化ポケモンが残っていないか見て、残っていたら必ず伝える
  // (黙って壊れたデッキを渡さない。ポケポケは進化元が場にいないと進化できない)
  const names = new Set(Object.keys(deck).map((id) => state.cardById.get(id)?.name));
  const orphans = Object.keys(deck).map((id) => {
    const d = state.details.get(id);
    const parent = d && d.dv ? (typeof jaCardName === "function" ? jaCardName(d.dv) : d.dv) : null;
    return parent && !names.has(parent) ? `${state.cardById.get(id)?.name}（${parent}が必要）` : null;
  }).filter(Boolean);
  if (orphans.length) {
    chatSay(`⚠️ ただし進化元がいなくなっちゃった: ${esc(orphans.join("、"))}<br>` +
      `<span class="chat-dim">このままだと進化できないよ。進化元を戻すか、その進化ポケモンも抜くのがおすすめ。</span>`);
  }
}

// ---------- デッキ解説・採点 (10ステップの思考フロー) ----------
function runExplain() {
  if (deckTotal() !== DECK_SIZE) {
    toast(`デッキを${DECK_SIZE}枚そろえてから解説できます`);
    return;
  }
  if (typeof analyzeDeck !== "function") return;
  const energies = state.energies.map((id) => ENERGY_ID_TO_TYPE[id]).filter(Boolean);
  const a = analyzeDeck({
    cards: state.allCards, details: state.details, deck: state.deck,
    energies, cardById: state.cardById,
    meta: (typeof SUGGEST_WEIGHTS !== "undefined") ? SUGGEST_WEIGHTS.meta : null,
  });
  const grade = a.score >= 85 ? "S" : a.score >= 72 ? "A" : a.score >= 58 ? "B" : a.score >= 45 ? "C" : "D";
  const rows = [];
  const step = (n, title, body) =>
    `<div class="ex-step"><div class="ex-step-h"><span class="ex-num">${n}</span>${esc(title)}</div><div class="ex-step-b">${body}</div></div>`;

  rows.push(
    `<div class="ex-score"><span class="ex-grade rank-${grade}">${grade}</span>` +
    `<span class="ex-num-big">${a.score}<small>/100</small></span>` +
    `<div class="ex-bd">エース ${a.breakdown.ace} ・ 安定 ${a.breakdown.consistency} ・ メタ ${a.breakdown.meta} ・ カーブ ${a.breakdown.curve}</div></div>`
  );
  rows.push(step("1", "勝ち筋", `<b>${esc(a.win.label)}</b> — ${esc(a.win.desc)}`));
  if (a.ace) rows.push(step("2", "エース分析",
    `${esc(a.ace.name)}（${esc(a.ace.atkName || "")} <b>${a.ace.dmg}</b>打点 / ${a.ace.cost}エネ / HP${a.ace.hp}${a.ace.ex ? " / ex" : ""}）` +
    `<br><span class="ex-dim">確定数 ${a.ace.koLines}帯を一撃圏内（HP50〜190の何段を超えるか）</span>`));
  const sup = Object.entries(a.support).map(([r, list]) => `<b>${esc(r)}</b>: ${esc(list.join("・"))}`).join("<br>");
  rows.push(step("3", "必要サポート", sup || "—"));
  rows.push(step("4", "シナジー", a.synergy.map(esc).join("<br>") || "特筆なし"));
  rows.push(step("5", "20枠の配分", `ポケモン <b>${a.slots.pk}</b> / トレーナー <b>${a.slots.tr}</b>（たね${a.slots.basics}・2進化ライン${a.slots.stage2Lines}本）`));
  rows.push(step("6", "初手・中盤・終盤",
    `<b>初手</b>: ${esc(a.gamePlan.opener)}<br><b>中盤</b>: ${esc(a.gamePlan.mid)}<br><b>終盤</b>: ${esc(a.gamePlan.finisher)}`));
  rows.push(step("7", "事故率・再現性", `<b>${a.consistency.score}</b>/100 <span class="ex-dim">（${esc(a.consistency.factors.join("、"))}）</span>`));
  rows.push(step("8", "メタ相性", `<b>${a.meta.score}</b>/100<br>${a.meta.notes.map(esc).join("<br>")}`));
  rows.push(step("9", "不要カード候補", a.cuts.map(esc).join("<br>")));
  rows.push(step("10", "改善案", `<ul class="ex-sug">${a.suggestions.map((s) => `<li>${esc(s)}</li>`).join("")}</ul>`));

  els.explainBody.innerHTML = rows.join("");
  els.explainModal.classList.remove("hidden");
}

// ---------- デッキ診断 (模擬対戦) ----------
const ENERGY_ID_TO_TYPE = {
  grass: "Grass", fire: "Fire", water: "Water", lightning: "Lightning",
  psychic: "Psychic", fighting: "Fighting", darkness: "Darkness", metal: "Metal",
};

let diagRefs = null; // 対戦相手の代表デッキ (初回のみ構築)

function getDiagRefs() {
  if (diagRefs) return diagRefs;
  diagRefs = [];
  for (const coreName of ["ギャラドスex", "ダークライex", "ミュウツーex", "リザードンex"]) {
    const card = state.allCards.find((c) => c.name === coreName);
    if (!card) continue;
    const r = suggestDeck({ cards: state.allCards, details: state.details, deck: { [card.id]: 2 } });
    if (r.error) continue;
    diagRefs.push({
      name: `${coreName}デッキ`,
      sim: buildSimDeck({ deck: r.deck, energies: r.energies, cardById: state.cardById, details: state.details }),
    });
  }
  // 小さいデータセットでも動くように、見つからなければおまかせ構築で代替
  while (diagRefs.length < 2) {
    const r = suggestDeck({ cards: state.allCards, details: state.details, deck: {} });
    if (r.error) break;
    diagRefs.push({
      name: r.name,
      sim: buildSimDeck({ deck: r.deck, energies: r.energies, cardById: state.cardById, details: state.details }),
    });
  }
  return diagRefs;
}

function runDiagnosis() {
  if (deckTotal() !== DECK_SIZE) {
    toast(`デッキを${DECK_SIZE}枚そろえてから診断してください`);
    return;
  }
  if (!state.energies.length) {
    toast("エネルギータイプを選んでから診断してください");
    return;
  }
  if (state.details.size < state.allCards.length * 0.5) {
    toast("カードデータの取り込み中です。少し待ってから試してください");
    return;
  }
  const refs = getDiagRefs();
  if (!refs.length) {
    toast("診断用の対戦相手を用意できませんでした");
    return;
  }

  const energies = state.energies.map((id) => ENERGY_ID_TO_TYPE[id]).filter(Boolean);
  const mySim = buildSimDeck({
    deck: state.deck, energies, cardById: state.cardById, details: state.details,
  });

  const rows = [];
  let sum = 0;
  for (const ref of refs) {
    const wr = simulateMatch(mySim, ref.sim, 300, Date.now() % 100000);
    sum += wr;
    rows.push({ name: ref.name, wr });
  }
  const avg = sum / refs.length;
  const rank = avg >= 0.65 ? "S" : avg >= 0.55 ? "A" : avg >= 0.45 ? "B" : avg >= 0.35 ? "C" : "D";

  els.diagResults.innerHTML =
    `<div class="diag-head"><span class="diag-rank rank-${rank}">${rank}</span>` +
    `<span class="diag-avg">平均勝率 <b>${Math.round(avg * 100)}%</b></span></div>` +
    rows.map((r) =>
      `<div class="diag-row"><span class="diag-name">vs ${esc(r.name)}</span>` +
      `<div class="diag-bar"><div style="width:${Math.round(r.wr * 100)}%"></div></div>` +
      `<b class="diag-pct">${Math.round(r.wr * 100)}%</b></div>`
    ).join("");
  els.diagModal.classList.remove("hidden");
}

// ---------- 保存・読み込み ----------
function loadSavedDecks() {
  try {
    state.savedDecks = JSON.parse(localStorage.getItem(DECKS_KEY) || "[]");
  } catch {
    state.savedDecks = [];
  }
  renderSavedDecks();
}

function persistSavedDecks() {
  localStorage.setItem(DECKS_KEY, JSON.stringify(state.savedDecks));
  renderSavedDecks();
}

function saveDeck() {
  const total = deckTotal();
  if (total === 0) { toast("デッキが空です"); return; }
  const name = (els.deckName.value.trim() || `デッキ ${new Date().toLocaleDateString("ja-JP")}`);
  state.deckName = name;

  const existing = state.savedDecks.findIndex((d) => d.name === name);
  const record = {
    name,
    cards: { ...state.deck },
    energies: [...state.energies],
    updated: Date.now(),
  };
  if (existing >= 0) {
    if (!confirm(`「${name}」を上書き保存しますか？`)) return;
    state.savedDecks[existing] = record;
  } else {
    state.savedDecks.unshift(record);
  }
  persistSavedDecks();
  persistCurrent();
  toast(`「${name}」を保存しました (${total}枚)`);
}

function renderSavedDecks() {
  els.savedDeckList.innerHTML = "";
  if (!state.savedDecks.length) {
    els.savedDeckList.innerHTML = '<div class="hint" style="color:var(--text-dim);font-size:12px">まだ保存されたデッキはありません</div>';
    return;
  }
  for (const deck of state.savedDecks) {
    const row = document.createElement("div");
    row.className = "saved-deck";

    const total = Object.values(deck.cards).reduce((a, b) => a + b, 0);
    const nameEl = document.createElement("div");
    nameEl.className = "sd-name";
    nameEl.innerHTML = `${esc(deck.name)}<br><span class="sd-meta">${total}枚 · ${new Date(deck.updated).toLocaleDateString("ja-JP")}</span>`;
    nameEl.title = "クリックで読み込み";
    nameEl.addEventListener("click", () => {
      state.deck = { ...deck.cards };
      state.deckName = deck.name;
      state.energies = [...(deck.energies || [])];
      els.deckName.value = deck.name;
      onDeckChanged();
      toast(`「${deck.name}」を読み込みました`);
    });

    const delBtn = document.createElement("button");
    delBtn.className = "danger";
    delBtn.textContent = "削除";
    delBtn.addEventListener("click", () => {
      if (!confirm(`「${deck.name}」を削除しますか？`)) return;
      state.savedDecks = state.savedDecks.filter((d) => d !== deck);
      persistSavedDecks();
    });

    row.append(nameEl, delBtn);
    els.savedDeckList.appendChild(row);
  }
}

// ---------- エクスポート / インポート ----------
function exportDeck() {
  if (deckTotal() === 0) { toast("デッキが空です"); return; }
  const lines = [];
  if (els.deckName.value.trim()) lines.push(`デッキ名: ${els.deckName.value.trim()}`);
  if (state.energies.length) {
    const labels = state.energies
      .map((id) => ENERGY_TYPES.find((e) => e.id === id)?.label)
      .filter(Boolean);
    lines.push(`エネルギー: ${labels.join("・")}`);
  }
  const entries = Object.entries(state.deck).sort(([a], [b]) => a.localeCompare(b));
  for (const [id, count] of entries) {
    const card = state.cardById.get(id);
    lines.push(`${count} ${card?.name || "?"} (${id})`);
  }
  const text = lines.join("\n");
  navigator.clipboard?.writeText(text).then(
    () => toast("デッキテキストをクリップボードにコピーしました"),
    () => prompt("コピーしてください:", text)
  );
}

function importDeckText(text) {
  const deck = {};
  let name = "";
  const energies = [];
  let imported = 0;
  let failed = 0;

  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;

    const nameMatch = line.match(/^デッキ名[:：]\s*(.+)$/);
    if (nameMatch) { name = nameMatch[1]; continue; }

    const energyMatch = line.match(/^エネルギー[:：]\s*(.+)$/);
    if (energyMatch) {
      for (const label of energyMatch[1].split(/[・,、\s]+/)) {
        const e = ENERGY_TYPES.find((x) => x.label === label);
        if (e && !energies.includes(e.id) && energies.length < 3) energies.push(e.id);
      }
      continue;
    }

    const m = line.match(/^(\d+)\s*[x×]?\s+(.+?)\s*\(([A-Za-z0-9-]+)\)\s*$/);
    if (!m) { failed++; continue; }
    const count = Math.min(parseInt(m[1], 10) || 1, MAX_PER_NAME);
    const id = m[3];
    if (state.cardById.has(id)) {
      deck[id] = count;
      imported += count;
    } else {
      failed++;
    }
  }

  if (imported === 0) {
    toast("読み込めるカードがありませんでした");
    return;
  }
  state.deck = deck;
  state.deckName = name;
  state.energies = energies;
  els.deckName.value = name;
  onDeckChanged();
  toast(`${imported}枚読み込みました${failed ? `（${failed}行スキップ）` : ""}`);
}

// ---------- カード詳細モーダル ----------
function openCardModal(cardId) {
  const card = state.cardById.get(cardId);
  if (!card) return;
  state.modalCardId = cardId;

  els.modalImg.src = largeUrl(card) || "";
  els.modalImg.alt = card.name;
  els.modalInfo.innerHTML =
    `<div class="mi-name">${esc(card.name)}</div>` +
    `<div class="mi-dim">${esc(card.setName)} · ${esc(card.id)}</div>`;
  els.cardModal.classList.remove("hidden");

  const cached = state.detailCache.get(cardId);
  if (cached) renderModalInfo(cached);
  else fetchDetail(cardId);
}

function renderModalInfo(detail) {
  const card = state.cardById.get(state.modalCardId);
  if (!card || !detail) return;
  const parts = [
    `<div class="mi-name">${esc(card.name)}</div>`,
    `<div class="mi-dim">${esc(card.setName)} · ${esc(card.id)}</div>`,
  ];
  const info = [];
  if (detail.trainerType) info.push(TRAINER_TYPE_LABELS[detail.trainerType] || detail.trainerType);
  else if (detail.category) info.push(CATEGORY_LABELS[detail.category] || detail.category);
  if (detail.hp) info.push(`HP ${detail.hp}`);
  if (detail.types?.length) info.push(detail.types.map(jaType).join("/"));
  if (detail.stage) info.push(jaStage(detail.stage));
  if (detail.rarity) info.push(jaRarity(detail.rarity));
  if (info.length) parts.push(`<div>${esc(info.join(" · "))}</div>`);

  // トレーナーカードの効果
  if (detail.effect) {
    parts.push(`<div class="mi-move"><div class="mi-effect">${esc(jaEffect(detail.effect))}</div></div>`);
  }

  // 特性・わざ
  for (const ab of detail.abilities || []) {
    parts.push(
      `<div class="mi-move"><div class="mi-move-head"><span class="mi-tag">特性</span><b>${esc(ab.name || "")}</b></div>` +
      (ab.effect ? `<div class="mi-effect">${esc(jaEffect(ab.effect))}</div>` : "") + `</div>`
    );
  }
  for (const atk of detail.attacks || []) {
    const cost = (atk.cost || []).map(costIcon).join("");
    parts.push(
      `<div class="mi-move"><div class="mi-move-head"><span class="mi-cost">${esc(cost)}</span><b>${esc(atk.name || "")}</b>` +
      `<span class="mi-damage">${esc(atk.damage ?? "")}</span></div>` +
      (atk.effect ? `<div class="mi-effect">${esc(jaEffect(atk.effect))}</div>` : "") + `</div>`
    );
  }

  const foot = [];
  if (detail.weaknesses?.length) {
    foot.push(`弱点: ${detail.weaknesses.map((w) => jaType(w.type) + (w.value || "")).join(", ")}`);
  }
  if (detail.retreat != null) foot.push(`にげる: ${detail.retreat}`);
  if (foot.length) parts.push(`<div class="mi-dim">${esc(foot.join(" · "))}</div>`);

  els.modalInfo.innerHTML = parts.join("");
}

// わざのエネルギーコスト表示用アイコン (英語/日本語どちらのタイプ名にも対応)
const COST_ICONS = {
  Grass: "🌿", Fire: "🔥", Water: "💧", Lightning: "⚡", Psychic: "🔮",
  Fighting: "✊", Darkness: "🌙", Metal: "⚙️", Colorless: "⚪", Dragon: "🐉",
  "草": "🌿", "炎": "🔥", "水": "💧", "雷": "⚡", "超": "🔮",
  "闘": "✊", "悪": "🌙", "鋼": "⚙️", "無色": "⚪", "ドラゴン": "🐉",
};
const costIcon = (t) => COST_ICONS[t] || "⚪";

function closeModals() {
  els.cardModal.classList.add("hidden");
  els.importModal.classList.add("hidden");
  els.diagModal.classList.add("hidden");
  els.explainModal.classList.add("hidden");
  els.choiceModal.classList.add("hidden");
  els.supportModal.classList.add("hidden");
  els.chatModal.classList.add("hidden");
  els.metaModal.classList.add("hidden");
  state.modalCardId = null;
}

// ---------- イベント登録 ----------
function bindEvents() {
  let searchTimer;
  els.search.addEventListener("input", () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(applyFilter, 150);
  });
  els.setFilter.addEventListener("change", applyFilter);
  for (const select of [els.categoryFilter, els.stageFilter, els.rarityFilter, els.sortFilter]) {
    select.addEventListener("change", applyFilter);
  }
  els.reloadBtn.addEventListener("click", () => loadCards(true));

  els.deckName.addEventListener("input", () => {
    state.deckName = els.deckName.value;
    persistCurrent();
  });

  // 構築・診断はメインスレッドを1秒前後ブロックする (スマホだと体感で固まる)。
  // 押した瞬間に「考え中…」を描いてから走らせないと、押したことすら見えず
  // 「ボタンが反応しない」と受け取られてしまう
  onHeavyClick($("#suggest-deck"), "✨ 考え中…", runSuggest);
  onHeavyClick($("#diag-deck"), "🥊 対戦中…", runDiagnosis);
  onHeavyClick($("#explain-deck"), "🧠 採点中…", runExplain);
  onHeavyClick($("#recommend-support"), "💡 考え中…", runRecommendSupport);
  onHeavyClick($("#chat-build"), "🗨️ 準備中…", startChatBuild);
  $("#choice-power").addEventListener("click", () => { closeModals(); applySuggested(state._choicePower); });
  $("#choice-lean").addEventListener("click", () => { closeModals(); applySuggested(state._choiceLean); });
  onHeavyClick($("#meta-decks-btn"), "🔥 準備中…", openMetaDecks);
  $("#save-deck").addEventListener("click", saveDeck);
  $("#export-deck").addEventListener("click", exportDeck);
  $("#clear-deck").addEventListener("click", clearDeck);
  $("#import-deck").addEventListener("click", () => {
    els.importText.value = "";
    els.importModal.classList.remove("hidden");
  });
  $("#import-confirm").addEventListener("click", () => {
    importDeckText(els.importText.value);
    closeModals();
  });

  els.modalAdd.addEventListener("click", () => {
    if (state.modalCardId) addToDeck(state.modalCardId);
  });

  for (const closeBtn of document.querySelectorAll(".modal-close")) {
    closeBtn.addEventListener("click", closeModals);
  }
  for (const backdrop of document.querySelectorAll(".modal-backdrop")) {
    backdrop.addEventListener("click", closeModals);
  }
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModals();
  });

  // モバイル: デッキパネル開閉
  els.deckToggle.addEventListener("click", () => els.deckPanel.classList.toggle("open"));
  els.deckClose.addEventListener("click", () => els.deckPanel.classList.remove("open"));
}

// ---------- 起動 ----------
function init() {
  bindEvents();
  restoreCurrent();
  loadSavedDecks();
  renderDeck();
  loadCards();
}

init();
