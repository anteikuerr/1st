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

function thumbUrl(card) {
  if (state.localData) return `data/img/${card.id}.webp`;
  return card.image ? `${card.image}/low.webp` : null;
}
function largeUrl(card) {
  if (state.localData) {
    return state.localData.high ? `data/img_hi/${card.id}.webp` : `data/img/${card.id}.webp`;
  }
  return card.image ? `${card.image}/high.webp` : null;
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
  if (sort === "hp") {
    state.filtered.sort((a, b) => (state.details.get(b.id)?.h || 0) - (state.details.get(a.id)?.h || 0));
  } else if (sort === "name") {
    state.filtered.sort((a, b) => a.name.localeCompare(b.name, "ja"));
  }

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
  };
}

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

function runSuggest() {
  if (state.details.size < state.allCards.length * 0.5) {
    toast("カードデータの取り込み中です。少し待ってから試してください");
    return;
  }
  const result = suggestDeck({
    cards: state.allCards,
    details: state.details,
    deck: state.deck,
  });
  if (result.error) {
    toast(result.error, 3000);
    return;
  }
  state.deck = result.deck;
  state.energies = [...new Set(result.energies.map((t) => TYPE_TO_ENERGY_ID[t]).filter(Boolean))].slice(0, 3);
  state.deckName = result.name;
  els.deckName.value = result.name;
  for (const id of Object.keys(result.deck)) fetchDetail(id);
  onDeckChanged();
  toast(`「${result.name}」を提案しました ✨ 気に入らないカードは入れ替えてOK`, 3200);
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
  if (detail.category) info.push(CATEGORY_LABELS[detail.category] || detail.category);
  if (detail.hp) info.push(`HP ${detail.hp}`);
  if (detail.types?.length) info.push(detail.types.map(jaType).join("/"));
  if (detail.stage) info.push(jaStage(detail.stage));
  if (detail.rarity) info.push(jaRarity(detail.rarity));
  if (info.length) parts.push(`<div>${esc(info.join(" · "))}</div>`);

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

  $("#suggest-deck").addEventListener("click", runSuggest);
  $("#diag-deck").addEventListener("click", runDiagnosis);
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
