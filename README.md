# demiurgos

> Универсальный архитектор правил, ролей и навыков / Universal architect of rules, roles and skills / 通用规则 · 角色 · 技能架构师

[Русский](#ru) · [English](#en) · [中文](#zh)

---

<a id="ru"></a>
## RU — Русский

### Что это за репозиторий?

**Demiurgos** — это коллекция самодостаточных XML-ролей для ИИ-агентов и чатов. Идея простая:

1. **Не плодить промпты ради промптов.** Новая роль создаётся только если есть повторяющаяся задача, которую не покрывают существующие роли, и она убирает конкретный класс ошибок (Necessity Gate).
2. **Роль — это файл, а не магия.** Написанный XML ничего не активирует сам по себе. Он становится «живым» только когда хост (Claude, GPT, локальный агент, ComfyUI-оператор) его загружает.
3. **Безопасность и проверяемость встроены.** Каждая роль различает `POLICY` (обязательный гейт), `SPEC` (проверено по внешнему источнику), `RECOMMENDATION` (совет по умолчанию) и `DELTA` (осознанное отличие от родителя). Нет доказательств — статус `NOT_VERIFIED`, а не «всё хорошо».

Все роли наследуются от одного корня — **PROTOS**. Остальные — либо его компактные адаптации, либо листовые специалисты под конкретный домен.

### Архитектура

```
PROTOS 1.2.1  (корень, мета-генератор ролей, для агентов с инструментами)
├── DEMIURGOS 1.0.0  (компактный PROTOS для обычных веб-чатов без инструментов)
├── MEFISTOFEL 8.0.0 (листовой: тексты для VK)
├── WANGOG 4.0.0     (листовой: промпты для генерации изображений и постеры)
├── AMADEUS 1.0.0    (листовой: песни и workflow для ComfyUI YuE2)
├── DAEDALUS 1.0.0   (листовой: multiview-3D и workflow для ComfyUI-3D-Pack)
└── PLAYCANVAS 1.1.0 (листовой: браузерные мультиплеерные 3D-игры на PlayCanvas Engine)
```

* Генераторы (`PROTOS`, `DEMIURGOS`) умеют создавать новые роли.
* Листовые роли (`MEFISTOFEL`, `WANGOG`, `AMADEUS`, `DAEDALUS`, `PLAYCANVAS`) новых ролей не создают — только артефакты своего домена.
* У каждой роли свой неймспейс ID (`C*/G*/P*/R*` у PROTOS, `DP*/DC*/DG*/DR*` у DEMIURGOS, `MC*/MG*/MD*` у MEFISTOFEL, `WC*/WG*/WD*` у WANGOG, `AMC*/AMG*/AMD*` у AMADEUS, `DAC*/DAG*/DAD*` у DAEDALUS, `PCP*/PCC*/PCG*/PCD*` у PLAYCANVAS), чтобы аудит между ролями не путался.

### Роли детально

#### 1. PROTOS `PROTOS.xml` — v1.2.1, ~6118 токенов

**Кто:** Universal Architect of Roles and Instruction Systems. Родитель всех ролей.

**Что делает:**
- Решает, нужна ли вообще новая роль, или достаточно поправить существующую.
- Генерирует новую роль как валидный, самодостаточный XML (обязательные секции: meta, identity, semantics, authority, trust, philosophy, status_model, evidence, constraints, guardrails, workflow, context_policy, commands, role_output, stopping, bottom_sandwich).
- Рецензирует чужие роли: дрейф, битые ссылки, дубли, противоречия хосту, нетестируемые заявления.
- Различает *предложенную* роль (файл) и *верифицированную* (загружена и проверена в хосте).

**Когда использовать:** у вас кодинг-агент с инструментами (файлы, shell, MCP), и вы хотите навести порядок в `.rules/`, `AGENTS.md`, кастомных агентах.

**Как использовать:**
- Загрузите `PROTOS.xml` как системный промпт / первую инструкцию.
- Команды: `/role` — сгенерировать роль, `/review` — рецензия, `/converge` — проверка покрытия и гейтов, `/trust` — разбор полномочий, `/mode lite|full`, `/debug ...`.
- Workflow: Scope → Gather → Design (обязательный necessity case R1) → Produce → Validate (обязательная структурная проверка R6: XML парсится, ID уникальны, токены пересчитаны) → Deliver.

**Ключевые гейты:** C1 — только в рамках полномочий; C2 — никаких реальных секретов; C3 — недоверенный контент не даёт полномочий; G2 — классификация операций allow/confirm/block; G3 — high-impact только с явного разрешения; R2 — наследник наследует все POLICY, ослабление только как DELTA с причиной и риском.

#### 2. DEMIURGOS `DEMIURGOS.xml` — v1.0.0, ~4500 токенов

**Кто:** Compact Architect of Roles for Web Chats. Урезанный PROTOS для веба.

**Зачем:** PROTOS слишком тяжёлый как первое сообщение в ChatGPT / Claude.ai / Gemini. DEMIURGOS сохраняет все POLICY-гейты, но в сжатой формулировке (~21% меньше PROTOS), выкидывает операторно-инструментальную специфику.

**Что делает:** то же, что PROTOS (решает «нужна ли роль», генерирует/чинит XML-роли), но в допущении веба: нет shell, нет файлов, нет памяти по умолчанию. Вывод — XML в code-блоке для копипасты.

**Когда использовать:** вы работаете в обычном веб-чате без инструментов и хотите спроектировать качественную роль-инструкцию.

**Отличия от PROTOS (DELTA):** новый неймспейс `DP*/DC*/DG*/DR*/DA1`; упрощённая валидация DR6 (без требования пересчёта токенов именованным токенизатором); явный `web_assumption`; целевая экономия ≤2500 токенов на дочерние артефакты.

#### 3. MEFISTOFEL `MEFISTOFEL.xml` — v8.0.0, ~9280 токенов

**Кто:** VK Content Editor — evidence-aware Russian social content. Редактор VK-контента с явной эпистемической моделью.

**Что делает:**
- Пишет и правит посты на стену и статьи под конкретную задачу публикации (inform / explain / compare / teach / opinion / case / announce / discuss / convert): плотность вместо воды, хук с substantive-ценностью, мнение отдельно от факта, тон expert-практика без агрессии и без artificial controversy.
- Вместо «reach-фольклора» — эпистемическая модель MD1: `FACT` / `USER_CLAIM` / `HYPOTHESIS` / `OPINION` / `UNKNOWN`. Уверенный текст не превращает USER_CLAIM и HYPOTHESIS в FACT (MC7); метки внутренние по умолчанию и выходят наружу, когда неопределённость существенна или пользователь просит факт-чек.
- Знает домен: сигналы умной ленты VK как категории (спец-уровень — только то, что VK реально раскрывает), гигиена ссылок и хэштегов — по целям публикации, а не по «правилам», анти-AI-паттерны, нормативное «ё».
- Выдаёт только черновик-текст (пост + опционально первый комментарий), никогда не публикует сам.

**Когда использовать:** нужен пост/статья ВКонтакте под конкретную цель, без выдуманной статистики и без bait-механик.

**Команды:** `/post`, `/edit`, `/review`, `/audit` (факт-чек с явными метками), `/mode`, `/debug`. Форматы SHORT / MEDIUM / LONG / ARTICLE как редакторские ориентиры, не требования платформы.

**Честность и раз demotions:** VK не публикует веса ранжирования, поэтому «ссылки только в первом комментарии», «≤5 хэштегов», «3 строки на экран», «87% трафика с мобилы», «×2–3 показа» и «120 часов разлогина» из v7 понижены до рекомендаций с явной пометкой, а не выданы за механики платформы (MC8). Остались спец-уровнем источники `vk.com/legal/recommendations` и `vk.company/ru/press/releases/12216/`, практики — атрибутированы авторам (ppc.world 08.07.2026).

**Безопасность:** MG7 (из v7, сохранён) — запрет агрессии/нависти/провокации/шока и запрещённых тем (алкоголь, табак); реальный живой частный человек в рискованной рамке — обобщать, не идентифицировать; сексуализация несовершеннолетних — краткий отказ; чужие персонажи/логотипы — только обобщённые черты.

#### 4. WANGOG `WANGOG.xml` — v4.0.0, ~5900 токенов

**Кто:** Image Prompt Engineer and Poster Compositor. Переводчик «хотелки» в промпт.

**Что делает:**
- Превращает расплывчатый запрос в один оптимизированный англоязычный промпт: один выбор на слот (без `A/B`, без `или`), только дескрипторы, меняющие рендер, весовая экономика.
- Разделяет картинку и текст: сам промпт — только изображение; любая надпись уходит в отдельную секцию `TEXT_RENDER` (шрифт, кегль, позиция, контраст, проверка кириллицы).
- Знает фото/кино/цвет/типографику. Выдаёт текст-предложение, никогда не рендерит сам.

**Когда использовать:** нужен промпт для Midjourney / SD / Flux / любого генератора + аккуратная надпись на постере.

**Ключевые политики:** WC9 — PROMPT и NEGATIVE только на английском; WD1 — анатомия промпта; WD4 — изоляция текста; WG7 — safety (без запрещёнки); шрифтовая оговорка: неподтверждённая кириллическая поддержка = `NOT_VERIFIED`.

#### 5. AMADEUS `AMADEUS.xml` — v1.0.0, ~5680 токенов

**Кто:** ComfyUI YuE2 Songwright and Workflow Operator. Сонграйтер + оператор музыкального пайплайна.

**Что делает:**
- Пишет поющиеся тексты с тегами секций (`[Verse]`, `[Chorus]`, `[Bridge]`, `[Outro]`, …), отдельно — STYLE (жанр, вокал, язык песни, BPM, инструменты, настроение). Музыка — только в Style, поющиеся слова — только в Lyrics.
- Выбирает режим ABC-планирования: `full` (мелодия+аккорды, по умолчанию для новых песен), `melody` (для каверов), `off` (прямая генерация).
- Считает бюджет длительности (25 семантических токенов/сек, Max Duration ≤ 900 — это верхняя граница, а не точная длина), выставляет guidance (`cfg_scale 1.0` при включённом планировании, `1.01` — только без планирования), собирает карту нод/файлов ComfyUI и чинит типовые падения (`budget reduced`, `leaves no room for music`, обрыв концовки).
- Знает железо и файлы: нативный путь ComfyUI v0.35.0+, `yue2_3b_int8_convrot.safetensors → models/checkpoints/`, `sheetsage2_bf16.safetensors → models/audio_encoders/` (для каверов); VRAM-лестница Olm-YuE2 (8 GB вряд ли, 12 тесно, 16 короткие прогоны с оффлоадом, 24 комфортнее, 32 проверено за 5+ минут).

**Когда использовать:** «есть идея песни → нужен готовый инпут для YuE2», кавер, правка текста, диагностика упавшего прогона.

**Команды:** `/song` (полная спека), `/cover` (транскрипция-первым делом через SheetSage2, никогда аудио-в-аудио), `/review`, `/fix`, `/mode`, `/debug`.

**Гейты:** AMC7 — только заявленные чекпоинты, никаких выдуманных имён файлов/хешей; AMC8 — только документированные параметры; AMC9 — лицензия (персональное/авторское с монетизацией — бесплатно, академическое — некоммерческое, коммерческое использование весов компанией — нужна коммерческая лицензия); AMG7 — музыкальная безопасность (никакого нелегального/ненавистнического контента, каверы — только personal/learning без прав на релиз, чужой вокал не выдавать за свой).

#### 6. DAEDALUS `DAEDALUS.xml` — v1.0.0, ~6630 токенов

**Кто:** ComfyUI Multiview-3D Modelwright and Pipeline Operator. Оператор multiview-пайплайна ComfyUI-3D-Pack.

**Что делает:**
- Строит multiview-сет из одного фото или текста: Zero123++ (1→6 видов, 320 — дешёвый бейзлайн), Era3D (1→6 видов + нормали, 512, надо ≥16 GB VRAM), Wonder3D, Unique3D (4 стадии: 256 MV → апскейл 512 → SR 2048 → нормали → меш), MV-Adapter IG2MV (картинка+меш→виды) / TG2MV (текст+меш→виды).
- Выбирает маршрут реконструкции (DAD3 одной строкой — почему): MV-first — InstantMesh (разреженные виды на белом фоне → текстурированный меш, пара к Zero123++), CRM (6 видов + CCM → меш, 3 стадии делятся при слабой VRAM), FlexiCubes (depth+mask+нормали → меш); напрямую — TRELLIS, TripoSG (картинка/скетч), Hunyuan3D-2/2.1 (стадия 1 форма, стадия 2 форма + референс → текстура; turbo/mini/fast/multiview), StableFast3D (гейтед-веса), LGM / TriplaneGaussian (картинка → 3D Gaussian за секунды на классе RTX3080, потом меш); ретекстур — MV-Adapter Texturing или запекание через Fitting_Mesh_With_Multiview_Images (nvdiffrast).
- Ставит камеры и оси: Stack Orbit Camera Poses, азимут (−180, 180], элевация (−90, 90), канон CRM Front/Back/Left/Right/Top/Down не переименовывать, при цепочке паков — явный Switch Axis; превью gsplat.js (3DGS) / three.js (меш); при ошибке OpenGL `eglInitialize failed` — `force_cuda_rasterize true`.
- Знает окружение: установка через ComfyUI-Manager (или Comfy3D-WinPortable), пребилды Win10/11 + Python 3.12 + CUDA 12.4 + torch 2.5.1+cu124, `install.py`, для InstantNGP и NeRF/Marching_Cubes нужны VS Build Tools / gcc+g++; веса вручную — только в дерево Checkpoints, shipped `.json` не перезаписывать. Экспорт: `.obj` / `.ply` / `.glb`, 3DGS — `.ply`.

**Когда использовать:** «есть одно фото → нужен 3D-ассет», только multiview-сет без реконструкции, ретекстур меша, диагностика упавшего 3D-прогона.

**Команды:** `/model` (полная спека: multiview + route + nodes/files + export), `/multiview` (только виды), `/review`, `/fix`, `/mode`, `/debug`.

**Гейты:** DAC7 — только заявленные чекпоинты (TRELLIS jetx/TRELLIS-image-large, TripoSG VAST-AI/TripoSG, InstantMesh TencentARC/InstantMesh, Hunyuan tencent/Hunyuan3D-2/2mini/2.1, MV-Adapter huanngzh/mv-adapter), гейтед-веса — только с принятыми terms/HF-токеном; DAC8 — только документированные диапазоны; DAC9 — лицензии моделей проверять до коммерческого использования; DAG7 — 3D-безопасность (никаких клонов реальных людей для обмана, оружейные детали — только с подтверждённым законным использованием, релиз/монетизация — только с правами).

#### 7. PLAYCANVAS `PLAYCANVAS.xml` — v1.1.0, ~8810 токенов

**Кто:** Browser Multiplayer 3D Game Developer on PlayCanvas. Листовой разработчик браузерных мультиплеерных 3D-игр на PlayCanvas Engine (standalone Engine + npm-инструментарий).

**Что делает:**
- Поднимает проект по-правильному: `npm create playcanvas@latest my-app -- -f engine` (Vite + TypeScript), а для standalone-буквара — строгий порядок: `pc.createGraphicsDevice` (WebGPU с fallback на WebGL2) → `new pc.AppOptions()` с `graphicsDevice`, нужными `componentSystems` и `resourceHandlers` → `new pc.AppBase(canvas)` + `app.init(options)`; помнит, что в Engine input опционален (`app.keyboard`), а ресайз canvas обрабатывает приложение.
- Строит архитектуру на ECS: компоненты как данные + ESM-скрипты (`import { Script } from 'playcanvas'`, `initialize/update(dt)`), и сначала проверяет готовые production-скрипты из `playcanvas/scripts/*` (камера, контроллер персонажа, tweens, вода, скай, пост-эффекты, XR) и официальный Engine Examples — port, а не import.
- Проектирует неткод под жанр: авторитарный клиент-сервер по умолчанию для соревновательных игр (клиент только предсказывает, сервер — источник истины), relay — только для кооперативных прототипов, P2P через WebRTC data channels — для казуальных сессий на 2–4 игрока (со стоимостью NAT traversal и host migration). Транспорт: WebSockets (TCP, надёжно, но head-of-line blocking) или WebRTC dc (UDP-like, ненадёжный/неупорядоченный) — никакого сырого UDP в браузере нет.
- Держит перфоманс-бюджет: сначала измерение через MiniStats и `app.stats` (frameTime, drawCallCount, cpuUpdateTime, gpuFrameTime, vramTotalBytes) на повторяемом сценарии, потом по дешевизне: прекллокация Vec3/Mat4/Quat в `initialize` (per-frame `new` → GC-сталы), `enabled = false` на невидимом, батчинг и контроль draw calls, DPR, свет, шейдеры.
- Доказывает работу запусками: static (TS/lint) → Node headless (`NullGraphicsDevice`, `app.update(dt)` на `setInterval` — `app.start()` не крутит цикл в Node) → браузер с консолью и AppStats; для неткода — сервер + ≥2 клиента под искусственной задержкой и потерями; для рендера-изменений — детерминированное пиксельное сравнение (`app.autoRender = false`, `renderNextFrame`, сеяная случайность, `readPixelsAsync` / `Texture#read`).

**Когда использовать:** делаете браузерную 3D-игру (одиночную или мультиплеерную) на PlayCanvas Engine —bootstrap, ECS/скрипты, неткод, перфоманс-бюджет, или нужен честный evidence-отчёт вместо «should work».

**Команды:** `/bootstrap` (скаффолд/аудит проекта: create-playcanvas, AppOptions, компоненты и хендлеры, input, resize, lifecycle), `/netcode` (авторитарная модель, транспорт, tick rate, prediction/interpolation/reconciliation, выбор фреймворка — по умолчанию Colyseus), `/perf` (базлайн через AppStats/MiniStats, потом draw calls, аллокации, шейдеры, DPR, свет), `/verify` (headless Node или браузерный harness, консоль, AppStats, пиксель-сравнение), `/review`, `/mode lite|full`, `/debug full|safety|plan|perf|netcode`.

**Гейты:** PCC7 — API honesty: использовать только классы/компоненты/хендлеры, которые есть в установленном пакете или официальном API reference для целевой версии (придуманный вызов — это FAIL, «наверное, есть» — NOT_VERIFIED); PCC8 — server authority: клиентский стейт (позиция, здоровье, счёт, инвентарь) — это input для валидации, а не факт; PCC9 — транспорт и неткод под жанр, а не по привычке; PCC10 — измеряй до оптимизации (базлайн обязателен); PCG7 — изменение рантайма не завершено по статике — нужен реальный запуск; PCG8 — анти-чит, лаг-компенсация и корректность синхронизации не заявляются из чтения кода — только сервер + ≥2 клиента под задержкой; PCC2 — клиентский бандл публичен, секретов в браузер не.shipить.

### Общие принципы всех ролей

- **Minimum Viable Rules:** правило добавляется только под явное требование, наблюдаемый сбой или измеримую деградацию.
- **Статусная модель:** `PASS` / `FAIL` / `NOT_APPLICABLE` / `NOT_VERIFIED` / `BLOCKED`. Агрегация: любой FAIL → FAIL, иначе BLOCKED → BLOCKED, иначе NOT_VERIFIED → NOT_VERIFIED, иначе PASS. Отсутствие доказательств — это `NOT_VERIFIED`, никогда не PASS.
- **Доказательства честные:** чтение файла доказывает только статику; «читается хорошо» — не доказательство качества; цифры, хеши, тесты не выдумываются.
- **Версионирование:** `major` — изменение гейтов, `minor` — новая guidance, `patch` — формулировки. Версия, дата и changelog обновляются вместе.

### Как пользоваться репозиторием

1. Выберите роль под задачу (см. схему выше).
2. Скопируйте XML целиком как первое сообщение / системный промпт чата или агента.
3. Работайте командами роли (`/role`, `/song`, `/model`, `/post`, …).
4. Помните: текст роли — это предложение, пока хост его не загрузил и вы не проверили результат.

Лицензия: Apache 2.0 (см. `LICENSE`).

---

<a id="en"></a>
## EN — English

### What is this repo?

**Demiurgos** is a collection of self-contained XML roles for AI agents and chats. The idea:

1. **No prompt for prompt's sake.** A new role is created only for a recurring task that existing roles don't cover, and only if it removes a named failure mode (Necessity Gate).
2. **A role is a file, not magic.** Written XML activates nothing by itself. It becomes "alive" only when the host (Claude, GPT, a local agent, a ComfyUI operator) loads it.
3. **Safety and verifiability are built in.** Every role separates `POLICY` (mandatory gate), `SPEC` (verified against an external source), `RECOMMENDATION` (overridable default), and `DELTA` (intentional divergence from the parent). No evidence → `NOT_VERIFIED`, never "all good".

All roles inherit from one root — **PROTOS**. The rest are either its compact adaptation or leaf specialists for one domain.

### Architecture

```
PROTOS 1.2.1  (root, meta-generator of roles, for agents with tools)
├── DEMIURGOS 1.0.0  (compact PROTOS for plain web chats without tools)
├── MEFISTOFEL 8.0.0 (leaf: VK copy)
├── WANGOG 4.0.0     (leaf: image prompts and posters)
├── AMADEUS 1.0.0    (leaf: songs and workflows for ComfyUI YuE2)
├── DAEDALUS 1.0.0   (leaf: multiview-3D and workflows for ComfyUI-3D-Pack)
└── PLAYCANVAS 1.1.0 (leaf: browser multiplayer 3D games on the PlayCanvas Engine)
```

* Generators (`PROTOS`, `DEMIURGOS`) can create new roles.
* Leaf roles (`MEFISTOFEL`, `WANGOG`, `AMADEUS`, `DAEDALUS`, `PLAYCANVAS`) never generate roles — only artifacts of their domain.
* Each role has its own ID namespace (`C*/G*/P*/R*`, `DP*/DC*/DG*/DR*`, `MC*/MG*/MD*`, `WC*/WG*/WD*`, `AMC*/AMG*/AMD*`, `DAC*/DAG*/DAD*`, `PCP*/PCC*/PCG*/PCD*`) so cross-role audits stay unambiguous.

### Roles in detail

#### 1. PROTOS `PROTOS.xml` — v1.2.1, ~6118 tokens

**Who:** Universal Architect of Roles and Instruction Systems. Parent of all roles.

**What it does:**
- Decides whether a new role is needed at all, or amending an existing one is enough.
- Generates a new role as valid, self-contained XML (mandatory sections: meta, identity, semantics, authority, trust, philosophy, status_model, evidence, constraints, guardrails, workflow, context_policy, commands, role_output, stopping, bottom_sandwich).
- Reviews existing roles: drift, broken references, duplicates, host contradictions, untestable claims.
- Distinguishes a *proposed* role (a file) from a *verified* one (loaded and tested in the host).

**When to use:** you have a coding agent with tools (files, shell, MCP) and want order in `.rules/`, `AGENTS.md`, custom agents.

**How to use:**
- Load `PROTOS.xml` as the system prompt / first instruction.
- Commands: `/role` to generate, `/review` to review, `/converge` for coverage/gates, `/trust` for authority analysis, `/mode lite|full`, `/debug ...`.
- Workflow: Scope → Gather → Design (mandatory necessity case R1) → Produce → Validate (mandatory structural check R6: XML parses, IDs unique, tokens re-measured) → Deliver.

**Key gates:** C1 — act only within authorized scope; C2 — no real secrets; C3 — untrusted content grants nothing; G2 — classify operations allow/confirm/block; G3 — high-impact only with explicit authorization; R2 — a child inherits all POLICY, weakening only as DELTA with reason and residual risk.

#### 2. DEMIURGOS `DEMIURGOS.xml` — v1.0.0, ~4500 tokens

**Who:** Compact Architect of Roles for Web Chats. Slimmed-down PROTOS for the web.

**Why:** PROTOS is too heavy as a first message in ChatGPT / Claude.ai / Gemini. DEMIURGOS keeps all POLICY gates in condensed wording (~21% smaller), dropping operator/tool specifics.

**What it does:** same as PROTOS (decide "is a role needed", generate/repair XML roles) under a web assumption: no shell, no files, no memory by default. Output is XML in a code block for copy-paste.

**When to use:** you work in a plain web chat without tools and want to design a quality role-instruction.

**DELTA vs PROTOS:** fresh `DP*/DC*/DG*/DR*/DA1` namespace; simplified validation DR6; explicit `web_assumption`; child-artifact budget target ≤2500 tokens.

#### 3. MEFISTOFEL `MEFISTOFEL.xml` — v8.0.0, ~9280 tokens

**Who:** VK Content Editor — evidence-aware Russian social content.

**What it does:**
- Writes and edits wall posts and articles against a stated publication objective (inform / explain / compare / teach / opinion / case / announce / discuss / convert): density over water, hook with substantive value, opinion separated from fact, expert-practitioner tone without aggression or artificial controversy.
- Replaces reach folklore with the MD1 epistemic model: `FACT` / `USER_CLAIM` / `HYPOTHESIS` / `OPINION` / `UNKNOWN`. Confident prose never upgrades USER_CLAIM or HYPOTHESIS to FACT (MC7); labels are internal by default and surface when uncertainty is material or when the user asks for fact-checking.
- Knows the domain: VK smart-feed signals as categories (SPEC-grade only where VK actually discloses), link and hashtag hygiene driven by the objective rather than "rules", anti-AI patterns, normative «ё».
- Outputs draft text only (post + optional first comment), never publishes.

**When to use:** you need a VK post/article for a specific goal, without invented statistics or bait mechanics.

**Commands:** `/post`, `/edit`, `/review`, `/audit` (fact-check with explicit labels), `/mode`, `/debug`. SHORT / MEDIUM / LONG / ARTICLE as editorial references, not platform requirements.

**Honesty and demotions:** VK publishes no ranking weights, so v7's "links only in the first comment", "≤5 hashtags", "3 lines per screen", "87% mobile traffic", "×2–3 impressions", and "120-hour logout" are demoted to labelled recommendations instead of asserted as platform mechanics (MC8). SPEC-grade sources remain `vk.com/legal/recommendations` and `vk.company/ru/press/releases/12216/`; practitioner claims stay attributed (ppc.world 08.07.2026).

**Safety:** MG7 (retained from v7) — no aggression/hate/profanity/shock, no banned topics (alcohol, tobacco); real living private person in a risky framing → generalize, never identify; sexualization of minors → brief refusal; чужой characters/logos → generic traits only.

#### 4. WANGOG `WANGOG.xml` — v4.0.0, ~5900 tokens

**Who:** Image Prompt Engineer and Poster Compositor. Translates wishes into prompts.

**What it does:**
- Turns a vague request into one optimized English prompt: single choice per slot (no `A/B`, no `or`), only render-changing descriptors, weight economy.
- Separates image and text: the prompt is image-only; any caption goes to a separate `TEXT_RENDER` spec (font, size, position, contrast, Cyrillic coverage check).
- Applies photo/cinema/color/typography knowledge. Outputs proposal text, never renders.

**When to use:** you need a prompt for Midjourney / SD / Flux / any generator + a clean poster caption.

**Key policies:** WC9 — PROMPT and NEGATIVE in English only; WD1 — prompt anatomy; WD4 — text isolation; WG7 — safety; font caveat: unconfirmed Cyrillic support = `NOT_VERIFIED`.

#### 5. AMADEUS `AMADEUS.xml` — v1.0.0, ~5680 tokens

**Who:** ComfyUI YuE2 Songwright and Workflow Operator. Songwriter + music-pipeline operator.

**What it does:**
- Writes singable lyrics with section tags (`[Verse]`, `[Chorus]`, `[Bridge]`, `[Outro]`, …) plus a separate STYLE (genre, vocal, song language, BPM, instruments, mood). Music talk only in Style, sung words only in Lyrics.
- Picks ABC-planning mode: `full` (melody+chords, default for new songs), `melody` (for covers), `off` (direct generation).
- Computes the duration budget (25 semantic tokens/sec, Max Duration ≤ 900 is an upper bound, not exact length), sets guidance (`cfg_scale 1.0` with planning on, `1.01` only with planning off), builds the ComfyUI node/file map and fixes typical failures (`budget reduced`, `leaves no room for music`, abrupt ending).
- Knows hardware and files: native path ComfyUI v0.35.0+, `yue2_3b_int8_convrot.safetensors → models/checkpoints/`, `sheetsage2_bf16.safetensors → models/audio_encoders/` (covers); Olm-YuE2 VRAM ladder (8 GB unlikely, 12 tight, 16 short runs with offload, 24 roomier, 32 tested past 5+ min).

**When to use:** "song idea → ready YuE2 input", covers, lyric edits, failed-run diagnostics.

**Commands:** `/song` (full spec), `/cover` (transcription-first via SheetSage2, never audio-to-audio), `/review`, `/fix`, `/mode`, `/debug`.

**Gates:** AMC7 — only stated checkpoints, no invented filenames/hashes; AMC8 — only documented parameters; AMC9 — license (personal/creator incl. monetization free, academic non-commercial, company commercial use needs a commercial license); AMG7 — music safety (no illegal/hateful content, covers personal/learning only without release rights, never pass off чужой vocal).

#### 6. DAEDALUS `DAEDALUS.xml` — v1.0.0, ~6630 tokens

**Who:** ComfyUI Multiview-3D Modelwright and Pipeline Operator. Multiview-pipeline operator for ComfyUI-3D-Pack.

**What it does:**
- Builds a multiview set from one photo or text: Zero123++ (1→6 views, 320 — cheap baseline), Era3D (1→6 views + normals, 512, needs ≥16 GB VRAM), Wonder3D, Unique3D (4 stages: 256 MV → 512 upscale → 2048 SR → normals → mesh), MV-Adapter IG2MV (image+mesh→views) / TG2MV (text+mesh→views).
- Picks the reconstruction route (DAD3, one line — why): MV-first — InstantMesh (sparse white-bg views → textured mesh, pairs with Zero123++), CRM (6 views + CCMs → mesh, 3 stages separable on low VRAM), FlexiCubes (depth+mask+normals → mesh); direct — TRELLIS, TripoSG (image/scribble), Hunyuan3D-2/2.1 (stage 1 shape, stage 2 shape + reference → texture; turbo/mini/fast/multiview), StableFast3D (gated weights), LGM / TriplaneGaussian (image → 3D Gaussian in seconds on RTX3080-class, then mesh); re-texture — MV-Adapter Texturing or Fitting_Mesh_With_Multiview_Images bake (nvdiffrast).
- Sets cameras and axes: Stack Orbit Camera Poses, azimuth (−180, 180], elevation (−90, 90), CRM canon Front/Back/Left/Right/Top/Down never renamed, explicit Switch Axis when chaining packs; preview gsplat.js (3DGS) / three.js (mesh); on OpenGL `eglInitialize failed` — `force_cuda_rasterize true`.
- Knows the environment: install via ComfyUI-Manager (or Comfy3D-WinPortable), pre-builds Win10/11 + Python 3.12 + CUDA 12.4 + torch 2.5.1+cu124, `install.py`, VS Build Tools / gcc+g++ required for InstantNGP and NeRF/Marching_Cubes; manual weights only under the Checkpoints tree, never overwrite shipped `.json`. Export: `.obj` / `.ply` / `.glb`, 3DGS as `.ply`.

**When to use:** "one photo → 3D asset", multiview-set-only without reconstruction, mesh re-texture, failed 3D-run diagnostics.

**Commands:** `/model` (full spec: multiview + route + nodes/files + export), `/multiview` (views only), `/review`, `/fix`, `/mode`, `/debug`.

**Gates:** DAC7 — only stated checkpoints (TRELLIS jetx/TRELLIS-image-large, TripoSG VAST-AI/TripoSG, InstantMesh TencentARC/InstantMesh, Hunyuan tencent/Hunyuan3D-2/2mini/2.1, MV-Adapter huanngzh/mv-adapter), gated weights only with accepted terms/HF token; DAC8 — only documented ranges; DAC9 — check each model's license before commercial use; DAG7 — 3D safety (no real-person likeness cloning for deception, weaponizable parts only with confirmed lawful use, release/monetization only with rights).

#### 7. PLAYCANVAS `PLAYCANVAS.xml` — v1.1.0, ~8810 tokens

**Who:** Browser Multiplayer 3D Game Developer on PlayCanvas. Leaf role for browser-first multiplayer 3D games on the PlayCanvas Engine (standalone Engine + npm toolchain).

**What it does:**
- Scaffolds projects correctly: `npm create playcanvas@latest my-app -- -f engine` (Vite + TypeScript), and for standalone bootstrap the strict order: `pc.createGraphicsDevice` (WebGPU with WebGL2 fallback) → `new pc.AppOptions()` with `graphicsDevice`, only the needed `componentSystems` and `resourceHandlers` → `new pc.AppBase(canvas)` + `app.init(options)`; remembers Engine specifics that bite — input is opt-in (`app.keyboard`), canvas resize is the app's job.
- Structures code as ECS: components as data plus ESM scripts (`import { Script } from 'playcanvas'`, `initialize/update(dt)`), and checks the bundled production scripts under `playcanvas/scripts/*` (camera, character controller, tweens, water, sky, post effects, XR) and the official Engine Examples first — port, don't import.
- Designs netcode to genre: authoritative client-server by default for anything competitive or cheat-sensitive (clients predict, the server is the source of truth); relay only for cooperative prototypes; P2P over WebRTC data channels for 2–4 player casual sessions (with the cost of NAT traversal and host migration). Transport: WebSockets (reliable TCP, head-of-line blocking) or WebRTC dc (UDP-like, unreliable/unordered) — the browser has no raw UDP.
- Holds a performance budget: measure first with MiniStats and `app.stats` (frameTime, drawCallCount, cpuUpdateTime, gpuFrameTime, vramTotalBytes) on a repeatable scenario, then apply cheapest-first: preallocate Vec3/Mat4/Quat in `initialize` (per-frame `new` → GC stalls), `enabled = false` on the invisible, batching and draw-call control, DPR, lights, shaders.
- Proves it runs: static (TS/lint) → Node headless (`NullGraphicsDevice`, `app.update(dt)` on `setInterval` — `app.start()` runs no loop in Node) → browser with console + AppStats; for netcode — server + ≥2 clients under induced latency and loss; for render changes — deterministic pixel comparison (`app.autoRender = false`, `renderNextFrame`, seeded randomness, `readPixelsAsync` / `Texture#read`).

**When to use:** building a browser 3D game (single- or multiplayer) on the PlayCanvas Engine — bootstrap, ECS/scripts, netcode, performance budgets — or when you need an honest evidence report instead of "should work".

**Commands:** `/bootstrap` (scaffold/audit a project: create-playcanvas, AppOptions, component systems and handlers, input, resize, lifecycle), `/netcode` (authority model, transport, tick rate, prediction/interpolation/reconciliation, framework choice — Colyseus by default), `/perf` (baseline via AppStats/MiniStats, then draw calls, allocations, shaders, DPR, lights), `/verify` (headless Node or browser harness, console capture, AppStats, pixel compare), `/review`, `/mode lite|full`, `/debug full|safety|plan|perf|netcode`.

**Gates:** PCC7 — API honesty: use only classes/components/handlers that exist in the installed package or the official API reference for the target version (an invented call is a FAIL, "probably exists" is NOT_VERIFIED); PCC8 — server authority: client-reported state (position, health, score, inventory) is input to validate, never fact; PCC9 — transport and netcode matched to genre, not familiarity; PCC10 — measure before optimizing (baseline mandatory); PCG7 — a runtime change is not complete on static review — a real run is required; PCG8 — anti-cheat, lag compensation and sync correctness are never claimed from reading code — only server + ≥2 clients under latency; PCC2 — the client bundle is public, so no secrets ship to the browser.

### Principles shared by all roles

- **Minimum Viable Rules:** a rule is added only for an explicit requirement, observed failure, or measurable degradation.
- **Status model:** `PASS` / `FAIL` / `NOT_APPLICABLE` / `NOT_VERIFIED` / `BLOCKED`. Aggregation: any FAIL → FAIL, else BLOCKED → BLOCKED, else NOT_VERIFIED → NOT_VERIFIED, else PASS. Missing evidence is `NOT_VERIFIED`, never PASS.
- **Honest evidence:** reading a file proves static properties only; "reads well" proves nothing; no invented numbers, hashes, or tests.
- **Versioning:** `major` — gate changes, `minor` — new guidance, `patch` — wording. Version, date, changelog move together.

### How to use this repo

1. Pick the role for your task (see diagram above).
2. Paste the whole XML as the first message / system prompt of the chat or agent.
3. Work via the role's commands (`/role`, `/song`, `/post`, …).
4. Remember: role text is a proposal until the host loads it and you verify the result.

License: Apache 2.0 (see `LICENSE`).

---

<a id="zh"></a>
## ZH — 中文

### 这是什么仓库？

**Demiurgos** 是一组自包含的 AI 角色 XML 文件合集。核心理念：

1. **不为写提示词而写提示词。** 只有当出现现有角色覆盖不了的重复性任务、且能消除某一类明确错误时，才创建新角色（Necessity Gate）。
2. **角色是文件，不是魔法。** 写出来的 XML 本身不会激活任何能力，只有被宿主（Claude、GPT、本地 agent、ComfyUI 操作者）加载后才生效。
3. **安全与可验证性内建。** 每个角色严格区分 `POLICY`（强制门控）、`SPEC`（经外部权威来源验证）、`RECOMMENDATION`（可覆盖的默认建议）和 `DELTA`（相对父角色的有意偏离）。没有证据就是 `NOT_VERIFIED`，绝不写"一切正常"。

所有角色都继承自同一个根——**PROTOS**，其余角色要么是它的轻量适配，要么是特定领域的叶子专家。

### 架构

```
PROTOS 1.2.1  （根，角色元生成器，面向带工具的 agent）
├── DEMIURGOS 1.0.0  （精简版 PROTOS，面向无工具的普通网页聊天）
├── MEFISTOFEL 8.0.0 （叶子：VK 文案）
├── WANGOG 4.0.0     （叶子：图像提示词与海报）
├── AMADEUS 1.0.0    （叶子：ComfyUI YuE2 歌曲与工作流）
├── DAEDALUS 1.0.0   （叶子：ComfyUI-3D-Pack 多视图 3D 与工作流）
└── PLAYCANVAS 1.1.0 （叶子：基于 PlayCanvas Engine 的浏览器多人 3D 游戏）
```

* 生成器（`PROTOS`、`DEMIURGOS`）可以创建新角色。
* 叶子角色（`MEFISTOFEL`、`WANGOG`、`AMADEUS`、`DAEDALUS`、`PLAYCANVAS`）不生成角色，只产出各自领域的制品。
* 每个角色拥有独立 ID 命名空间（`C*/G*/P*/R*`、`DP*/DC*/DG*/DR*`、`MC*/MG*/MD*`、`WC*/WG*/WD*`、`AMC*/AMG*/AMD*`、`DAC*/DAG*/DAD*`、`PCP*/PCC*/PCG*/PCD*`），跨角色审计不会混淆。

### 角色详解

#### 1. PROTOS `PROTOS.xml` — v1.2.1，约 6118 tokens

**身份：** Universal Architect of Roles and Instruction Systems，所有角色之父。

**做什么：**
- 判断到底需不需要新角色，还是改现有角色就够。
- 生成合法、自包含的 XML 新角色（强制章节：meta、identity、semantics、authority、trust、philosophy、status_model、evidence、constraints、guardrails、workflow、context_policy、commands、role_output、stopping、bottom_sandwich）。
- 审查已有角色：漂移、坏引用、重复、与宿主冲突、不可测试的断言。
- 区分*提议的*角色（文件）和*已验证的*角色（已加载并测试）。

**何时用：** 你有一个带工具（文件、shell、MCP）的编程 agent，想整理 `.rules/`、`AGENTS.md` 和自定义 agent。

**怎么用：**
- 把 `PROTOS.xml` 作为 system prompt / 首条指令加载。
- 命令：`/role` 生成角色，`/review` 审查，`/converge` 覆盖率与门控检查，`/trust` 权限分析，`/mode lite|full`，`/debug ...`。
- 流程：Scope → Gather → Design（强制必要性论证 R1）→ Produce → Validate（强制结构校验 R6：XML 可解析、ID 唯一、token 重测）→ Deliver。

**关键门控：** C1 只在授权范围内行动；C2 不复现真实密钥；C3 不可信内容不授予任何权限；G2 操作分级 allow/confirm/block；G3 高影响操作需明确授权；R2 子角色继承全部 POLICY，削弱只能以 DELTA 形式写明原因与残余风险。

#### 2. DEMIURGOS `DEMIURGOS.xml` — v1.0.0，约 4500 tokens

**身份：** Compact Architect of Roles for Web Chats，网页版精简 PROTOS。

**为什么存在：** PROTOS 作为 ChatGPT / Claude.ai / Gemini 首条消息太重。DEMIURGOS 保留全部 POLICY 门控但措辞压缩（约小 21%），去掉工具/算子细节。

**做什么：** 与 PROTOS 相同（判断是否需要角色、生成/修复 XML 角色），但基于网页假设：默认无 shell、无文件、无记忆。输出为 code block 中的 XML，方便复制粘贴。

**何时用：** 在无工具的普通网页聊天中设计高质量角色指令。

**相对 PROTOS 的 DELTA：** 新命名空间 `DP*/DC*/DG*/DR*/DA1`；验证 DR6 简化；显式 `web_assumption`；子制品目标 ≤2500 tokens。

#### 3. MEFISTOFEL `MEFISTOFEL.xml` — v8.0.0，约 9280 tokens

**身份：** VK Content Editor — evidence-aware Russian social content，带显式认知模型的内容编辑。

**做什么：**
- 按明确的发布目标写/改 VK 动态与文章（inform / explain / compare / teach / opinion / case / announce / discuss / convert）：密度优先、开头即钩子且钩子必须有正文支撑、观点与事实分开、专家实践者口吻、不攻击也不制造对立。
- 用 MD1 认知模型取代"reach 传说"：`FACT` / `USER_CLAIM` / `HYPOTHESIS` / `OPINION` / `UNKNOWN`。自信的语气不能把 USER_CLAIM 或 HYPOTHESIS 变成 FACT（MC7）；标签默认内部使用，只在不确定性实质存在或用户要求事实核查时才显式输出。
- 懂领域：VK 智能推荐信号只按 VK 真正公开的类别陈述、链接与话题标签围绕发布目标而非"规矩"、反 AI 腔、规范«ё»。
- 只输出草稿文本（正文 + 可选首评），绝不代发布。

**何时用：** 需要一篇目标明确、不含编造统计、不靠 bait 机制的 VK 帖子/文章。

**命令：** `/post`、`/edit`、`/review`、`/audit`（带显式标签的事实核查）、`/mode`、`/debug`。SHORT / MEDIUM / LONG / ARTICLE 为编辑参考区间，不是平台要求。

**诚实性与降级：** VK 不公开排序权重，因此 v7 的"链接只能放首评""≤5 个话题标签""一屏 3 行""87% 移动端流量""×2–3 展示""注销 120 小时"全部降级为带标注的推荐，不再当作平台机制陈述（MC8）。SPEC 级来源保留 `vk.com/legal/recommendations` 与 `vk.company/ru/press/releases/12216/`，实践类结论归属到作者（ppc.world 2026-07-08）。

**安全：** MG7（从 v7 保留）禁攻击/仇恨/粗话/震惊钩子与违禁话题（酒精、烟草）；真实私人人物在风险语境中只做泛化、不做指认；未成年人性化直接简短拒绝；他人角色/商标只取泛化特征。

#### 4. WANGOG `WANGOG.xml` — v4.0.0，约 5900 tokens

**身份：** Image Prompt Engineer and Poster Compositor，把"想要的感觉"翻译成提示词。

**做什么：**
- 把模糊需求变成一条优化过的英文提示词：每个槽位只做单选（无 `A/B`、无 `or`），只保留改变渲染的描述词，权重经济。
- 图文分离：提示词只管图像；任何文字都进独立 `TEXT_RENDER` 区块（字体、字号、位置、对比度、西里尔字母覆盖检查）。
- 融合摄影/电影/色彩/排版知识。只输出文本方案，不渲染。

**何时用：** 需要 Midjourney / SD / Flux 等生图提示词 + 海报上干净的文字排版。

**关键策略：** WC9 — PROMPT 与 NEGATIVE 只用英文；WD1 — 提示词解剖；WD4 — 文字隔离；WG7 — 安全；字体声明：西里尔覆盖未确认即 `NOT_VERIFIED`。

#### 5. AMADEUS `AMADEUS.xml` — v1.0.0，约 5680 tokens

**身份：** ComfyUI YuE2 Songwright and Workflow Operator，词曲作者 + 音乐管线操作员。

**做什么：**
- 写可唱歌词（段落标签 `[Verse]`、`[Chorus]`、`[Bridge]`、`[Outro]`…）与独立 STYLE（风格、音色、演唱语言、BPM、乐器、氛围）。音乐描述只在 Style，可唱词只在 Lyrics。
- 选择 ABC 规划模式：`full`（旋律+和弦，新歌默认）、`melody`（翻唱用）、`off`（直接生成）。
- 计算时长预算（25 semantic tokens/秒，Max Duration ≤ 900 是上限不是精确时长）、设置 guidance（开规划时 `cfg_scale 1.0`，关规划才用 `1.01`）、组装 ComfyUI 节点/文件映射并修复典型失败（`budget reduced`、`leaves no room for music`、结尾截断）。
- 懂硬件与文件：原生路径需 ComfyUI v0.35.0+，`yue2_3b_int8_convrot.safetensors → models/checkpoints/`，`sheetsage2_bf16.safetensors → models/audio_encoders/`（翻唱用）；Olm-YuE2 显存阶梯（8GB  unlikely，12GB 很紧，16GB 短任务+offload 可行，24GB 宽裕，32GB 实测 5 分钟以上）。

**何时用：** "有歌曲想法 → 要可直接喂 YuE2 的输入"、翻唱、改词、失败排查。

**命令：** `/song`（完整规格）、`/cover`（SheetSage2 先转谱，绝不 audio-to-audio）、`/review`、`/fix`、`/mode`、`/debug`。

**门控：** AMC7 只引用已声明 checkpoint，不编文件名/hash；AMC8 只用文档化参数；AMC9 许可（个人/创作者含变现免费、学术非商用、公司商用权重需商业许可）；AMG7 音乐安全（禁违法/仇恨内容，翻唱默认仅 personal/learning，发行需确权，不冒充他人声音）。

#### 6. DAEDALUS `DAEDALUS.xml` — v1.0.0，约 6630 tokens

**身份：** ComfyUI Multiview-3D Modelwright and Pipeline Operator，ComfyUI-3D-Pack 多视图 3D 管线操作员。

**做什么：**
- 从单张图或文本构建多视图集：Zero123++（1→6 视图，320，便宜基线）、Era3D（1→6 视图 + 法线，512，需 ≥16GB 显存）、Wonder3D、Unique3D（4 阶段：256 MV → 512 放大 → 2048 超分 → 法线 → 网格）、MV-Adapter IG2MV（图+网格→视图）/ TG2MV（文+网格→视图）。
- 选择重建路线（DAD3 一行说明理由）：MV 优先 — InstantMesh（稀疏白底视图 → 带纹理网格，与 Zero123++ 配对）、CRM（6 视图 + CCM → 网格，3 阶段可在低显存下拆分）、FlexiCubes（深度+mask+法线 → 网格）；直连 — TRELLIS、TripoSG（图像/草图）、Hunyuan3D-2/2.1（阶段 1 形状，阶段 2 形状+参考 → 纹理；turbo/mini/fast/multiview）、StableFast3D（受限权重）、LGM / TriplaneGaussian（图像 → 3D Gaussian，RTX3080 级秒级，之后转网格）；重纹理 — MV-Adapter Texturing 或 Fitting_Mesh_With_Multiview_Images 烘焙（nvdiffrast）。
- 设定相机与轴向：Stack Orbit Camera Poses，方位角 (−180, 180]，仰角 (−90, 90)，CRM 规范 Front/Back/Left/Right/Top/Down 不改名，串联不同 pack 时显式 Switch Axis；预览 gsplat.js（3DGS）/ three.js（网格）；OpenGL 报 `eglInitialize failed` 时 `force_cuda_rasterize true`。
- 懂环境：经 ComfyUI-Manager 安装（或 Comfy3D-WinPortable），预编译版 Win10/11 + Python 3.12 + CUDA 12.4 + torch 2.5.1+cu124，`install.py`，InstantNGP 与 NeRF/Marching_Cubes 需要 VS Build Tools / gcc+g++；手动权重只放 Checkpoints 目录树，绝不覆盖随包的 `.json`。导出 `.obj` / `.ply` / `.glb`，3DGS 用 `.ply`。

**何时用：** "一张照片 → 3D 资产"、只要多视图集不做重建、网格重纹理、3D 流程失败排查。

**命令：** `/model`（完整规格：多视图 + 路线 + 节点/文件 + 导出）、`/multiview`（只出视图）、`/review`、`/fix`、`/mode`、`/`debug`。

**门控：** DAC7 只引用已声明 checkpoint（TRELLIS jetx/TRELLIS-image-large、TripoSG VAST-AI/TripoSG、InstantMesh TencentARC/InstantMesh、Hunyuan tencent/Hunyuan3D-2/2mini/2.1、MV-Adapter huanngzh/mv-adapter），受限权重需先接受条款/HF token；DAC8 只用文档化参数范围；DAC9 商用前逐个查模型许可；DAG7 3D 安全（不做真人换脸式欺骗克隆、致命部件需确认合法用途、发行/变现需确权）。

#### 7. PLAYCANVAS `PLAYCANVAS.xml` — v1.1.0，约 8810 tokens

**身份：** Browser Multiplayer 3D Game Developer on PlayCanvas，基于 PlayCanvas Engine（独立 Engine + npm 工具链）的浏览器多人 3D 游戏开发叶子角色。

**做什么：**
- 按规范搭建项目：`npm create playcanvas@latest my-app -- -f engine`（Vite + TypeScript）；独立启动严格顺序为 `pc.createGraphicsDevice`（WebGPU，回退 WebGL2）→ `new pc.AppOptions()` 设置 `graphicsDevice`、只注册用到的 `componentSystems` 与 `resourceHandlers` → `new pc.AppBase(canvas)` + `app.init(options)`；牢记 Engine 的坑点——input 默认不启用（`app.keyboard`），canvas 的 resize 由应用处理。
- 以 ECS 组织代码：组件即数据，逻辑放进 ESM 脚本（`import { Script } from 'playcanvas'`、`initialize/update(dt)`）；先复用 `playcanvas/scripts/*` 下的官方生产脚本（相机、角色控制器、tween、水、天空、后效、XR）与官方 Engine Examples——移植而非导入。
- 按品类设计 netcode：竞技或防作弊场景默认权威客户端-服务器（客户端只做预测，服务器是唯一真相源）；relay 仅限合作原型；2–4 人休闲对局可用 WebRTC data channels 的 P2P（代价是 NAT 穿透与 host 迁移）。传输层：WebSockets（可靠有序 TCP，但有 head-of-line blocking）或 WebRTC dc（类 UDP，不可靠/无序）——浏览器没有原始 UDP。
- 守住性能预算：先用 MiniStats 与 `app.stats`（frameTime、drawCallCount、cpuUpdateTime、gpuFrameTime、vramTotalBytes）在可复现场景下测量，再按成本从低到高优化：在 `initialize` 预分配 Vec3/Mat4/Quat（每帧 `new` 会触发 GC 卡顿）、不可见对象设 `enabled = false`、批处理与 draw call 控制、DPR、灯光、shader。
- 用运行证明：static（TS/lint）→ Node headless（`NullGraphicsDevice`，用 `setInterval` 驱动 `app.update(dt)`——Node 下 `app.start()` 不会跑主循环）→ 浏览器真实运行并抓 console + AppStats；netcode 需服务器 + ≥2 客户端在人为延迟/丢包下验证；渲染变更用确定性像素比对（`app.autoRender = false`、`renderNextFrame`、随机种子、`readPixelsAsync` / `Texture#read`）。

**何时用：** 基于 PlayCanvas Engine 做浏览器 3D 游戏（单机或多人）——引导搭建、ECS/脚本、netcode、性能预算——或需要一份诚实的 evidence 报告而不是「should work」。

**命令：** `/bootstrap`（搭建或审计项目：create-playcanvas、AppOptions、组件系统与 handler、input、resize、生命周期）、`/netcode`（权威模型、传输、tick rate、预测/插值/和解、框架选型——默认 Colyseus）、`/perf`（先用 AppStats/MiniStats 建基线，再处理 draw calls、分配、shader、DPR、灯光）、`/verify`（headless Node 或浏览器 harness、console、AppStats、像素比对）、`/review`、`/mode lite|full`、`/debug full|safety|plan|perf|netcode`。

**门控：** PCC7 API 诚实：只使用已安装包或目标版本官方 API reference 中存在的类/组件/handler（编造调用即 FAIL，「大概存在」即 NOT_VERIFIED）；PCC8 服务器权威：客户端上报的状态（位置、血量、分数、背包）只能作为待校验输入，绝不能当事实；PCC9 传输与 netcode 按品类匹配而非按习惯；PCC10 先测量再优化（基线必填）；PCG7 运行时变更不能只靠静态审查结案——必须有真实运行；PCG8 防作弊、延迟补偿与同步正确性不能靠读代码断言——只有服务器 + ≥2 客户端在延迟下验证才算；PCC2 客户端包是公开的，浏览器里不夹带任何密钥。

### 所有角色的共同原则

- **Minimum Viable Rules：** 只有在明确需求、观测到的失败或可测量的退化下才加规则。
- **状态模型：** `PASS` / `FAIL` / `NOT_APPLICABLE` / `NOT_VERIFIED` / `BLOCKED`。聚合：任一 FAIL → FAIL，否则 BLOCKED → BLOCKED，否则 NOT_VERIFIED → NOT_VERIFIED，否则 PASS。缺证据即 `NOT_VERIFIED`，绝不是 PASS。
- **诚实证据：** 读文件只证明静态属性；"读起来不错"不是质量证据；不编造数字、hash 与测试。
- **版本：** `major` 门控变更，`minor` 新增指引，`patch` 措辞。版本、日期、changelog 联动更新。

### 仓库使用方法

1. 按上图选角色。
2. 把整个 XML 作为聊天/agent 的首条消息 / system prompt 粘贴。
3. 用角色命令工作（`/role`、`/song`、`/model`、`/post`…）。
4. 记住：角色文本在宿主加载并验证结果之前，只是一份提议。

License: Apache 2.0（见 `LICENSE`）。
