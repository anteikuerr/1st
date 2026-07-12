/* ポケポケ デッキビルダー
 * カードデータ・画像: TCGdex API (https://tcgdex.dev) の Pokémon TCG Pocket シリーズを利用
 * ルール: デッキは20枚ちょうど / 同名カードは2枚まで / エネルギーはタイプ選択(最大3)
 */

const API_BASE = "https://api.tcgdex.net/v2";
const SERIES_ID = "tcgp";
const CACHE_KEY = "ppdb.cards.v3";
const DETAILS_KEY = "ppdb.details.v1";
const DECKS_KEY = "ppdb.decks.v1";
const CURRENT_KEY = "ppdb.current.v1";
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24時間

const DECK_SIZE = 20;
const MAX_PER_NAME = 2;
const GRID_CHUNK = 60;

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
  renderedCount: 0,
  deck: {},              // cardId -> count
  deckName: "",
  energies: [],          // energy type ids (max 3)
  savedDecks: [],
  details: new Map(),    // cardId -> { c: category, t: types[], h: hp, s: stage, r: rarity }
  detailCache: new Map(),// cardId -> フル詳細 (モーダル用)
  baseStatus: "",
  modalCardId: null,
};

// ---------- DOM ----------
const $ = (sel) => document.querySelector(sel);
const els = {
  search: $("#search"),
  setFilter: $("#set-filter"),
  categoryFilter: $("#category-filter"),
  typeFilter: $("#type-filter"),
  stageFilter: $("#stage-filter"),
  rarityFilter: $("#rarity-filter"),
  reloadBtn: $("#reload-btn"),
  status: $("#status"),
  grid: $("#card-grid"),
  sentinel: $("#grid-sentinel"),
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
  return card.image ? `${card.image}/low.webp` : null;
}
function largeUrl(card) {
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
// タイプ・進化・レアリティ等での絞り込み用に、全カードの詳細を
// バックグラウンドで少しずつ取得して localStorage に永続キャッシュする
async function hydrateDetails() {
  let cache = {};
  try { cache = JSON.parse(localStorage.getItem(DETAILS_KEY) || "{}"); } catch { /* ignore */ }
  if (cache.lang !== state.lang || !cache.cards) cache = { lang: state.lang, cards: {} };

  state.details = new Map(Object.entries(cache.cards));

  const queue = state.allCards.map((c) => c.id).filter((id) => !state.details.has(id));
  const total = queue.length;
  refreshDetailFilterOptions();

  if (!total) return;

  let done = 0;
  const persist = () => {
    try { localStorage.setItem(DETAILS_KEY, JSON.stringify(cache)); } catch { /* ignore */ }
  };
  const workers = Array.from({ length: 8 }, async () => {
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
  return !!(els.categoryFilter.value || els.typeFilter.value ||
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
  fillSelect(els.categoryFilter, "カテゴリ", [...categories.entries()]);
  fillSelect(els.typeFilter, "タイプ", [...types].sort().map((v) => [v, v]));
  fillSelect(els.stageFilter, "進化", [...stages].sort().map((v) => [v, v]));
  fillSelect(els.rarityFilter, "レアリティ", [...rarities].sort().map((v) => [v, v]));
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
  const type = els.typeFilter.value;
  const stage = els.stageFilter.value;
  const rarity = els.rarityFilter.value;
  const useDetail = !!(cat || type || stage || rarity);

  state.filtered = state.allCards.filter((c) => {
    if (setId && c.setId !== setId) return false;
    if (q && !normalize(c.name).includes(q) && !normalize(c.id).includes(q)) return false;
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
  state.renderedCount = 0;
  els.grid.innerHTML = "";
  renderMoreCards();
}

function renderMoreCards() {
  const end = Math.min(state.renderedCount + GRID_CHUNK, state.filtered.length);
  const frag = document.createDocumentFragment();
  for (let i = state.renderedCount; i < end; i++) {
    frag.appendChild(makeCardCell(state.filtered[i]));
  }
  els.grid.appendChild(frag);
  state.renderedCount = end;
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

async function fetchDetail(cardId) {
  if (state.detailCache.has(cardId)) return state.detailCache.get(cardId);
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
    `<div class="mi-name">${esc(detail.name || card.name)}</div>`,
    `<div class="mi-dim">${esc(card.setName)} · ${esc(card.id)}</div>`,
  ];
  const info = [];
  if (detail.category) info.push(detail.category === "Pokemon" ? "ポケモン" : detail.category === "Trainer" ? "トレーナーズ" : detail.category);
  if (detail.hp) info.push(`HP ${detail.hp}`);
  if (detail.types?.length) info.push(detail.types.join("/"));
  if (detail.stage) info.push(detail.stage);
  if (detail.rarity) info.push(detail.rarity);
  if (info.length) parts.push(`<div>${esc(info.join(" · "))}</div>`);
  els.modalInfo.innerHTML = parts.join("");
}

function closeModals() {
  els.cardModal.classList.add("hidden");
  els.importModal.classList.add("hidden");
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
  for (const select of [els.categoryFilter, els.typeFilter, els.stageFilter, els.rarityFilter]) {
    select.addEventListener("change", applyFilter);
  }
  els.reloadBtn.addEventListener("click", () => loadCards(true));

  new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting && state.renderedCount < state.filtered.length) {
      renderMoreCards();
    }
  }, { rootMargin: "600px" }).observe(els.sentinel);

  els.deckName.addEventListener("input", () => {
    state.deckName = els.deckName.value;
    persistCurrent();
  });

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
