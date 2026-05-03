// ==UserScript==
// @name         🎯 Stoloto 3 — Сканер v5.8 (фикс строк + тема 70/20/10)
// @namespace    https://stoloto.ru/
// @version      5.8
// @description  Сканер ГЖЛТ. Группировка строк строго по 9 ячеек DOM. Порог по строкам, автозагрузка, тема Dracula 70/20/10.
// @author       Expert JS Team
// @match        https://www.stoloto.ru/gzhl/game*
// @match        https://stoloto.ru/gzhl/game*
// @grant        GM_addStyle
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    /* ═══════════════════════════════════════════════════
       ТЕМА 70/20/10 — баланс на базе Dracula
    ═══════════════════════════════════════════════════ */
    const THEME = {
        bg:         '#282a36',  bgDark:     '#1e1f29',  bgDarker:   '#191a24',
        text:       '#f8f8f2',  textMuted:  '#bfbfbf',  border:     '#44475a',
        panel:      '#44475a',  hover:      '#6272a4',  selection:  '#44475a80',
        primary:    '#bd93f9',  success:    '#50fa7b',  warning:    '#ffb86c',
        danger:     '#ff5555',  info:       '#8be9fd',  highlight:  '#f1fa8c',
    };

    const SEL = {
        TICKET:  '[data-test-id="ticket"]',
        NUMBER:  '[data-test-id="number"]',
        TICKET_ID: '[data-test-id="ticket-number"]',
        LOAD_BTN: 'button[data-test-id="other_ticket"]',
    };

    const DEFAULT_NUMBERS = new Set([
        6, 11, 34, 45, 58, 67, 75, 82, 80, 81, 83, 46, 48, 39,
        1, 4, 2, 8, 14, 16, 23, 30, 38, 50, 52, 57, 61, 65, 70, 74
    ]);

    let selectedNumbers = new Set(DEFAULT_NUMBERS);
    let lastResults     = [];
    let activeTicket    = null;
    let isWaitingForLoad = false;
    let autoLoadEnabled = true;
    let stopThreshold   = 30;
    let checkSingleRow  = false;

    const PANEL_ID = 'slt-panel';
    const BTN_ID   = 'slt-trigger-btn';

    /* ═══════════════════════════════════════════════════
       СТИЛИ
    ═══════════════════════════════════════════════════ */
    GM_addStyle(`
        #${PANEL_ID} * { box-sizing: border-box; font-family: 'JetBrains Mono', 'Fira Code', monospace; }
        #${PANEL_ID} ::-webkit-scrollbar { width: 5px; height: 5px; }
        #${PANEL_ID} ::-webkit-scrollbar-track { background: ${THEME.bgDarker}; }
        #${PANEL_ID} ::-webkit-scrollbar-thumb { background: ${THEME.border}; border-radius: 4px; }

        .slt-num-btn {
            width: 100%; aspect-ratio: 1; border-radius: 6px;
            border: 1px solid ${THEME.border}; background: ${THEME.panel};
            color: ${THEME.textMuted}; font-size: 11px; font-weight: 600;
            cursor: pointer; transition: all .13s ease;
            display: flex; align-items: center; justify-content: center;
            user-select: none; padding: 0;
        }
        .slt-num-btn:hover { border-color: ${THEME.hover}; color: ${THEME.text}; background: ${THEME.selection}; }
        .slt-num-btn.active {
            background: ${THEME.primary}; border-color: ${THEME.primary};
            color: ${THEME.bgDark}; font-weight: 800; box-shadow: 0 0 0 2px ${THEME.primary}40;
        }

        .slt-row { cursor: pointer; transition: background .13s; }
        .slt-row:hover td { background: ${THEME.selection} !important; }
        .slt-row.slt-row-active td { background: ${THEME.hover}33 !important; outline: 1px solid ${THEME.info}; }

        .slt-ticket-best { outline: 3px solid ${THEME.highlight} !important; outline-offset: 4px; position: relative; z-index: 10; box-shadow: 0 0 20px ${THEME.highlight}30; }
        .slt-ticket-selected { outline: 3px solid ${THEME.info} !important; outline-offset: 4px; border-radius: 8px; position: relative; z-index: 9; }

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

        .slt-summary { background: ${THEME.panel}; border-radius: 8px; padding: 8px 13px; margin-bottom: 10px; font-size: 12px; color: ${THEME.textMuted}; display: flex; gap: 16px; flex-wrap: wrap; border-left: 3px solid ${THEME.primary}; }
        .slt-stop-alert { background: ${THEME.bgDarker}; border-left: 4px solid ${THEME.danger}; border-radius: 6px; padding: 10px 14px; margin-bottom: 12px; font-size: 12px; color: ${THEME.text}; display: flex; align-items: center; gap: 10px; }
        .slt-control { display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 12px; color: ${THEME.textMuted}; background: ${THEME.panel}; padding: 4px 10px; border-radius: 7px; border: 1px solid ${THEME.border}; user-select: none; }
        .slt-control input { accent-color: ${THEME.primary}; width: 13px; height: 13px; cursor: pointer; margin: 0; }
        .slt-input { width: 40px; background: ${THEME.bgDark}; border: 1px solid ${THEME.border}; color: ${THEME.text}; font-size: 11px; padding: 2px 4px; border-radius: 4px; text-align: center; }
    `);

    /* ═══════════════════════════════════════════════════
       СКАНИРОВАНИЕ — фикс группировки по 9 ячеек
    ═══════════════════════════════════════════════════ */
    function scan() {
        cleanupHighlights();
        if (!selectedNumbers.size) return { results: [], stopReason: null, stoppedTicket: null };

        const tickets = document.querySelectorAll(SEL.TICKET);
        if (!tickets.length) return { results: [], stopReason: null, stoppedTicket: null };

        const results = [];
        let stopReason = null;
        let stoppedTicket = null;

        for (const ticket of tickets) {
            const idEl = ticket.querySelector(SEL.TICKET_ID);
            const rawId = idEl ? idEl.textContent.trim() : '—';
            const ticketId = rawId.replace(/[^0-9]/g, '') || rawId;

            // Берём ВСЕ ячейки подряд, так как они строго по 9 на строку
            const allSpans = [...ticket.querySelectorAll(SEL.NUMBER)];
            if (allSpans.length < 9) continue;

            const ticketNumSet = new Set();
            allSpans.forEach(s => {
                const n = parseInt(s.textContent.trim(), 10);
                if (!isNaN(n)) ticketNumSet.add(n);
            });

            const allMatched = [...selectedNumbers].filter(n => ticketNumSet.has(n)).sort((a, b) => a - b);
            if (!allMatched.length) continue;

            let matched = allMatched;
            let matchCount = allMatched.length;

            /* ── ЛОГИКА «ПОРОГ В ОДНОЙ СТРОКЕ» ── */
            if (checkSingleRow) {
                let bestRowMatches = [];

                // Режем DOM ровно по 9 элементов на строку
                for (let i = 0; i < allSpans.length; i += 9) {
                    const rowSpans = allSpans.slice(i, i + 9);
                    const rowNumSet = new Set();
                    rowSpans.forEach(s => {
                        const n = parseInt(s.textContent.trim(), 10);
                        if (!isNaN(n)) rowNumSet.add(n);
                    });

                    const rowMatches = [...selectedNumbers].filter(n => rowNumSet.has(n));
                    if (rowMatches.length > bestRowMatches.length) bestRowMatches = rowMatches;
                }

                if (bestRowMatches.length < stopThreshold) continue;
                matched = bestRowMatches.sort((a, b) => a - b);
                matchCount = matched.length;
            }

            const isFull = matched.length === selectedNumbers.size;

            // Подсветка только тех чисел, что вошли в matched
            allSpans.forEach(span => {
                const val = parseInt(span.textContent.trim(), 10);
                if (!isNaN(val) && matched.includes(val)) {
                    span.setAttribute('data-slt-hit', '1');
                    span.classList.add('slt-num-hit', isFull ? 'full' : 'partial');
                }
            });

            results.push({ ticket, ticketId, rawId, matched, count: matchCount, isFull });

            if (isFull) { stopReason = 'Все выбранные числа найдены'; stoppedTicket = ticket; break; }
            if (matchCount >= stopThreshold) {
                stopReason = checkSingleRow ? `≥${stopThreshold} в одной строке` : `≥${stopThreshold} совпадений`;
                stoppedTicket = ticket; break;
            }
        }

        results.sort((a, b) => b.count - a.count);
        if (results.length) results[0].ticket.classList.add('slt-ticket-best');

        lastResults = results;
        const payload = { results, stopReason, stoppedTicket };

        if (!stopReason && autoLoadEnabled && !isWaitingForLoad) clickLoadMoreAndRescan();
        return payload;
    }

    /* ═══════════════════════════════════════════════════
       ЗАГРУЗКА БИЛЕТОВ
    ═══════════════════════════════════════════════════ */
    function clickLoadMoreAndRescan() {
        const loadBtn = document.querySelector(SEL.LOAD_BTN);
        if (!loadBtn) return;

        isWaitingForLoad = true; loadBtn.click();
        let timeoutId = null;
        const observer = new MutationObserver((mutations, obs) => {
            const hasNew = mutations.some(m => [...m.addedNodes].some(n => n.nodeType === 1 && (n.matches?.(SEL.TICKET) || n.querySelector?.(SEL.TICKET))));
            if (!hasNew) return;
            obs.disconnect(); if (timeoutId) clearTimeout(timeoutId);
            isWaitingForLoad = false;
            setTimeout(() => {
                const { results } = scan();
                const body = document.getElementById('slt-results-body');
                if (body) renderResults(body, results);
            }, 300);
        });
        observer.observe(document.body, { childList: true, subtree: true });
        timeoutId = setTimeout(() => { observer.disconnect(); if (isWaitingForLoad) isWaitingForLoad = false; }, 10000);
    }

    /* ═══════════════════════════════════════════════════
       РЕНДЕР
    ═══════════════════════════════════════════════════ */
    function renderResults(container, results) {
        if (!container) return; container.innerHTML = '';
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
        if (results.stopReason) html += `<span>🛑 Остановка: <b style="color:${THEME.danger}">${results.stopReason}</b></span>`;
        summary.innerHTML = html; container.appendChild(summary);

        if (results.stopReason && results.stoppedTicket) {
            const alert = document.createElement('div'); alert.className = 'slt-stop-alert';
            const tid = results.stoppedTicket.querySelector(SEL.TICKET_ID)?.textContent.trim() || '—';
            alert.innerHTML = `<span style="font-size:16px">⚠️</span><div style="flex:1"><div style="font-weight:700;color:${THEME.danger}">Сканирование остановлено</div><div style="color:${THEME.textMuted};margin-top:2px">Найдено ≥${stopThreshold} совпадений в строке (билет <b style="color:${THEME.info}">${tid}</b>).</div></div>`;
            container.appendChild(alert);
        }

        const tbl = document.createElement('table'); tbl.style.cssText = 'width:100%;border-collapse:collapse';
        tbl.innerHTML = `<thead><tr style="background:${THEME.bgDarker};font-size:12px;color:${THEME.textMuted}"><th style="padding:7px 6px 7px 10px;text-align:left;font-weight:600">#</th><th style="padding:7px 6px;text-align:left;font-weight:600">Номер билета</th><th style="padding:7px 6px;text-align:center;font-weight:600">Совп.</th><th style="padding:7px 10px 7px 6px;text-align:left;font-weight:600">Числа</th></tr></thead><tbody id="slt-tbody"></tbody>`;
        container.appendChild(tbl); const tbody = tbl.querySelector('#slt-tbody');

        results.forEach((r, i) => {
            const baseBg = i % 2 === 0 ? THEME.bg : THEME.bgDark;
            const ratio = r.count / selectedNumbers.size;
            const countColor = r.isFull ? THEME.highlight : ratio >= .6 ? THEME.success : ratio >= .3 ? THEME.warning : THEME.info;
            const numsHtml = r.matched.map(n => `<span style="background:${THEME.bgDarker};color:${THEME.primary};border:1px solid ${THEME.border};padding:1px 5px;border-radius:5px;margin:1px;display:inline-block;font-size:11px;font-weight:700">${n}</span>`).join('');
            const tr = document.createElement('tr'); tr.className = 'slt-row';
            tr.style.cssText = `background:${baseBg};${i===0?`border-left:3px solid ${THEME.highlight}`:''}`;
            tr.innerHTML = `<td style="padding:7px 6px 7px 10px;color:${THEME.textMuted};font-size:11px">${i+1}</td><td style="padding:7px 6px"><span style="font-weight:700;font-size:12px;color:${r.isFull?THEME.highlight:THEME.text}">${r.ticketId}</span>${r.isFull?`<span style="margin-left:5px;font-size:9px;font-weight:700;background:${THEME.highlight};color:${THEME.bgDark};padding:1px 5px;border-radius:4px">★ ПОЛНОЕ</span>`:''}${i===0?`<span style="margin-left:5px;font-size:9px;font-weight:700;background:${THEME.primary};color:${THEME.bgDark};padding:1px 5px;border-radius:4px">👑 ТОП</span>`:''}</td><td style="padding:7px 6px;text-align:center"><span style="background:${THEME.bgDarker};color:${countColor};border:1px solid ${countColor}66;padding:2px 10px;border-radius:10px;font-weight:700;font-size:12px">${r.count}/${selectedNumbers.size}</span></td><td style="padding:7px 10px 7px 6px;line-height:2">${numsHtml}</td>`;
            tr.onclick = () => selectTicketRow(r, tr, results); tbody.appendChild(tr);
        });
    }

    /* ═══════════════════════════════════════════════════
       ВСПОМОГАТЕЛЬНЫЕ
    ═══════════════════════════════════════════════════ */
    function selectTicketRow(r, tr, results) {
        document.querySelectorAll('.slt-row.slt-row-active').forEach(el => el.classList.remove('slt-row-active'));
        tr.classList.add('slt-row-active');
        document.querySelectorAll('.slt-ticket-best, .slt-ticket-selected').forEach(el => el.classList.remove('slt-ticket-best', 'slt-ticket-selected'));
        if (results.length) results[0].ticket.classList.add('slt-ticket-best');
        r.ticket.classList.add(r === results[0] ? 'slt-ticket-best' : 'slt-ticket-selected');
        r.ticket.scrollIntoView({ behavior: 'smooth', block: 'center' }); activeTicket = r.ticket;
    }
    function toggleNumber(n, btn) {
        selectedNumbers.has(n) ? (selectedNumbers.delete(n), btn.classList.remove('active')) : (selectedNumbers.add(n), btn.classList.add('active'));
        const el = document.getElementById('slt-sel-count'); if (el) el.textContent = `${selectedNumbers.size} выбрано`; triggerAutoScan();
    }
    function refreshNumBtns() {
        document.querySelectorAll('.slt-num-btn').forEach(btn => { const n = parseInt(btn.dataset.num, 10); btn.classList.toggle('active', selectedNumbers.has(n)); });
        const el = document.getElementById('slt-sel-count'); if (el) el.textContent = `${selectedNumbers.size} выбрано`;
    }
    function cleanupHighlights() {
        document.querySelectorAll(`${SEL.NUMBER}[data-slt-hit]`).forEach(s => { s.removeAttribute('data-slt-hit'); s.classList.remove('slt-num-hit', 'full', 'partial'); });
        document.querySelectorAll('.slt-ticket-best, .slt-ticket-selected').forEach(el => el.classList.remove('slt-ticket-best', 'slt-ticket-selected'));
    }
    let autoScanTimer = null;
    function triggerAutoScan() {
        const panel = document.getElementById(PANEL_ID); if (!panel || panel.dataset.autoscan !== '1') return;
        clearTimeout(autoScanTimer); autoScanTimer = setTimeout(() => {
            const { results } = scan(); const body = document.getElementById('slt-results-body');
            if (body) 'requestIdleCallback' in window ? requestIdleCallback(() => renderResults(body, results), { timeout: 500 }) : renderResults(body, results);
        }, 300);
    }

    /* ═══════════════════════════════════════════════════
       ПАНЕЛЬ
    ═══════════════════════════════════════════════════ */
    function buildPanel() {
        const existing = document.getElementById(PANEL_ID);
        let savedLeft = null, savedTop = null;
        if (existing) { savedLeft = existing.style.left; savedTop = existing.style.top; existing.remove(); }

        const panel = document.createElement('div'); panel.id = PANEL_ID; panel.dataset.autoscan = '1';
        panel.style.cssText = `position:fixed;top:${savedTop||'16px'};${savedLeft?`left:${savedLeft}`:'right:16px'};width:600px;height:70vh;min-height:360px;background:${THEME.bg};color:${THEME.text};border-radius:14px;border:1px solid ${THEME.border};box-shadow:0 16px 48px #00000099,0 0 0 1px ${THEME.hover}22;z-index:2147483647;overflow:hidden;display:flex;flex-direction:column`;

        const head = document.createElement('div'); head.style.cssText = `background:${THEME.bgDark};border-bottom:1px solid ${THEME.border};padding:10px 14px;display:flex;align-items:center;justify-content:space-between;cursor:grab;user-select:none;flex-shrink:0`;
        head.innerHTML = `<div style="display:flex;align-items:center;gap:10px"><span style="font-size:14px;font-weight:700;color:${THEME.primary}">🎯 Сканер</span></div><div style="display:flex;gap:8px;align-items:center"><label class="slt-control"><input type="checkbox" id="slt-autoscan" checked><span>Авто</span></label><label class="slt-control"><input type="checkbox" id="slt-autoload" checked><span>Автозагрузка</span></label><label class="slt-control" title="Считать совпадения в каждой строке отдельно"><input type="checkbox" id="slt-single-row"><span>По строкам</span></label><button id="slt-scan-btn" class="slt-hbtn slt-hbtn--primary">▶ Скан</button><button id="slt-close" class="slt-hbtn slt-hbtn--danger" style="width:30px;height:30px;padding:0;display:flex;align-items:center;justify-content:center;font-size:16px">✕</button></div>`;

        const numsSection = document.createElement('div'); numsSection.style.cssText = `background:${THEME.bgDark};border-bottom:1px solid ${THEME.border};padding:8px 14px;flex-shrink:0`;
        numsSection.innerHTML = `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:7px"><span style="font-size:11px;font-weight:700;color:${THEME.info};letter-spacing:.5px">ЧИСЛА <span id="slt-sel-count" style="background:${THEME.panel};color:${THEME.primary};padding:1px 8px;border-radius:8px;font-size:10px;margin-left:5px">${selectedNumbers.size} выбрано</span></span><div style="display:flex;gap:6px;align-items:center"><div style="display:flex;align-items:center;gap:4px;font-size:11px;color:${THEME.info}"><span>Порог:</span><input type="number" id="slt-threshold" class="slt-input" min="1" max="90" value="${stopThreshold}"></div><button id="slt-nums-default" class="slt-hbtn slt-hbtn--success" style="font-size:11px;padding:3px 9px">↺</button><button id="slt-nums-clear" class="slt-hbtn slt-hbtn--danger" style="font-size:11px;padding:3px 9px">✕</button><button id="slt-nums-all" class="slt-hbtn slt-hbtn--warning" style="font-size:11px;padding:3px 9px">✦</button></div></div><div id="slt-nums-grid" style="display:grid;grid-template-columns:repeat(15,1fr);gap:3px"></div>`;

        const grid = numsSection.querySelector('#slt-nums-grid');
        for (let n = 1; n <= 90; n++) { const btn = document.createElement('button'); btn.className = 'slt-num-btn' + (selectedNumbers.has(n) ? ' active' : ''); btn.textContent = n; btn.dataset.num = n; btn.onclick = () => toggleNumber(n, btn); grid.appendChild(btn); }

        const body = document.createElement('div'); body.id = 'slt-results-body'; body.style.cssText = 'overflow-y:auto;padding:10px 12px;flex:1;min-height:0';
        panel.append(head, numsSection, body); document.body.appendChild(panel);

        panel.querySelector('#slt-close').onclick = () => { cleanupHighlights(); panel.remove(); };
        panel.querySelector('#slt-scan-btn').onclick = () => { const { results } = scan(); const el = document.getElementById('slt-results-body'); if (el) renderResults(el, results); };
        panel.querySelector('#slt-autoscan').onchange = function () { panel.dataset.autoscan = this.checked ? '1' : '0'; };
        panel.querySelector('#slt-autoload').onchange = function () { autoLoadEnabled = this.checked; };
        panel.querySelector('#slt-single-row').onchange = function () { checkSingleRow = this.checked; };
        panel.querySelector('#slt-threshold').onchange = function () { const v = parseInt(this.value, 10); if (!isNaN(v) && v >= 1 && v <= 90) stopThreshold = v; else this.value = stopThreshold; };
        panel.querySelector('#slt-nums-default').onclick = () => { selectedNumbers = new Set(DEFAULT_NUMBERS); refreshNumBtns(); triggerAutoScan(); };
        panel.querySelector('#slt-nums-clear').onclick = () => { selectedNumbers.clear(); refreshNumBtns(); cleanupHighlights(); lastResults = []; renderResults(document.getElementById('slt-results-body'), []); };
        panel.querySelector('#slt-nums-all').onclick = () => { for (let n = 1; n <= 90; n++) selectedNumbers.add(n); refreshNumBtns(); triggerAutoScan(); };
        enableDrag(panel, head);
        renderResults(body, lastResults?.results || lastResults);
    }

    /* ═══════════════════════════════════════════════════
       DRAG & DROP
    ═══════════════════════════════════════════════════ */
    function enableDrag(el, handle) {
        let ox, oy, sl, st, wasRight;
        handle.addEventListener('mousedown', e => {
            if (e.target.closest('button,input,label')) return; e.preventDefault();
            const r = el.getBoundingClientRect(); ox = e.clientX; oy = e.clientY; sl = r.left; st = r.top; wasRight = el.style.right; el.style.right = 'auto'; handle.style.cursor = 'grabbing';
            const onMove = e => { el.style.left = `${sl + e.clientX - ox}px`; el.style.top = `${st + e.clientY - oy}px`; };
            const onUp = () => { handle.style.cursor = 'grab'; if (wasRight) el.style.right = wasRight; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
            window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp);
        });
    }

    /* ═══════════════════════════════════════════════════
       ГЛОБАЛЬНЫЙ OBSERVER
    ═══════════════════════════════════════════════════ */
    let mutTimer = null;
    const globalObserver = new MutationObserver(mutations => {
        const hasNew = mutations.some(m => [...m.addedNodes].some(n => n.nodeType === 1 && (n.matches?.(SEL.TICKET) || n.querySelector?.(SEL.TICKET))));
        if (!hasNew) return; clearTimeout(mutTimer);
        mutTimer = setTimeout(() => {
            const panel = document.getElementById(PANEL_ID);
            if (!panel || panel.dataset.autoscan !== '1' || isWaitingForLoad) return;
            const { results } = scan(); const body = document.getElementById('slt-results-body');
            if (body) renderResults(body, results);
        }, 500);
    });

    /* ═══════════════════════════════════════════════════
       ТРИГГЕР
    ═══════════════════════════════════════════════════ */
    function addTriggerBtn() {
        if (document.getElementById(BTN_ID)) return;
        const btn = document.createElement('button'); btn.id = BTN_ID; btn.title = 'Открыть / закрыть сканер'; btn.innerHTML = '🎯';
        btn.style.cssText = `position:fixed;bottom:24px;right:24px;z-index:2147483646;width:50px;height:50px;border:2px solid ${THEME.primary};background:${THEME.bg};font-size:22px;cursor:pointer;transition:transform .2s,box-shadow .2s;display:flex;align-items:center;justify-content:center`;
        btn.onmouseenter = () => { btn.style.transform = 'scale(1.12)'; btn.style.boxShadow = `0 6px 26px #00000099, 0 0 20px ${THEME.primary}88`; };
        btn.onmouseleave = () => { btn.style.transform = 'scale(1)'; btn.style.boxShadow = `0 4px 20px #00000077, 0 0 14px ${THEME.primary}44`; };
        btn.onclick = () => { if (document.getElementById(PANEL_ID)) { cleanupHighlights(); document.getElementById(PANEL_ID).remove(); } else buildPanel(); };
        document.body.appendChild(btn);
    }

    /* ═══════════════════════════════════════════════════
       ИНИЦИАЛИЗАЦИЯ
    ═══════════════════════════════════════════════════ */
    function init() {
        addTriggerBtn(); globalObserver.observe(document.body, { childList: true, subtree: true });
        buildPanel();
        setTimeout(() => { const { results } = scan(); const body = document.getElementById('slt-results-body'); if (body) renderResults(body, results); }, 800);
    }

    document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
})();
