// ==UserScript==
// @name         🎯 Stoloto 7.1 (Tours + Profiles)
// @namespace    https://stoloto.ru/
// @version      7.1
// @description  Сканер ГЖЛТ: 3 тура, профили чисел, гибкие пороги. Стоп при первом результате.
// @author       Expert JS Team
// @match        https://www.stoloto.ru/gzhl/game*
// @match        https://stoloto.ru/gzhl/game*
// @grant        GM_addStyle
// @run-at       document-idle
// ==/UserScript==
(function () {
'use strict';
const THEME = {
bg: '#2E3440', bgDark: '#3B4252', bgDarker: '#434C5E',
text: '#ECEFF4', textMuted: '#D8DEE9', border: '#4C566A',
panel: '#434C5E', hover: '#4C566A', selection: '#4C566A80',
primary: '#88C0D0', success: '#A3BE8C', warning: '#EBCB8B',
danger: '#BF616A', info: '#81A1C1', highlight: '#EBCB8B',
field1: '#81A1C1', field2: '#A3BE8C', field3: '#EBCB8B',
};
const SEL = {
TICKET:  '[data-test-id="ticket"]',
TICKET_BTN: '[class*="Ticket_btn__"]',
FIELD: '[class*="field__"]',
NUMBER:  '[data-test-id="number"], [data-test-id="selected-number"]',
TICKET_ID: '[data-test-id="ticket-number"]',
LOAD_BTN: 'button[data-test-id="other_ticket"]',
};
const DEFAULT_NUMBERS = new Set([
6, 11, 34, 45, 58, 67, 75, 82, 80, 81, 83, 46, 48, 39,
1, 4, 2, 8, 14, 16, 23, 30, 38, 50, 52, 57, 61, 65, 70, 74
]);

let selectedNumbers = new Set(DEFAULT_NUMBERS);
let lastResults = [];
let activeTicket = null;
let isWaitingForLoad = false;
let autoLoadEnabled = true;
let checkSingleRow = false;
let isScanning = false;
let scanInterval = null;
let panelRef = null;

// 🎯 Настройки туров
const TOURS = {
1: { name: '1-й тур', defaultThreshold: 5, desc: 'Поиск в строках по 9 чисел' },
2: { name: '2-й тур', defaultThreshold: 15, desc: 'Совпадения в одном field__*' },
3: { name: '3-й тур', defaultThreshold: 30, desc: 'Сумма по двум field__* в билете' },
};
let currentTour = 1;
let thresholds = { 1: 5, 2: 15, 3: 30 };

const STORAGE_KEY = 'stoloto_scanner_v7_1';
const SETS_KEY = STORAGE_KEY + '_sets';
const SAVED_RESULTS_KEY = STORAGE_KEY + '_savedResults';
let currentSetName = 'Базовый';

// ─────────────────────────────────────────────────────────────────
// 🗄️ Модуль хранилища
// ─────────────────────────────────────────────────────────────────
const Storage = {
save() {
const state = {
version: 7.1, currentSetName, currentTour, thresholds,
selectedNumbers: [...selectedNumbers],
settings: { autoLoadEnabled, theme: 'nord' }
};
try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { console.warn('Save error:', e); }
},
load() {
try {
const raw = localStorage.getItem(STORAGE_KEY);
if (!raw) return this.migrateOld();
const state = JSON.parse(raw);
if (state.version < 7.1) return this.migrateOld();
if (Array.isArray(state.selectedNumbers)) selectedNumbers = new Set(state.selectedNumbers);
if (state.currentSetName) currentSetName = state.currentSetName;
if (state.currentTour && TOURS[state.currentTour]) currentTour = state.currentTour;
if (state.thresholds) thresholds = { ...thresholds, ...state.thresholds };
if (state.settings) autoLoadEnabled = state.settings.autoLoadEnabled ?? autoLoadEnabled;
return true;
} catch (e) { console.warn('Load error:', e); return this.migrateOld(); }
},
migrateOld() {
const sets = this.loadSets();
if (!sets['Базовый']) { sets['Базовый'] = [...DEFAULT_NUMBERS]; this.saveSets(sets); }
currentSetName = 'Базовый';
selectedNumbers = new Set(sets['Базовый']);
return true;
},
loadSets() {
try { const raw = localStorage.getItem(SETS_KEY); return raw ? JSON.parse(raw) : { 'Базовый': [...DEFAULT_NUMBERS] }; }
catch { return { 'Базовый': [...DEFAULT_NUMBERS] }; }
},
saveSets(sets) { try { localStorage.setItem(SETS_KEY, JSON.stringify(sets)); } catch (e) { console.warn('Save sets error:', e); } },
saveSet(name) { if (!name?.trim()) return false; const sets = this.loadSets(); sets[name.trim()] = [...selectedNumbers]; this.saveSets(sets); return true; },
loadSet(name) { const sets = this.loadSets(); if (!sets[name]) return false; selectedNumbers = new Set(sets[name]); currentSetName = name; refreshNumBtns(); triggerAutoScan(); scheduleSave(); return true; },
deleteSet(name) { if (name === 'Базовый') return false; const sets = this.loadSets(); delete sets[name]; this.saveSets(sets); if (currentSetName === name) { currentSetName = 'Базовый'; selectedNumbers = new Set(sets['Базовый']); refreshNumBtns(); } return true; },
loadSavedResults() { try { return localStorage.getItem(SAVED_RESULTS_KEY) ? JSON.parse(localStorage.getItem(SAVED_RESULTS_KEY)) : []; } catch { return []; } },
saveResult(result) { const saved = Storage.loadSavedResults(); if (saved.some(s => s.ticketId === result.ticketId)) return; saved.unshift({ ticketId: result.ticketId, matched: result.matched, count: result.count, savedAt: new Date().toISOString() }); if (saved.length > 100) saved.length = 100; try { localStorage.setItem(SAVED_RESULTS_KEY, JSON.stringify(saved)); } catch (e) { console.warn('Save result error:', e); } },
deleteSavedResult(index) { const saved = Storage.loadSavedResults(); saved.splice(index, 1); try { localStorage.setItem(SAVED_RESULTS_KEY, JSON.stringify(saved)); } catch (e) { console.warn('Delete result error:', e); } }
};

let saveDebounce = null;
function scheduleSave() { clearTimeout(saveDebounce); saveDebounce = setTimeout(() => Storage.save(), 1500); }

// ─────────────────────────────────────────────────────────────────
// 🎨 UI Styles
// ─────────────────────────────────────────────────────────────────
const PANEL_ID = 'slt-panel';
const BTN_ID = 'slt-trigger-btn';

GM_addStyle(`
#${PANEL_ID} * { box-sizing: border-box; font-family: 'JetBrains Mono', 'Fira Code', monospace; }
#${PANEL_ID} ::-webkit-scrollbar { width: 5px; height: 5px; }
#${PANEL_ID} ::-webkit-scrollbar-track { background: ${THEME.bgDarker}; }
#${PANEL_ID} ::-webkit-scrollbar-thumb { background: ${THEME.border}; border-radius: 4px; }
.slt-num-btn { width: 100%; aspect-ratio: 1; border-radius: 6px; border: 1px solid ${THEME.border}; background: ${THEME.panel}; color: ${THEME.textMuted}; font-size: 11px; font-weight: 600; cursor: pointer; transition: all .13s ease; display: flex; align-items: center; justify-content: center; user-select: none; padding: 0; }
.slt-num-btn:hover { border-color: ${THEME.hover}; color: ${THEME.text}; background: ${THEME.selection}; }
.slt-num-btn.active { background: ${THEME.primary}; border-color: ${THEME.primary}; color: ${THEME.bgDark}; font-weight: 800; box-shadow: 0 0 0 2px ${THEME.primary}40; }
.slt-row { cursor: pointer; transition: background .13s; }
.slt-row:hover td { background: ${THEME.selection} !important; }
.slt-row.slt-row-active td { background: ${THEME.hover}33 !important; outline: 1px solid ${THEME.info}; }
.slt-ticket-best { outline: 3px solid ${THEME.highlight} !important; outline-offset: 4px; position: relative; z-index: 10; box-shadow: 0 0 20px ${THEME.highlight}30; }
.slt-ticket-selected { outline: 3px solid ${THEME.info} !important; outline-offset: 4px; border-radius: 8px; position: relative; z-index: 9; }
.slt-ticket-field-highlight-1 { outline: 2px dashed ${THEME.field1} !important; outline-offset: -2px; }
.slt-ticket-field-highlight-2 { outline: 2px dashed ${THEME.field2} !important; outline-offset: -2px; }
.slt-ticket-field-highlight-3 { outline: 2px dashed ${THEME.field3} !important; outline-offset: -2px; }
.slt-hbtn { border-radius: 7px; padding: 4px 12px; font-size: 12px; font-weight: 600; cursor: pointer; transition: all .15s; font-family: inherit; border: 1px solid ${THEME.border}; background: ${THEME.panel}; color: ${THEME.textMuted}; }
.slt-hbtn:hover { filter: brightness(1.1); transform: translateY(-1px); }
.slt-hbtn:active { transform: translateY(0); }
.slt-hbtn--primary { background: ${THEME.primary}; color: ${THEME.bgDark}; border-color: ${THEME.primary}; font-weight: 700; }
.slt-hbtn--danger { color: ${THEME.danger}; border-color: ${THEME.danger}66; }
.slt-hbtn--success { color: ${THEME.success}; border-color: ${THEME.success}66; }
.slt-hbtn--warning { color: ${THEME.warning}; border-color: ${THEME.warning}66; }
.slt-num-hit { font-weight: 800; transition: all .2s; border-radius: 3px; padding: 0 3px; margin: 0 1px; }
.slt-num-hit.full { background: ${THEME.highlight}; color: ${THEME.bgDark}; box-shadow: 0 0 0 2px ${THEME.highlight}60; }
.slt-num-hit.partial { background: ${THEME.primary}; color: ${THEME.bgDark}; }
.slt-num-hit-selected-partial.slt-num-hit.partial { background: ${THEME.warning} !important; color: ${THEME.bgDark} !important; box-shadow: 0 0 0 2px ${THEME.warning}80 !important; }
.slt-summary { background: ${THEME.panel}; border-radius: 8px; padding: 8px 13px; margin-bottom: 10px; font-size: 12px; color: ${THEME.textMuted}; display: flex; gap: 16px; flex-wrap: wrap; border-left: 3px solid ${THEME.primary}; }
.slt-control { display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 12px; color: ${THEME.textMuted}; background: ${THEME.panel}; padding: 4px 10px; border-radius: 7px; border: 1px solid ${THEME.border}; user-select: none; }
.slt-control input { accent-color: ${THEME.primary}; width: 13px; height: 13px; cursor: pointer; margin: 0; }
.slt-input { width: 45px; background: ${THEME.bgDark}; border: 1px solid ${THEME.border}; color: ${THEME.text}; font-size: 11px; padding: 2px 4px; border-radius: 4px; text-align: center; }
.slt-select { background: ${THEME.bgDark}; border: 1px solid ${THEME.border}; color: ${THEME.text}; font-size: 11px; padding: 3px 6px; border-radius: 4px; outline: none; cursor: pointer; max-width: 140px; }
.slt-select:hover { border-color: ${THEME.primary}; }
.slt-radio-group { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.slt-radio { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; color: ${THEME.textMuted}; cursor: pointer; padding: 3px 8px; border-radius: 6px; border: 1px solid ${THEME.border}; background: ${THEME.panel}; transition: all .15s; }
.slt-radio:hover { border-color: ${THEME.primary}; color: ${THEME.text}; }
.slt-radio.active { background: ${THEME.primary}; color: ${THEME.bgDark}; border-color: ${THEME.primary}; font-weight: 700; }
.slt-radio input { display: none; }
.slt-tabs { display: flex; background: ${THEME.bgDark}; border-bottom: 1px solid ${THEME.border}; padding: 0 14px; gap: 0; flex-shrink: 0; }
.slt-tab { padding: 10px 16px; font-size: 12px; font-weight: 600; color: ${THEME.textMuted}; cursor: pointer; border-bottom: 2px solid transparent; transition: all .15s; user-select: none; white-space: nowrap; }
.slt-tab:hover { color: ${THEME.text}; background: ${THEME.hover}22; }
.slt-tab.active { color: ${THEME.primary}; border-bottom-color: ${THEME.primary}; background: ${THEME.bg}; }
.slt-tab-content { display: none; overflow-y: auto; padding: 10px 12px; flex: 1; min-height: 0; }
.slt-tab-content.active { display: block; }
.slt-save-btn { background: none; border: none; color: ${THEME.info}; cursor: pointer; font-size: 16px; padding: 2px 6px; border-radius: 4px; transition: all .15s; }
.slt-save-btn:hover { background: ${THEME.hover}33; color: ${THEME.primary}; transform: scale(1.1); }
.slt-saved-row { border-bottom: 1px solid ${THEME.border}; padding: 8px 0; display: flex; justify-content: space-between; align-items: center; }
.slt-saved-row:hover { background: ${THEME.hover}22; }
.slt-saved-numbers { display: flex; flex-wrap: wrap; gap: 3px; max-width: 70%; }
.slt-saved-num { background: ${THEME.bgDarker}; color: ${THEME.primary}; border: 1px solid ${THEME.border}; padding: 1px 6px; border-radius: 4px; font-size: 10px; font-weight: 600; }
.slt-del-btn { background: ${THEME.danger}22; color: ${THEME.danger}; border: 1px solid ${THEME.danger}66; border-radius: 5px; padding: 2px 8px; font-size: 11px; cursor: pointer; }
.slt-del-btn:hover { background: ${THEME.danger}; color: ${THEME.bgDark}; }
.slt-scan-toggle { display: flex; align-items: center; gap: 4px; padding: 4px 10px; border-radius: 7px; border: 1px solid ${THEME.border}; background: ${THEME.panel}; color: ${THEME.text}; font-size: 12px; font-weight: 600; cursor: pointer; transition: all .15s; }
.slt-scan-toggle:hover { filter: brightness(1.1); }
.slt-scan-toggle.active { background: ${THEME.danger}; border-color: ${THEME.danger}; color: ${THEME.bgDark}; }
.slt-scan-toggle .icon { font-size: 14px; }
.slt-loading { text-align:center; padding:12px; color:${THEME.info}; font-size:11px; background:${THEME.bgDarker}; border-radius:6px; margin-bottom:10px; }
.slt-profiles-bar { display: flex; gap: 8px; align-items: center; padding: 8px 14px; background: ${THEME.bgDark}; border-bottom: 1px solid ${THEME.border}; flex-wrap: wrap; }
.slt-profile-input { flex: 1; min-width: 100px; background: ${THEME.bg}; border: 1px solid ${THEME.border}; color: ${THEME.text}; padding: 4px 8px; border-radius: 4px; font-size: 11px; }
.slt-profile-input:focus { border-color: ${THEME.primary}; outline: none; }
.slt-profiles-list { display: flex; gap: 4px; flex-wrap: wrap; max-height: 60px; overflow-y: auto; padding: 2px; }
.slt-profile-chip { display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; background: ${THEME.panel}; border: 1px solid ${THEME.border}; border-radius: 12px; font-size: 10px; color: ${THEME.textMuted}; cursor: pointer; transition: all .15s; }
.slt-profile-chip:hover { border-color: ${THEME.primary}; color: ${THEME.text}; }
.slt-profile-chip.active { background: ${THEME.primary}; color: ${THEME.bgDark}; border-color: ${THEME.primary}; font-weight: 700; }
.slt-profile-chip .del { opacity: 0.6; font-weight: 900; padding: 0 2px; }
.slt-profile-chip .del:hover { opacity: 1; color: ${THEME.danger}; }
.slt-tour-settings { display: flex; align-items: center; gap: 8px; padding: 6px 14px; background: ${THEME.bgDark}; border-bottom: 1px solid ${THEME.border}; font-size: 11px; color: ${THEME.textMuted}; }
.slt-tour-settings .label { font-weight: 600; color: ${THEME.info}; }
.slt-tour-settings .desc { opacity: 0.8; margin-left: 8px; }
@media (max-width: 768px) {
#${PANEL_ID} { width: 95vw !important; right: 2.5vw !important; left: auto !important; max-height: 80vh; }
.slt-num-btn { font-size: 10px; }
#slt-nums-grid { grid-template-columns: repeat(10, 1fr); }
.slt-hbtn { padding: 3px 8px; font-size: 11px; }
.slt-control { padding: 3px 8px; font-size: 11px; }
.slt-summary { padding: 6px 10px; font-size: 11px; }
.slt-tab { padding: 8px 12px; font-size: 11px; }
.slt-profiles-bar { padding: 6px 10px; }
.slt-radio { font-size: 10px; padding: 2px 6px; }
}
`);

// ─────────────────────────────────────────────────────────────────
// 🔍 Логика сканирования (обновлена под 3 тура)
// ─────────────────────────────────────────────────────────────────
function scan() {
cleanupHighlights();
if (!selectedNumbers.size) return { results: [], stopReason: null, stoppedTicket: null };
const tickets = document.querySelectorAll(SEL.TICKET);
if (!tickets.length) return { results: [], stopReason: null, stoppedTicket: null };
const results = [];
let stopReason = null;
let stoppedTicket = null;
const threshold = thresholds[currentTour];

for (const ticket of tickets) {
const idEl = ticket.querySelector(SEL.TICKET_ID);
const rawId = idEl ? idEl.textContent.trim() : '—';
const ticketId = rawId.replace(/[^0-9]/g, '') || rawId;
let matched = [];
let matchCount = 0;
let highlightClass = null;

if (currentTour === 1) {
// 🎯 1-й тур: строки по 9 чисел (старая логика)
const allSpans = [...ticket.querySelectorAll(SEL.NUMBER)];
if (allSpans.length < 9) continue;
let bestRowMatches = [];
for (let i = 0; i < allSpans.length; i += 9) {
const rowSpans = allSpans.slice(i, i + 9);
const rowNumSet = new Set();
rowSpans.forEach(s => { const txt = s.textContent.trim(); if (txt) { const n = parseInt(txt, 10); if (!isNaN(n)) rowNumSet.add(n); } });
const rowMatches = [...selectedNumbers].filter(n => rowNumSet.has(n));
if (rowMatches.length > bestRowMatches.length) bestRowMatches = rowMatches;
}
if (bestRowMatches.length < 5) continue;
matched = bestRowMatches.sort((a, b) => a - b);
matchCount = matched.length;
highlightClass = 'slt-ticket-field-highlight-1';

} else if (currentTour === 2) {
// 🎲 2-й тур: совпадения внутри ОДНОГО field__*
const fields = ticket.querySelectorAll(SEL.FIELD);
if (!fields.length) continue;
let bestFieldMatches = [];
for (const field of fields) {
const spans = field.querySelectorAll(SEL.NUMBER);
const fieldNumSet = new Set();
spans.forEach(s => { const n = parseInt(s.textContent.trim(), 10); if (!isNaN(n)) fieldNumSet.add(n); });
const fieldMatches = [...selectedNumbers].filter(n => fieldNumSet.has(n));
if (fieldMatches.length > bestFieldMatches.length) bestFieldMatches = fieldMatches;
}
if (bestFieldMatches.length < 5) continue;
matched = bestFieldMatches.sort((a, b) => a - b);
matchCount = matched.length;
highlightClass = 'slt-ticket-field-highlight-2';

} else if (currentTour === 3) {
// 🏆 3-й тур: сумма по ДВУМ field__* внутри одного Ticket_btn__*
const ticketBtn = ticket.closest(SEL.TICKET_BTN) || ticket;
const fields = ticketBtn.querySelectorAll(SEL.FIELD);
if (fields.length < 2) continue;
const fieldScores = [];
for (const field of fields) {
const spans = field.querySelectorAll(SEL.NUMBER);
const fieldNumSet = new Set();
spans.forEach(s => { const n = parseInt(s.textContent.trim(), 10); if (!isNaN(n)) fieldNumSet.add(n); });
const matches = [...selectedNumbers].filter(n => fieldNumSet.has(n));
fieldScores.push({ field, matches, count: matches.length });
}
fieldScores.sort((a, b) => b.count - a.count);
const topTwo = fieldScores.slice(0, 2);
const totalMatches = [...new Set([...topTwo[0].matches, ...topTwo[1].matches])];
matchCount = totalMatches.length;
if (matchCount < 10) continue;
matched = totalMatches.sort((a, b) => a - b);
highlightClass = 'slt-ticket-field-highlight-3';
}

// Подсветка чисел
const allSpans = ticket.querySelectorAll(SEL.NUMBER);
const isFull = matchCount >= selectedNumbers.size;
allSpans.forEach(span => {
const val = parseInt(span.textContent.trim(), 10);
if (!isNaN(val) && matched.includes(val)) {
span.setAttribute('data-slt-hit', '1');
span.classList.add('slt-num-hit', isFull ? 'full' : 'partial');
if (span.getAttribute('data-test-id') === 'selected-number' && !isFull) span.classList.add('slt-num-hit-selected-partial');
}
});
// Подсветка поля/билета
if (highlightClass && currentTour > 1) {
const target = currentTour === 3 ? (ticket.closest(SEL.TICKET_BTN) || ticket) : ticket;
target.classList.add(highlightClass);
}

results.push({ ticket, ticketId, rawId, matched, count: matchCount, isFull, tour: currentTour });
if (isFull) { stopReason = 'Все выбранные числа найдены'; stoppedTicket = ticket; break; }
if (matchCount >= threshold) { stopReason = `≥${threshold} совпадений (${TOURS[currentTour].name})`; stoppedTicket = ticket; break; }
}
results.sort((a, b) => b.count - a.count);
if (results.length) results[0].ticket.classList.add('slt-ticket-best');
lastResults = results;
return { results, stopReason, stoppedTicket };
}

function triggerLoadMore() {
if (isWaitingForLoad) return;
let loadBtn = document.querySelector(SEL.LOAD_BTN);
if (!loadBtn) {
const altBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Другие'));
if (!altBtn) return;
loadBtn = altBtn;
}
isWaitingForLoad = true;
const body = document.getElementById('slt-results-body');
if (body && !body.querySelector('.slt-loading')) {
const loadMsg = document.createElement('div'); loadMsg.className = 'slt-loading'; loadMsg.textContent = '⏳ Загрузка...'; body.prepend(loadMsg);
}
loadBtn.scrollIntoView({ block: 'center', behavior: 'instant' });
setTimeout(() => { loadBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })); loadBtn.click(); }, 80);
let timeoutId = null;
const observer = new MutationObserver((mutations, obs) => {
const hasNew = mutations.some(m => [...m.addedNodes].some(n => n.nodeType === 1 && (n.matches?.(SEL.TICKET) || n.querySelector?.(SEL.TICKET))));
if (!hasNew) return;
obs.disconnect(); if (timeoutId) clearTimeout(timeoutId);
isWaitingForLoad = false;
if (body) { const m = body.querySelector('.slt-loading'); if (m) m.remove(); }
if (isScanning) doScan();
});
observer.observe(document.body, { childList: true, subtree: true });
timeoutId = setTimeout(() => { observer.disconnect(); isWaitingForLoad = false; if (body) { const m = body.querySelector('.slt-loading'); if (m) m.remove(); } }, 1000);
}

function renderResults(container, results) {
if (!container) return;
const existingLoad = container.querySelector('.slt-loading');
container.innerHTML = '';
if (existingLoad) container.appendChild(existingLoad);
const selCountEl = document.getElementById('slt-sel-count');
if (selCountEl) selCountEl.textContent = `${selectedNumbers.size} выбрано`;
if (!results?.length) {
container.innerHTML = `<div style="text-align:center;padding:30px 20px;color:${THEME.textMuted};line-height:2"><div style="font-size:32px;margin-bottom:8px">🧛</div><div style="color:${THEME.text}">Совпадений не найдено.</div><div style="font-size:11px;color:${THEME.textMuted};margin-top:4px">Выберите числа и нажмите <b style="color:${THEME.primary}">▶ Скан</b></div></div>`;
return;
}
const fullCnt = results.filter(r => r.isFull).length;
const summary = document.createElement('div'); summary.className = 'slt-summary';
let html = `<span>🗂 Билетов: <b style="color:${THEME.success}">${results.length}</b></span><span>🎯 Чисел: <b style="color:${THEME.primary}">${selectedNumbers.size}</b></span>`;
if (fullCnt) html += `<span>⭐ Полных: <b style="color:${THEME.highlight}">${fullCnt}</b></span>`;
summary.innerHTML = html; container.appendChild(summary);
const tbl = document.createElement('table'); tbl.style.cssText = 'width:100%;border-collapse:collapse';
tbl.innerHTML = `<thead><tr style="background:${THEME.bgDarker};font-size:12px;color:${THEME.textMuted}"><th style="padding:7px 6px 7px 10px;text-align:left;font-weight:600">#</th><th style="padding:7px 6px;text-align:left;font-weight:600">Номер билета</th><th style="padding:7px 6px;text-align:center;font-weight:600">Совп.</th><th style="padding:7px 10px 7px 6px;text-align:left;font-weight:600">Числа</th><th style="padding:7px 6px;text-align:center;font-weight:600">💾</th></tr></thead><tbody id="slt-tbody"></tbody>`;
container.appendChild(tbl); const tbody = tbl.querySelector('#slt-tbody');
results.forEach((r, i) => {
const baseBg = i % 2 === 0 ? THEME.bg : THEME.bgDark;
const ratio = r.count / selectedNumbers.size;
const countColor = r.isFull ? THEME.highlight : ratio >= .6 ? THEME.success : ratio >= .3 ? THEME.warning : THEME.info;
const numsHtml = r.matched.map(n => `<span style="background:${THEME.bgDarker};color:${THEME.primary};border:1px solid ${THEME.border};padding:1px 5px;border-radius:5px;margin:1px;display:inline-block;font-size:11px;font-weight:700">${n}</span>`).join('');
const tr = document.createElement('tr'); tr.className = 'slt-row';
tr.style.cssText = `background:${baseBg};${i===0?`border-left:3px solid ${THEME.highlight}`:''}`;
tr.innerHTML = `<td style="padding:7px 6px 7px 10px;color:${THEME.textMuted};font-size:11px">${i+1}</td><td style="padding:7px 6px"><span style="font-weight:700;font-size:12px;color:${r.isFull?THEME.highlight:THEME.text}">${r.ticketId}</span>${r.isFull?`<span style="margin-left:5px;font-size:9px;font-weight:700;background:${THEME.highlight};color:${THEME.bgDark};padding:1px 5px;border-radius:4px">★ ПОЛНОЕ</span>`:''}${i===0?`<span style="margin-left:5px;font-size:9px;font-weight:700;background:${THEME.primary};color:${THEME.bgDark};padding:1px 5px;border-radius:4px">👑 ТОП</span>`:''}</td><td style="padding:7px 6px;text-align:center"><span style="background:${THEME.bgDarker};color:${countColor};border:1px solid ${countColor}66;padding:2px 10px;border-radius:10px;font-weight:700;font-size:12px">${r.count}/${selectedNumbers.size}</span></td><td style="padding:7px 10px 7px 6px;line-height:2">${numsHtml}</td><td style="padding:7px 6px;text-align:center"><button class="slt-save-btn" title="Сохранить результат" data-idx="${i}">💾</button></td>`;
tr.onclick = (e) => { if (!e.target.closest('.slt-save-btn')) selectTicketRow(r, tr, results); };
tbody.appendChild(tr);
});
tbody.querySelectorAll('.slt-save-btn').forEach(btn => {
btn.onclick = (e) => {
e.stopPropagation();
const idx = parseInt(btn.dataset.idx, 10);
const result = results[idx];
if (result) {
Storage.saveResult(result);
btn.textContent = '✓'; btn.style.color = THEME.success;
setTimeout(() => { btn.textContent = '💾'; btn.style.color = ''; }, 1200);
const savedBody = document.getElementById('slt-saved-results-body');
if (savedBody && savedBody.closest('.slt-tab-content.active')) renderSavedResults(savedBody);
}
};
});
}

function renderSavedResults(container) {
if (!container) return;
const saved = Storage.loadSavedResults();
container.innerHTML = '';
if (!saved.length) {
container.innerHTML = `<div style="text-align:center;padding:30px 20px;color:${THEME.textMuted};line-height:2"><div style="font-size:32px;margin-bottom:8px">📭</div><div style="color:${THEME.text}">Нет сохранённых результатов</div><div style="font-size:11px;color:${THEME.textMuted};margin-top:4px">Нажмите 💾 в результатах поиска, чтобы сохранить</div></div>`;
return;
}
const header = document.createElement('div'); header.style.cssText = `padding:8px 0 12px;border-bottom:1px solid ${THEME.border};margin-bottom:10px;font-size:12px;color:${THEME.textMuted}`;
header.textContent = `Сохранено: ${saved.length}`; container.appendChild(header);
saved.forEach((item, idx) => {
const row = document.createElement('div'); row.className = 'slt-saved-row'; row.style.cssText = `padding:10px 8px;background:${idx%2===0?THEME.bg:THEME.bgDark};border-radius:6px;margin-bottom:6px`;
const numsHtml = item.matched.map(n => `<span class="slt-saved-num">${n}</span>`).join('');
const date = new Date(item.savedAt).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
row.innerHTML = `<div style="flex:1;min-width:0"><div style="display:flex;align-items:center;gap:8px;margin-bottom:4px"><span style="font-weight:700;color:${THEME.text};font-size:13px">${item.ticketId}</span><span style="background:${THEME.primary}22;color:${THEME.primary};padding:1px 8px;border-radius:10px;font-size:11px;font-weight:700">${item.count} совп.</span><span style="font-size:10px;color:${THEME.textMuted}">${date}</span></div><div class="slt-saved-numbers">${numsHtml}</div></div><button class="slt-del-btn" data-idx="${idx}">✕</button>`;
container.appendChild(row);
});
container.querySelectorAll('.slt-del-btn').forEach(btn => { btn.onclick = (e) => { e.stopPropagation(); Storage.deleteSavedResult(parseInt(btn.dataset.idx, 10)); renderSavedResults(container); }; });
}

function selectTicketRow(r, tr, results) {
document.querySelectorAll('.slt-row.slt-row-active').forEach(el => el.classList.remove('slt-row-active'));
tr.classList.add('slt-row-active');
document.querySelectorAll('.slt-ticket-best, .slt-ticket-selected, .slt-ticket-field-highlight-1, .slt-ticket-field-highlight-2, .slt-ticket-field-highlight-3').forEach(el => el.classList.remove('slt-ticket-best', 'slt-ticket-selected', 'slt-ticket-field-highlight-1', 'slt-ticket-field-highlight-2', 'slt-ticket-field-highlight-3'));
if (results.length) results[0].ticket.classList.add('slt-ticket-best');
r.ticket.classList.add(r === results[0] ? 'slt-ticket-best' : 'slt-ticket-selected');
r.ticket.scrollIntoView({ behavior: 'smooth', block: 'center' }); activeTicket = r.ticket;
}

function toggleNumber(n, btn) { selectedNumbers.has(n) ? (selectedNumbers.delete(n), btn.classList.remove('active')) : (selectedNumbers.add(n), btn.classList.add('active')); const el = document.getElementById('slt-sel-count'); if (el) el.textContent = `${selectedNumbers.size} выбрано`; triggerAutoScan(); scheduleSave(); }

function refreshNumBtns() {
document.querySelectorAll('.slt-num-btn').forEach(btn => {
const n = parseInt(btn.dataset.num, 10);
btn.classList.toggle('active', selectedNumbers.has(n));
});
const el = document.getElementById('slt-sel-count');
if (el) el.textContent = `${selectedNumbers.size} выбрано`;
renderProfilesBar();
}

function cleanupHighlights() {
document.querySelectorAll(`${SEL.NUMBER}[data-slt-hit]`).forEach(s => {
s.removeAttribute('data-slt-hit');
s.classList.remove('slt-num-hit', 'full', 'partial', 'slt-num-hit-selected-partial');
});
document.querySelectorAll('.slt-ticket-best, .slt-ticket-selected, .slt-ticket-field-highlight-1, .slt-ticket-field-highlight-2, .slt-ticket-field-highlight-3').forEach(el => el.classList.remove('slt-ticket-best', 'slt-ticket-selected', 'slt-ticket-field-highlight-1', 'slt-ticket-field-highlight-2', 'slt-ticket-field-highlight-3'));
}

let autoScanTimer = null;
function triggerAutoScan() {
const panel = document.getElementById(PANEL_ID);
if (!panel || panel.dataset.autoscan !== '1') return;
clearTimeout(autoScanTimer);
autoScanTimer = setTimeout(() => {
const payload = scan();
const body = document.getElementById('slt-results-body');
if (body) 'requestIdleCallback' in window ? requestIdleCallback(() => renderResults(body, payload.results), { timeout: 500 }) : renderResults(body, payload.results);
}, 300);
}

function showTab(tabName) {
document.querySelectorAll('.slt-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tabName));
document.querySelectorAll('.slt-tab-content').forEach(c => {
const isActive = c.dataset.tab === tabName;
c.classList.toggle('active', isActive);
if (isActive && tabName === 'saved') {
const savedBody = document.getElementById('slt-saved-results-body');
if (savedBody) renderSavedResults(savedBody);
}
});
}

function updateScanUI() {
const btn = document.getElementById('slt-scan-toggle');
if (!btn) return;
if (isScanning) { btn.classList.add('active'); btn.innerHTML = '<span class="icon">⏹</span> Стоп'; btn.title = 'Остановить сканирование'; }
else { btn.classList.remove('active'); btn.innerHTML = '<span class="icon">▶</span> Старт'; btn.title = 'Запустить сканирование'; }
}

function toggleScan() {
isScanning = !isScanning;
if (isScanning) {
showTab('results');
triggerLoadMore();
doScan();
scanInterval = setInterval(doScan, 2500);
} else {
isWaitingForLoad = false;
if (scanInterval) { clearInterval(scanInterval); scanInterval = null; }
}
updateScanUI();
}

function doScan() {
if (!document.getElementById(PANEL_ID) || !isScanning) {
if (isScanning) { isScanning = false; if (scanInterval) clearInterval(scanInterval); scanInterval = null; updateScanUI(); }
return;
}
if (isWaitingForLoad) return;
const payload = scan();
const body = document.getElementById('slt-results-body');
if (body) renderResults(body, payload.results);
if (payload.results.length > 0) {
isScanning = false;
if (scanInterval) { clearInterval(scanInterval); scanInterval = null; }
updateScanUI();
return;
}
if (autoLoadEnabled) triggerLoadMore();
}

// ─────────────────────────────────────────────────────────────────
// 👤 Управление профилями
// ─────────────────────────────────────────────────────────────────
function renderProfilesBar() {
const bar = document.getElementById('slt-profiles-bar');
if (!bar) return;
const sets = Storage.loadSets();
const names = Object.keys(sets).sort();
let html = `
<span style="font-size:11px;font-weight:700;color:${THEME.info};white-space:nowrap">Набор:</span>
<select id="slt-profile-select" class="slt-select">
${names.map(n => `<option value="${n}" ${n===currentSetName?'selected':''}>${n}</option>`).join('')}
</select>
<input type="text" id="slt-profile-name" class="slt-profile-input" placeholder="Имя нового набора..." maxlength="20">
<button id="slt-profile-save" class="slt-hbtn slt-hbtn--success" style="font-size:11px;padding:3px 9px;white-space:nowrap">💾 Сохранить</button>
<button id="slt-profile-del" class="slt-hbtn slt-hbtn--danger" style="font-size:11px;padding:3px 9px;white-space:nowrap" ${currentSetName==='Базовый'?'disabled':''}>🗑️ Удалить</button>
<div class="slt-profiles-list">
${names.map(n => `
<span class="slt-profile-chip ${n===currentSetName?'active':''}" data-name="${n}">
${n}
${n!=='Базовый' ? `<span class="del" title="Удалить" data-del="${n}">×</span>` : ''}
</span>`).join('')}
</div>
`;
bar.innerHTML = html;
bar.querySelector('#slt-profile-select').onchange = (e) => Storage.loadSet(e.target.value);
bar.querySelector('#slt-profile-save').onclick = () => {
const name = bar.querySelector('#slt-profile-name').value.trim();
if (!name) { bar.querySelector('#slt-profile-name').focus(); return; }
if (Storage.saveSet(name)) {
bar.querySelector('#slt-profile-name').value = '';
renderProfilesBar();
scheduleSave();
}
};
bar.querySelector('#slt-profile-del').onclick = () => {
if (currentSetName === 'Базовый') return;
if (confirm(`Удалить набор "${currentSetName}"?`)) {
Storage.deleteSet(currentSetName);
renderProfilesBar();
scheduleSave();
}
};
bar.querySelectorAll('.slt-profile-chip').forEach(chip => {
chip.onclick = (e) => {
if (e.target.dataset.del) {
e.stopPropagation();
if (confirm(`Удалить набор "${e.target.dataset.del}"?`)) {
Storage.deleteSet(e.target.dataset.del);
renderProfilesBar();
scheduleSave();
}
} else {
Storage.loadSet(chip.dataset.name);
}
};
});
}

// ─────────────────────────────────────────────────────────────────
// 🏗️ Сборка панели
// ─────────────────────────────────────────────────────────────────
function buildPanel() {
const existing = document.getElementById(PANEL_ID);
let savedLeft = null, savedTop = null;
if (existing) { savedLeft = existing.style.left; savedTop = existing.style.top; existing.remove(); }
const panel = document.createElement('div'); panel.id = PANEL_ID; panel.dataset.autoscan = '1';
panel.style.cssText = `position:fixed;top:${savedTop||'16px'};${savedLeft?`left:${savedLeft}`:'right:16px'};width:600px;min-height:360px;max-height:85vh;background:${THEME.bg};color:${THEME.text};border-radius:14px;border:1px solid ${THEME.border};box-shadow:0 16px 48px #00000099,0 0 0 1px ${THEME.hover}22;z-index:2147483647;overflow:hidden;display:flex;flex-direction:column`;
panelRef = panel;
const head = document.createElement('div'); head.style.cssText = `background:${THEME.bgDark};border-bottom:1px solid ${THEME.border};padding:10px 14px;display:flex;align-items:center;justify-content:space-between;cursor:grab;user-select:none;flex-shrink:0`;
const headCenter = document.createElement('div'); headCenter.style.cssText = 'display:flex;align-items:center;gap:8px;flex:1;justify-content:center';
headCenter.innerHTML = `<label class="slt-control"><input type="checkbox" id="slt-autoscan" checked><span>Авто</span></label><label class="slt-control"><input type="checkbox" id="slt-autoload" checked><span>Автозагрузка</span></label><button id="slt-scan-toggle" class="slt-scan-toggle"><span class="icon">▶</span> Старт</button>`;
const headRight = document.createElement('div'); headRight.style.cssText = 'display:flex;align-items:center;gap:8px';
headRight.innerHTML = `<button id="slt-close" class="slt-hbtn slt-hbtn--danger" style="width:30px;height:30px;padding:0;display:flex;align-items:center;justify-content:center;font-size:16px">✕</button>`;
head.append(headCenter, headRight);
const tabs = document.createElement('div'); tabs.className = 'slt-tabs';
tabs.innerHTML = `<div class="slt-tab active" data-tab="numbers">Числа</div><div class="slt-tab" data-tab="results">Результаты</div><div class="slt-tab" data-tab="saved">Сохранённые</div>`;
const tabNumbers = document.createElement('div'); tabNumbers.className = 'slt-tab-content active'; tabNumbers.dataset.tab = 'numbers';
tabNumbers.innerHTML = `
<div id="slt-profiles-bar" class="slt-profiles-bar"></div>
<div class="slt-tour-settings">
<span class="label">Режим:</span>
<div class="slt-radio-group">
${Object.entries(TOURS).map(([id, t]) => `<label class="slt-radio ${id==currentTour?'active':''}" title="${t.desc}"><input type="radio" name="slt-tour" value="${id}" ${id==currentTour?'checked':''}><span>${t.name}</span></label>`).join('')}
</div>
<span class="label" style="margin-left:12px">Порог:</span>
<input type="number" id="slt-threshold" class="slt-input" min="1" max="90" value="${thresholds[currentTour]}">
<span class="desc" id="slt-tour-desc">${TOURS[currentTour].desc}</span>
</div>
<div style="padding:8px 14px;background:${THEME.bgDark};border-bottom:1px solid ${THEME.border}">
<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:7px">
<span style="font-size:11px;font-weight:700;color:${THEME.info};letter-spacing:.5px">ЧИСЛА <span id="slt-sel-count" style="background:${THEME.panel};color:${THEME.primary};padding:1px 8px;border-radius:8px;font-size:10px;margin-left:5px">${selectedNumbers.size} выбрано</span></span>
<div style="display:flex;gap:6px;align-items:center">
<button id="slt-nums-default" class="slt-hbtn slt-hbtn--success" style="font-size:11px;padding:3px 9px">Восстановить</button>
<button id="slt-nums-clear" class="slt-hbtn slt-hbtn--danger" style="font-size:11px;padding:3px 9px">Очистить</button>
<button id="slt-nums-all" class="slt-hbtn slt-hbtn--warning" style="font-size:11px;padding:3px 9px">Все</button>
</div>
</div>
<div id="slt-nums-grid" style="display:grid;grid-template-columns:repeat(15,1fr);gap:3px;margin-top:8px"></div>
</div>`;
const grid = tabNumbers.querySelector('#slt-nums-grid');
for (let n = 1; n <= 90; n++) { const btn = document.createElement('button'); btn.className = 'slt-num-btn' + (selectedNumbers.has(n) ? ' active' : ''); btn.textContent = n; btn.dataset.num = n; btn.onclick = () => toggleNumber(n, btn); grid.appendChild(btn); }
const tabResults = document.createElement('div'); tabResults.className = 'slt-tab-content'; tabResults.dataset.tab = 'results';
const resultsBody = document.createElement('div'); resultsBody.id = 'slt-results-body'; resultsBody.style.cssText = 'overflow-y:auto;padding:10px 12px;flex:1;min-height:0'; tabResults.appendChild(resultsBody);
const tabSaved = document.createElement('div'); tabSaved.className = 'slt-tab-content'; tabSaved.dataset.tab = 'saved';
const savedBody = document.createElement('div'); savedBody.id = 'slt-saved-results-body'; savedBody.style.cssText = 'overflow-y:auto;padding:10px 12px;flex:1;min-height:0'; tabSaved.appendChild(savedBody);
panel.append(head, tabs, tabNumbers, tabResults, tabSaved);
document.body.appendChild(panel);
updateScanUI();
// Events
panel.querySelector('#slt-close').onclick = () => { cleanupHighlights(); if (isScanning) toggleScan(); panelRef = null; panel.remove(); };
panel.querySelector('#slt-scan-toggle').onclick = toggleScan;
panel.querySelector('#slt-autoscan').onchange = function () { panel.dataset.autoscan = this.checked ? '1' : '0'; scheduleSave(); };
panel.querySelector('#slt-autoload').onchange = function () { autoLoadEnabled = this.checked; scheduleSave(); };
panel.querySelector('#slt-threshold').onchange = function () { const v = parseInt(this.value, 10); if (!isNaN(v) && v >= 1 && v <= 90) { thresholds[currentTour] = v; scheduleSave(); } else this.value = thresholds[currentTour]; };
panel.querySelector('#slt-nums-default').onclick = () => { Storage.loadSet('Базовый'); };
panel.querySelector('#slt-nums-clear').onclick = () => { selectedNumbers.clear(); refreshNumBtns(); cleanupHighlights(); lastResults = []; renderResults(document.getElementById('slt-results-body'), []); scheduleSave(); };
panel.querySelector('#slt-nums-all').onclick = () => { for (let n = 1; n <= 90; n++) selectedNumbers.add(n); refreshNumBtns(); triggerAutoScan(); scheduleSave(); };
panel.querySelectorAll('.slt-tab').forEach(tab => { tab.onclick = () => showTab(tab.dataset.tab); });
// Tour radios
panel.querySelectorAll('input[name="slt-tour"]').forEach(radio => {
radio.onchange = (e) => {
currentTour = parseInt(e.target.value, 10);
panel.querySelectorAll('.slt-radio').forEach(r => r.classList.toggle('active', r.querySelector('input').checked));
panel.querySelector('#slt-threshold').value = thresholds[currentTour];
panel.querySelector('#slt-tour-desc').textContent = TOURS[currentTour].desc;
cleanupHighlights();
triggerAutoScan();
scheduleSave();
};
});
enableDrag(panel, head);
renderProfilesBar();
renderResults(resultsBody, scan().results);
}

function enableDrag(el, handle) {
let ox, oy, sl, st, wasRight;
handle.addEventListener('mousedown', e => { if (e.target.closest('button,input,label')) return; e.preventDefault(); const r = el.getBoundingClientRect(); ox = e.clientX; oy = e.clientY; sl = r.left; st = r.top; wasRight = el.style.right; el.style.right = 'auto'; handle.style.cursor = 'grabbing'; const onMove = e => { el.style.left = `${sl + e.clientX - ox}px`; el.style.top = `${st + e.clientY - oy}px`; }; const onUp = () => { handle.style.cursor = 'grab'; if (wasRight) el.style.right = wasRight; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); }; window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp); });
}

let mutTimer = null;
const globalObserver = new MutationObserver(mutations => { const hasNew = mutations.some(m => [...m.addedNodes].some(n => n.nodeType === 1 && (n.matches?.(SEL.TICKET) || n.querySelector?.(SEL.TICKET)))); if (!hasNew) return; clearTimeout(mutTimer); mutTimer = setTimeout(() => { const panel = document.getElementById(PANEL_ID); if (!panel || panel.dataset.autoscan !== '1' || isWaitingForLoad) return; const payload = scan(); const body = document.getElementById('slt-results-body'); if (body) renderResults(body, payload.results); }, 500); });

function addTriggerBtn() {
if (document.getElementById(BTN_ID)) return;
const btn = document.createElement('button'); btn.id = BTN_ID; btn.title = 'Открыть / закрыть сканер'; btn.innerHTML = '🎯';
btn.style.cssText = `position:fixed;bottom:24px;right:24px;z-index:2147483646;width:50px;height:50px;border:2px solid ${THEME.primary};background:${THEME.bg};font-size:22px;cursor:pointer;transition:transform .2s,box-shadow .2s;display:flex;align-items:center;justify-content:center`;
btn.onmouseenter = () => { btn.style.transform = 'scale(1.12)'; btn.style.boxShadow = `0 6px 26px #00000099, 0 0 20px ${THEME.primary}88`; };
btn.onmouseleave = () => { btn.style.transform = 'scale(1)'; btn.style.boxShadow = `0 4px 20px #00000077, 0 0 14px ${THEME.primary}44`; };
btn.onclick = () => { if (document.getElementById(PANEL_ID)) { cleanupHighlights(); if (isScanning) toggleScan(); panelRef = null; document.getElementById(PANEL_ID).remove(); } else buildPanel(); };
document.body.appendChild(btn);
}

function init() { Storage.load(); addTriggerBtn(); globalObserver.observe(document.body, { childList: true, subtree: true }); buildPanel(); }
document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
})();
