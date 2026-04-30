// ==UserScript==
// @name         🎯 Stoloto ГЖЛТ — Сканер v5
// @namespace    https://stoloto.ru/
// @version      5.0
// @description  Интерактивный сканер билетов ГЖЛТ. Тема Dracula.
// @author       Expert JS Team
// @match        https://www.stoloto.ru/gzhl/game*
// @match        https://stoloto.ru/gzhl/game*
// @grant        GM_addStyle
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    /* ═══════════════════════════════════════════════════
       DRACULA PALETTE
    ═══════════════════════════════════════════════════ */
    const D = {
        bg:         '#282a36',
        bgDark:     '#1e1f29',
        bgDarker:   '#191a24',
        curLine:    '#44475a',
        selection:  '#44475a',
        comment:    '#6272a4',
        fg:         '#f8f8f2',
        fgMuted:    '#bfbfbf',
        cyan:       '#8be9fd',
        green:      '#50fa7b',
        orange:     '#ffb86c',
        pink:       '#ff79c6',
        purple:     'yellow',
        red:        '#ff5555',
        yellow:     'red',
        /* производные */
        borderDim:  '#44475a',
        borderBright: '#6272a4',
    };

    /* ═══════════════════════════════════════════════════
       ДЕФОЛТНЫЕ ЧИСЛА
    ═══════════════════════════════════════════════════ */
    const DEFAULT_NUMBERS = new Set([
        6, 11, 34, 45, 58, 67, 75, 82, 80, 81, 83, 46, 48, 39,
        1, 4, 2, 8, 14, 16, 23, 30, 38, 50, 52, 57, 61, 65, 70, 74
    ]);

    let selectedNumbers = new Set(DEFAULT_NUMBERS);
    let lastResults     = [];
    let activeTicket    = null;

    const PANEL_ID = 'slt-panel';
    const BTN_ID   = 'slt-trigger-btn';

    /* ═══════════════════════════════════════════════════
       ГЛОБАЛЬНЫЕ СТИЛИ
    ═══════════════════════════════════════════════════ */
    GM_addStyle(`
        #${PANEL_ID} * {
            box-sizing: border-box;
            font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
        }

        /* Скроллбар */
        #${PANEL_ID} ::-webkit-scrollbar { width: 5px; height: 5px; }
        #${PANEL_ID} ::-webkit-scrollbar-track { background: ${D.bgDarker}; }
        #${PANEL_ID} ::-webkit-scrollbar-thumb {
            background: ${D.comment};
            border-radius: 4px;
        }

        /* Кнопки чисел */
        .slt-num-btn {
            width: 100%;
            aspect-ratio: 1;
            border-radius: 6px;
            border: 1px solid ${D.borderDim};
            background: ${D.curLine};
            color: ${D.fgMuted};
            font-size: 11px;
            font-weight: 600;
            cursor: pointer;
            transition: all .13s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            user-select: none;
            padding: 0;
        }
        .slt-num-btn:hover {
            border-color: ${D.purple};
            color: ${D.fg};
            background: ${D.selection};
        }
        .slt-num-btn.active {
            background: ${D.purple};
            border-color: ${D.purple};
            color: ${D.bgDark};
            font-weight: 800
        }

        /* Строки таблицы */
        .slt-row { cursor: pointer; transition: background .13s; }
        .slt-row:hover td { background: ${D.selection} !important; }
        .slt-row.slt-row-active td {
            background: ${D.comment}33 !important;
            outline: 1px solid ${D.cyan};
        }

        /* Выделение билетов в DOM */
        .slt-ticket-best {
            outline: 3px solid ${D.yellow} !important;
            outline-offset: 4px;
            position: relative;
            z-index: 10;
        }
        .slt-ticket-selected {
            outline: 3px solid ${D.cyan} !important;
            outline-offset: 4px;
            border-radius: 8px;
            position: relative;
            z-index: 9;
        }

        /* Кнопки шапки */
        .slt-hbtn {
            border-radius: 7px;
            padding: 4px 12px;
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
            transition: all .15s;
            font-family: inherit;
        }
        .slt-hbtn:hover { filter: brightness(1.18); transform: translateY(-1px); }
        .slt-hbtn:active { transform: translateY(0); }
    `);

    /* ═══════════════════════════════════════════════════
       СКАНИРОВАНИЕ
    ═══════════════════════════════════════════════════ */
    function scan() {
        /* Сброс выделений */
        document.querySelectorAll('.slt-ticket-best, .slt-ticket-selected').forEach(el =>
            el.classList.remove('slt-ticket-best', 'slt-ticket-selected')
        );
        document.querySelectorAll('[data-test-id="number"][data-slt-hit]').forEach(s => {
            s.removeAttribute('data-slt-hit');
            s.style.cssText = '';
        });
        activeTicket = null;

        if (!selectedNumbers.size) { lastResults = []; return []; }

        const tickets = document.querySelectorAll('[data-test-id="ticket"]');
        if (!tickets.length) { lastResults = []; return []; }

        const results = [];

        tickets.forEach(ticket => {
            /* Номер билета */
            const idEl     = ticket.querySelector('[data-test-id="ticket-number"]');
            const rawId    = idEl ? idEl.textContent.trim() : '—';
            const ticketId = rawId.replace(/[^0-9]/g, '') || rawId;

            /* Числа билета */
            const spans      = [...ticket.querySelectorAll('[data-test-id="number"]')];
            const validSpans = spans.filter(s => s.textContent.trim() !== '');
            const numSet     = new Set(
                validSpans
                    .map(s => parseInt(s.textContent.trim(), 10))
                    .filter(n => !isNaN(n))
            );

            /* Сравнение */
            const matched = [...selectedNumbers]
                .filter(t => numSet.has(t))
                .sort((a, b) => a - b);
            if (!matched.length) return;

            const isFull = matched.length === selectedNumbers.size;

            /* Подсветка чисел в билете */
            validSpans.forEach(span => {
                const val = parseInt(span.textContent.trim(), 10);
                if (selectedNumbers.has(val)) {
                    span.setAttribute('data-slt-hit', '1');
                    Object.assign(span.style, {
                        background   : isFull ? D.yellow  : D.purple,
                        color        : isFull ? D.bgDark  : D.bgDark,
                        fontWeight   : '800',
                        transition   : 'all .2s',
                    });
                }
            });

            results.push({ ticket, ticketId, rawId, matched, count: matched.length, isFull });
        });

        results.sort((a, b) => b.count - a.count);

        /* Рамка вокруг лучшего билета */
        if (results.length) results[0].ticket.classList.add('slt-ticket-best');

        lastResults = results;
        return results;
    }

    /* ═══════════════════════════════════════════════════
       РЕНДЕР РЕЗУЛЬТАТОВ
    ═══════════════════════════════════════════════════ */
    function renderResults(container, results) {
        container.innerHTML = '';

        /* Обновляем счётчик выбранных */
        const selCountEl = document.getElementById('slt-sel-count');
        if (selCountEl) selCountEl.textContent = `${selectedNumbers.size} выбрано`;

        if (!results.length) {
            container.innerHTML = `
                <div style="
                    text-align:center; padding:30px 20px;
                    color:${D.comment}; line-height:2;
                ">
                    <div style="font-size:32px; margin-bottom:8px;">🧛</div>
                    <div style="color:${D.fgMuted};">Совпадений не найдено.</div>
                    <div style="font-size:11px; color:${D.comment}; margin-top:4px;">
                        Выберите числа и нажмите
                        <b style="color:${D.purple};">▶ Скан</b>
                    </div>
                </div>`;
            return;
        }

        /* Сводка */
        const fullCnt = results.filter(r => r.isFull).length;
        const summary = document.createElement('div');
        summary.style.cssText = `
            background: ${D.curLine};
            border-radius: 8px;
            padding: 8px 13px;
            margin-bottom: 10px;
            font-size: 12px;
            color: ${D.fgMuted};
            display: flex;
            gap: 16px;
            flex-wrap: wrap;
            border-left: 3px solid ${D.purple};
        `;
        summary.innerHTML =
            `<span>🗂 Билетов: <b style="color:${D.green};">${results.length}</b></span>` +
            `<span>🎯 Чисел выбрано: <b style="color:${D.purple};">${selectedNumbers.size}</b></span>` +
            (fullCnt
                ? `<span>⭐ Полных: <b style="color:${D.yellow};">${fullCnt}</b></span>`
                : '');
        container.appendChild(summary);

        /* Таблица */
        const tbl = document.createElement('table');
        tbl.style.cssText = 'width:100%; border-collapse:collapse;';
        tbl.innerHTML = `
            <thead>
                <tr style="background:${D.bgDarker}; font-size:12px; color:${D.comment};">
                    <th style="padding:7px 6px 7px 10px; text-align:left; font-weight:600;">#</th>
                    <th style="padding:7px 6px; text-align:left; font-weight:600;">Номер билета</th>
                    <th style="padding:7px 6px; text-align:center; font-weight:600;">Совп.</th>
                    <th style="padding:7px 10px 7px 6px; text-align:left; font-weight:600;">Числа</th>
                </tr>
            </thead>
            <tbody id="slt-tbody"></tbody>
        `;
        container.appendChild(tbl);
        const tbody = tbl.querySelector('#slt-tbody');

        results.forEach((r, i) => {
            const baseBg  = i % 2 === 0 ? D.bg : D.bgDark;
            const ratio   = r.count / selectedNumbers.size;

            const countColor = r.isFull   ? D.yellow
                             : ratio >= .6 ? D.green
                             : ratio >= .3 ? D.orange
                             :               D.cyan;

            const numsHtml = r.matched.map(n =>
                `<span style="
                    background:${D.bgDarker};
                    color:${D.purple};
                    border:1px solid ${D.comment};
                    padding:1px 5px;
                    border-radius:5px;
                    margin:1px;
                    display:inline-block;
                    font-size:11px;
                    font-weight:700;">${n}</span>`
            ).join('');

            const tr = document.createElement('tr');
            tr.className = 'slt-row';
            tr.style.cssText = `
                background: ${baseBg};
                ${i === 0 ? `border-left: 3px solid ${D.yellow};` : ''}
            `;

            tr.innerHTML = `
                <td style="padding:7px 6px 7px 10px; color:${D.comment}; font-size:11px;">
                    ${i + 1}
                </td>
                <td style="padding:7px 6px;">
                    <span style="
                        font-weight:700; font-size:12px;
                        color:${r.isFull ? D.yellow : D.fg};">
                        ${r.ticketId}
                    </span>
                    ${r.isFull
                        ? `<span style="
                                margin-left:5px; font-size:9px; font-weight:700;
                                background:${D.yellow}; color:${D.bgDark};
                                padding:1px 5px; border-radius:4px;">★ ПОЛНОЕ</span>`
                        : ''}
                    ${i === 0
                        ? `<span style="
                                margin-left:5px; font-size:9px; font-weight:700;
                                background:${D.purple}; color:${D.bgDark};
                                padding:1px 5px; border-radius:4px;">👑 ТОП</span>`
                        : ''}
                </td>
                <td style="padding:7px 6px; text-align:center;">
                    <span style="
                        background:${D.bgDarker};
                        color:${countColor};
                        border:1px solid ${countColor}66;
                        padding:2px 10px;
                        border-radius:10px;
                        font-weight:700;
                        font-size:12px;">
                        ${r.count}/${selectedNumbers.size}
                    </span>
                </td>
                <td style="padding:7px 10px 7px 6px; line-height:2;">${numsHtml}</td>
            `;

            tr.onclick = () => selectTicketRow(r, tr, results);
            tbody.appendChild(tr);
        });
    }

    /* ═══════════════════════════════════════════════════
       ВЫДЕЛЕНИЕ БИЛЕТА ПО КЛИКУ
    ═══════════════════════════════════════════════════ */
    function selectTicketRow(r, tr, results) {
        document.querySelectorAll('.slt-row.slt-row-active').forEach(el =>
            el.classList.remove('slt-row-active')
        );
        tr.classList.add('slt-row-active');

        document.querySelectorAll('.slt-ticket-best, .slt-ticket-selected').forEach(el =>
            el.classList.remove('slt-ticket-best', 'slt-ticket-selected')
        );

        if (results.length) results[0].ticket.classList.add('slt-ticket-best');

        r.ticket.classList.add(r === results[0] ? 'slt-ticket-best' : 'slt-ticket-selected');
        r.ticket.scrollIntoView({ behavior: 'smooth', block: 'center' });
        activeTicket = r.ticket;
    }

    /* ═══════════════════════════════════════════════════
       ПЕРЕКЛЮЧЕНИЕ ЧИСЛА
    ═══════════════════════════════════════════════════ */
    function toggleNumber(n, btn) {
        if (selectedNumbers.has(n)) {
            selectedNumbers.delete(n);
            btn.classList.remove('active');
        } else {
            selectedNumbers.add(n);
            btn.classList.add('active');
        }
        const el = document.getElementById('slt-sel-count');
        if (el) el.textContent = `${selectedNumbers.size} выбрано`;
        triggerAutoScan();
    }

    function refreshNumBtns() {
        document.querySelectorAll('.slt-num-btn').forEach(btn => {
            const n = parseInt(btn.dataset.num, 10);
            btn.classList.toggle('active', selectedNumbers.has(n));
        });
        const el = document.getElementById('slt-sel-count');
        if (el) el.textContent = `${selectedNumbers.size} выбрано`;
    }

    /* ═══════════════════════════════════════════════════
       АВТО-СКАН
    ═══════════════════════════════════════════════════ */
    let autoScanDebounce = null;
    function triggerAutoScan() {
        const panel = document.getElementById(PANEL_ID);
        if (!panel || panel.dataset.autoscan !== '1') return;
        clearTimeout(autoScanDebounce);
        autoScanDebounce = setTimeout(() => {
            const res  = scan();
            const body = document.getElementById('slt-results-body');
            if (body) renderResults(body, res);
        }, 400);
    }

    /* ═══════════════════════════════════════════════════
       ОЧИСТКА ПОДСВЕТКИ
    ═══════════════════════════════════════════════════ */
    function cleanupHighlights() {
        document.querySelectorAll('[data-test-id="number"][data-slt-hit]').forEach(s => {
            s.removeAttribute('data-slt-hit');
            s.style.cssText = '';
        });
        document.querySelectorAll('.slt-ticket-best, .slt-ticket-selected').forEach(el =>
            el.classList.remove('slt-ticket-best', 'slt-ticket-selected')
        );
    }

    /* ═══════════════════════════════════════════════════
       ПОСТРОЕНИЕ ПАНЕЛИ
    ═══════════════════════════════════════════════════ */
    function buildPanel() {
        const existing = document.getElementById(PANEL_ID);
        let savedLeft = null, savedTop = null;
        if (existing) {
            savedLeft = existing.style.left;
            savedTop  = existing.style.top;
            existing.remove();
        }

        const panel = document.createElement('div');
        panel.id = PANEL_ID;
        panel.dataset.autoscan = '1'; /* авто-скан включён по умолчанию */
        panel.style.cssText = `
            position: fixed;
            top: ${savedTop  || '16px'};
            ${savedLeft ? `left: ${savedLeft}` : 'right: 16px'};
            width: 600px;
            height: 70vh;
            min-height: 360px;
            background: ${D.bg};
            color: ${D.fg};
            border-radius: 14px;
            border: 1px solid ${D.borderDim};
            box-shadow: 0 16px 48px #00000099, 0 0 0 1px ${D.comment}22;
            z-index: 2147483647;
            overflow: hidden;
            display: flex;
            flex-direction: column;
        `;

        /* ╔══════════════════════════════╗
           ║           ШАПКА             ║
           ╚══════════════════════════════╝ */
        const head = document.createElement('div');
        head.style.cssText = `
            background: ${D.bgDark};
            border-bottom: 1px solid ${D.borderDim};
            padding: 10px 14px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            cursor: grab;
            user-select: none;
            flex-shrink: 0;
        `;
        head.innerHTML = `
            <div style="display:flex; align-items:center; gap:10px;">
                <span style="font-size:14px; font-weight:700; color:${D.purple};">
                    🎯 ГЖЛТ Сканер
                </span>
                <span style="
                    font-size:10px; color:${D.comment};
                    background:${D.curLine}; padding:2px 7px;
                    border-radius:5px; letter-spacing:.5px;">
                    Dracula
                </span>
            </div>
            <div style="display:flex; gap:8px; align-items:center;">

                <!-- Чекбокс авто-скан -->
                <label style="
                    display:flex; align-items:center; gap:6px;
                    cursor:pointer; font-size:12px; color:${D.fgMuted};
                    background:${D.curLine}; padding:4px 10px;
                    border-radius:7px; border:1px solid ${D.borderDim};
                    user-select:none;
                ">
                    <input type="checkbox" id="slt-autoscan" checked
                        style="
                            accent-color:${D.purple};
                            width:13px; height:13px;
                            cursor:pointer; margin:0;
                        ">
                    <span>Авто-скан</span>
                </label>

                <!-- Кнопка Скан -->
                <button id="slt-scan-btn" class="slt-hbtn" style="
                    background:${D.purple}; color:${D.bgDark};
                    border:1px solid ${D.purple};">
                    ▶ Скан
                </button>

                <!-- Закрыть -->
                <button id="slt-close" class="slt-hbtn" style="
                    background:${D.curLine}; color:${D.red};
                    border:1px solid ${D.borderDim};
                    width:30px; height:30px; padding:0;
                    display:flex; align-items:center; justify-content:center;
                    font-size:16px;">
                    ✕
                </button>
            </div>
        `;

        /* ╔══════════════════════════════╗
           ║        СЕТКА ЧИСЕЛ          ║
           ╚══════════════════════════════╝ */
        const numsSection = document.createElement('div');
        numsSection.style.cssText = `
            background: ${D.bgDark};
            border-bottom: 1px solid ${D.borderDim};
            padding: 8px 14px;
            flex-shrink: 0;
        `;

        /* Заголовок секции */
        const numsHeader = document.createElement('div');
        numsHeader.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 7px;
        `;
        numsHeader.innerHTML = `
            <span style="font-size:11px; font-weight:700; color:${D.cyan}; letter-spacing:.5px;">
                ЧИСЛА
                <span id="slt-sel-count" style="
                    background:${D.curLine}; color:${D.purple};
                    padding:1px 8px; border-radius:8px;
                    font-size:10px; margin-left:5px;">
                    ${selectedNumbers.size} выбрано
                </span>
            </span>
            <div style="display:flex; gap:6px;">
                <button id="slt-nums-default" class="slt-hbtn" style="
                    background:${D.curLine}; color:${D.green};
                    border:1px solid ${D.borderDim}; font-size:11px; padding:3px 9px;">
                    ↺ По умолч.
                </button>
                <button id="slt-nums-clear" class="slt-hbtn" style="
                    background:${D.curLine}; color:${D.red};
                    border:1px solid ${D.borderDim}; font-size:11px; padding:3px 9px;">
                    ✕ Сброс
                </button>
                <button id="slt-nums-all" class="slt-hbtn" style="
                    background:${D.curLine}; color:${D.orange};
                    border:1px solid ${D.borderDim}; font-size:11px; padding:3px 9px;">
                    ✦ Все
                </button>
            </div>
        `;

        /* Сетка 1–90 (15 колонок × 6 рядов) */
        const numsGrid = document.createElement('div');
        numsGrid.id = 'slt-nums-grid';
        numsGrid.style.cssText = `
            display: grid;
            grid-template-columns: repeat(15, 1fr);
            gap: 3px;
        `;

        for (let n = 1; n <= 90; n++) {
            const btn = document.createElement('button');
            btn.className   = 'slt-num-btn' + (selectedNumbers.has(n) ? ' active' : '');
            btn.textContent = n;
            btn.dataset.num = n;
            btn.title       = `Число ${n}`;
            btn.onclick     = () => toggleNumber(n, btn);
            numsGrid.appendChild(btn);
        }

        numsSection.appendChild(numsHeader);
        numsSection.appendChild(numsGrid);

        /* ╔══════════════════════════════╗
           ║         РЕЗУЛЬТАТЫ          ║
           ╚══════════════════════════════╝ */
        const body = document.createElement('div');
        body.id = 'slt-results-body';
        body.style.cssText = `
            overflow-y: auto;
            padding: 10px 12px;
            flex: 1;
            min-height: 0;
        `;

        /* Сборка */
        panel.append(head, numsSection, body);
        document.body.appendChild(panel);

        /* ── СОБЫТИЯ ── */
        panel.querySelector('#slt-close').onclick = () => {
            cleanupHighlights();
            panel.remove();
        };

        panel.querySelector('#slt-scan-btn').onclick = () => {
            const res  = scan();
            const bodyEl = document.getElementById('slt-results-body');
            if (bodyEl) renderResults(bodyEl, res);
        };

        panel.querySelector('#slt-autoscan').addEventListener('change', function () {
            panel.dataset.autoscan = this.checked ? '1' : '0';
        });

        panel.querySelector('#slt-nums-default').onclick = () => {
            selectedNumbers = new Set(DEFAULT_NUMBERS);
            refreshNumBtns();
            triggerAutoScan();
        };

        panel.querySelector('#slt-nums-clear').onclick = () => {
            selectedNumbers.clear();
            refreshNumBtns();
            cleanupHighlights();
            lastResults = [];
            renderResults(document.getElementById('slt-results-body'), []);
        };

        panel.querySelector('#slt-nums-all').onclick = () => {
            for (let n = 1; n <= 90; n++) selectedNumbers.add(n);
            refreshNumBtns();
            triggerAutoScan();
        };

        enableDrag(panel, head);

        /* Начальный рендер результатов */
        renderResults(body, lastResults);
    }

    /* ═══════════════════════════════════════════════════
       DRAG & DROP
    ═══════════════════════════════════════════════════ */
    function enableDrag(el, handle) {
        let ox, oy, sl, st;
        handle.addEventListener('mousedown', e => {
            if (e.target.closest('button, input, label')) return;
            e.preventDefault();
            const r = el.getBoundingClientRect();
            ox = e.clientX; oy = e.clientY;
            sl = r.left;    st = r.top;
            el.style.right = 'auto';
            handle.style.cursor = 'grabbing';

            const onMove = e => {
                el.style.left = `${sl + e.clientX - ox}px`;
                el.style.top  = `${st + e.clientY - oy}px`;
            };
            const onUp = () => {
                handle.style.cursor = 'grab';
                window.removeEventListener('mousemove', onMove);
                window.removeEventListener('mouseup',   onUp);
            };
            window.addEventListener('mousemove', onMove);
            window.addEventListener('mouseup',   onUp);
        });
    }

    /* ═══════════════════════════════════════════════════
       MutationObserver — авто-скан при подгрузке билетов
    ═══════════════════════════════════════════════════ */
    let mutDebounce = null;
    const observer = new MutationObserver(mutations => {
        /* Реагируем только если добавились новые билеты */
        const hasNewTickets = mutations.some(m =>
            [...m.addedNodes].some(n =>
                n.nodeType === 1 && (
                    n.matches?.('[data-test-id="ticket"]') ||
                    n.querySelector?.('[data-test-id="ticket"]')
                )
            )
        );
        if (!hasNewTickets) return;

        clearTimeout(mutDebounce);
        mutDebounce = setTimeout(() => {
            const panel = document.getElementById(PANEL_ID);
            if (!panel || panel.dataset.autoscan !== '1') return;
            const res  = scan();
            const body = document.getElementById('slt-results-body');
            if (body) renderResults(body, res);
        }, 700);
    });

    /* ═══════════════════════════════════════════════════
       КНОПКА-ТРИГГЕР (свернуть / развернуть)
    ═══════════════════════════════════════════════════ */
    function addTriggerBtn() {
        if (document.getElementById(BTN_ID)) return;
        const btn = document.createElement('button');
        btn.id    = BTN_ID;
        btn.title = 'Открыть / закрыть сканер';
        btn.innerHTML = '🎯';
        btn.style.cssText = `
            position: fixed;
            bottom: 24px; right: 24px;
            z-index: 2147483646;
            width: 50px; height: 50px;
            border: 2px solid ${D.purple};
            background: ${D.bg};
            font-size: 22px;
            cursor: pointer;
            transition: transform .2s, box-shadow .2s;
            display: flex; align-items: center; justify-content: center;
        `;
        btn.onmouseenter = () => {
            btn.style.transform = 'scale(1.12)';
            btn.style.boxShadow = `0 6px 26px #00000099, 0 0 20px ${D.purple}88`;
        };
        btn.onmouseleave = () => {
            btn.style.transform = 'scale(1)';
            btn.style.boxShadow = `0 4px 20px #00000077, 0 0 14px ${D.purple}44`;
        };
        btn.onclick = () => {
            if (document.getElementById(PANEL_ID)) {
                cleanupHighlights();
                document.getElementById(PANEL_ID).remove();
            } else {
                buildPanel();
            }
        };
        document.body.appendChild(btn);
    }

    /* ═══════════════════════════════════════════════════
       ИНИЦИАЛИЗАЦИЯ
    ═══════════════════════════════════════════════════ */
    function init() {
        addTriggerBtn();
        observer.observe(document.body, { childList: true, subtree: true });

        /* Панель открыта по умолчанию + сразу сканируем */
        buildPanel();
        setTimeout(() => {
            const res  = scan();
            const body = document.getElementById('slt-results-body');
            if (body) renderResults(body, res);
        }, 1200); /* небольшая задержка — даём странице отрисовать билеты */
    }

    document.readyState === 'loading'
        ? document.addEventListener('DOMContentLoaded', init)
        : init();

})();
