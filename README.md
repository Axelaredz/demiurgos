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
├── MEFISTOFEL 7.0.0 (листовой: тексты для VK)
├── WANGOG 4.0.0     (листовой: промпты для генерации изображений и постеры)
└── AMADEUS 1.0.0    (листовой: песни и workflow для ComfyUI YuE2)
```

* Генераторы (`PROTOS`, `DEMIURGOS`) умеют создавать новые роли.
* Листовые роли (`MEFISTOFEL`, `WANGOG`, `AMADEUS`) новых ролей не создают — только артефакты своего домена.
* У каждой роли свой неймспейс ID (`C*/G*/P*/R*` у PROTOS, `DP*/DC*/DG*/DR*` у DEMIURGOS, `MC*/MG*/MD*` у MEFISTOFEL, `WC*/WG*/WD*` у WANGOG, `AMC*/AMG*/AMD*` у AMADEUS), чтобы аудит между ролями не путался.

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

#### 3. MEFISTOFEL `MEFISTOFEL.xml` — v7.0.0, ~5660 токенов

**Кто:** VK Post and Article Writer-Editor. Копирайтер под алгоритмы VK.

**Что делает:**
- Пишет и правит посты на стену и статьи: плотность вместо воды, хук в первые строки, мнение отдельно от факта, тон уверенный, слегка провокационный, без агрессии.
- Знает домен: сигналы умной ленты VK (сохранения, шеры, дискуссии важнее лайков), гигиена ссылок (внешняя ссылка в теле убивает охват — только первым комментарием), хэштеги ≤3–5, анти-AI-паттерны, требование «ё».
- Выдаёт только черновик-текст (пост + опционально первый комментарий), никогда не публикует сам.

**Когда использовать:** нужен пост/статья ВКонтакте с максимальным органическим охватом.

**Команды:** `/post`, `/article`, `/review`, `/fix`, `/mode`, `/debug`. Форматы SHORT / MEDIUM / LONG с лимитами длины.

**Честность:** точные веса ранжирования VK не раскрыты — роль оперирует качественной эвристикой сигналов, а прогнозы охвата всегда маркирует `NOT_VERIFIED`. Источники указаны явно: `vk.com/legal/recommendations`, `ads.vk.com/insights/...`, разбор ppc.world от 08.07.2026. Числовые мультипликаторы типа «×4» из старой v6.0 удалены как непроверенные.

**Безопасность:** MG7 — запрет на нелегальный/враждебный/обманный контент; факты без источника маркируются, а не выдаются за проверенные.

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

### Общие принципы всех ролей

- **Minimum Viable Rules:** правило добавляется только под явное требование, наблюдаемый сбой или измеримую деградацию.
- **Статусная модель:** `PASS` / `FAIL` / `NOT_APPLICABLE` / `NOT_VERIFIED` / `BLOCKED`. Агрегация: любой FAIL → FAIL, иначе BLOCKED → BLOCKED, иначе NOT_VERIFIED → NOT_VERIFIED, иначе PASS. Отсутствие доказательств — это `NOT_VERIFIED`, никогда не PASS.
- **Доказательства честные:** чтение файла доказывает только статику; «читается хорошо» — не доказательство качества; цифры, хеши, тесты не выдумываются.
- **Версионирование:** `major` — изменение гейтов, `minor` — новая guidance, `patch` — формулировки. Версия, дата и changelog обновляются вместе.

### Как пользоваться репозиторием

1. Выберите роль под задачу (см. схему выше).
2. Скопируйте XML целиком как первое сообщение / системный промпт чата или агента.
3. Работайте командами роли (`/role`, `/song`, `/post`, …).
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
├── MEFISTOFEL 7.0.0 (leaf: VK copy)
├── WANGOG 4.0.0     (leaf: image prompts and posters)
└── AMADEUS 1.0.0    (leaf: songs and workflows for ComfyUI YuE2)
```

* Generators (`PROTOS`, `DEMIURGOS`) can create new roles.
* Leaf roles (`MEFISTOFEL`, `WANGOG`, `AMADEUS`) never generate roles — only artifacts of their domain.
* Each role has its own ID namespace (`C*/G*/P*/R*`, `DP*/DC*/DG*/DR*`, `MC*/MG*/MD*`, `WC*/WG*/WD*`, `AMC*/AMG*/AMD*`) so cross-role audits stay unambiguous.

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

#### 3. MEFISTOFEL `MEFISTOFEL.xml` — v7.0.0, ~5660 tokens

**Who:** VK Post and Article Writer-Editor. Copywriter tuned for VK ranking.

**What it does:**
- Writes and edits wall posts and articles: density over water, hook in the first lines, opinion labelled as opinion, confident, mildly provocative, never aggressive tone.
- Knows the domain: VK smart-feed signals (saves, shares, discussion > likes), link hygiene (external link in the body kills reach — first comment only), hashtags ≤3–5, anti-AI patterns, mandatory «ё».
- Outputs draft text only (post + optional first comment), never publishes.

**When to use:** you need a VK post/article with maximum organic reach.

**Commands:** `/post`, `/article`, `/review`, `/fix`, `/mode`, `/debug`. SHORT / MEDIUM / LONG length classes.

**Honesty:** VK discloses signals, not exact weights — the role uses a qualitative signal heuristic, and reach forecasts are always `NOT_VERIFIED`. Sources cited: `vk.com/legal/recommendations`, `ads.vk.com/insights/...`, ppc.world analysis 08.07.2026. Numeric multipliers like "×4" from old v6.0 were removed as unverified.

**Safety:** MG7 — no illegal/hateful/deceptive content; unsourced facts are labelled, never passed off as verified.

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
├── MEFISTOFEL 7.0.0 （叶子：VK 文案）
├── WANGOG 4.0.0     （叶子：图像提示词与海报）
└── AMADEUS 1.0.0    （叶子：ComfyUI YuE2 歌曲与工作流）
```

* 生成器（`PROTOS`、`DEMIURGOS`）可以创建新角色。
* 叶子角色（`MEFISTOFEL`、`WANGOG`、`AMADEUS`）不生成角色，只产出各自领域的制品。
* 每个角色拥有独立 ID 命名空间（`C*/G*/P*/R*`、`DP*/DC*/DG*/DR*`、`MC*/MG*/MD*`、`WC*/WG*/WD*`、`AMC*/AMG*/AMD*`），跨角色审计不会混淆。

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

#### 3. MEFISTOFEL `MEFISTOFEL.xml` — v7.0.0，约 5660 tokens

**身份：** VK Post and Article Writer-Editor，面向 VK 算法的文案编辑。

**做什么：**
- 写 VK 动态与文章：密度优先、拒绝水话、开头即钩子、观点与事实分开、自信、微挑衅但不攻击。
- 懂领域：VK 智能推荐信号（收藏、转发、讨论 > 点赞）、链接卫生（正文外链杀 reach，只能放首条评论）、话题标签 ≤3–5、反 AI 腔、强制«ё»。
- 只输出草稿文本（正文 + 可选首评），绝不代发布。

**何时用：** 需要一篇追求自然流量的 VK 帖子/文章。

**命令：** `/post`、`/article`、`/review`、`/fix`、`/mode`、`/debug`。SHORT / MEDIUM / LONG 篇幅分级。

**诚实性：** VK 只公开信号不公开权重——本角色只用定性信号启发式，reach 预测一律标 `NOT_VERIFIED`。引用来源：`vk.com/legal/recommendations`、`ads.vk.com/insights/...`、ppc.world 2026-07-08 复盘。旧 v6.0 中的"×4"等数字权重已作为未验证删除。

**安全：** MG7 禁止违法/仇恨/欺骗内容；无来源事实必须标注，不得冒充已验证。

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

### 所有角色的共同原则

- **Minimum Viable Rules：** 只有在明确需求、观测到的失败或可测量的退化下才加规则。
- **状态模型：** `PASS` / `FAIL` / `NOT_APPLICABLE` / `NOT_VERIFIED` / `BLOCKED`。聚合：任一 FAIL → FAIL，否则 BLOCKED → BLOCKED，否则 NOT_VERIFIED → NOT_VERIFIED，否则 PASS。缺证据即 `NOT_VERIFIED`，绝不是 PASS。
- **诚实证据：** 读文件只证明静态属性；"读起来不错"不是质量证据；不编造数字、hash 与测试。
- **版本：** `major` 门控变更，`minor` 新增指引，`patch` 措辞。版本、日期、changelog 联动更新。

### 仓库使用方法

1. 按上图选角色。
2. 把整个 XML 作为聊天/agent 的首条消息 / system prompt 粘贴。
3. 用角色命令工作（`/role`、`/song`、`/post`…）。
4. 记住：角色文本在宿主加载并验证结果之前，只是一份提议。

License: Apache 2.0（见 `LICENSE`）。
