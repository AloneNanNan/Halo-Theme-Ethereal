# AGENTS.md

面向 AI 协作者的开发约定与注意事项（Codex / opencode / Cursor 等）。改代码前先读「硬规则」「注释规范」以及改动范围对应的「架构契约」小节；人类协作流程（Fork / PR / 许可证）见 [CONTRIBUTING.md](./CONTRIBUTING.md)。

## 0. 硬规则

1. **禁止修改 `theme.yaml` 的 `version`**：版本号由发布流程手工提升，AI 不得改动。
2. **改完必须跑 `pnpm astro check` + `pnpm build:only` 并确认通过**；只交付 `src/` 与根配置 / 脚本改动，构建产物（`templates/`、`dist/`、`public/assets/*.js`）勿手改。
3. **不私自 commit / push**：仅在用户明确要求时提交，先确认范围；禁止 force push，禁止 amend / rebase 已推送的提交；提交默认排除 `theme.yaml` 版本号改动。
4. **先读后改**：动手前读本文对应「架构契约」与「常见坑」；涉及同步点（三处设置、两处开关、成对断点）必须同步修改。
5. **注释按「注释规范」写**：只描述「当前代码为什么这样」，不留日期、过程叙事与重复信息；改代码时顺手修正过时注释。
6. **口径不确定先问用户**：业务语义、删除功能、改默认值与公开行为，决定权不在 AI。

## 1. 快速上手

Ethereal 是一款基于 Astro 构建的 **Halo CMS 主题**：先用 Astro 写组件与模板，构建后输出为 Halo 使用的 **Thymeleaf 模板**，再由 Halo（Spring Boot + Thymeleaf）在服务端渲染最终页面。
核心心智模型：`.astro` 文件里的 `th:xxx` 不是前端语法，而是给 Thymeleaf 的指令，构建后原样保留在 `templates/*.html` 里。
技术栈：Astro（页面 / 路由）+ Svelte 5（交互组件）+ Tailwind CSS 4 + TypeScript + Swup（页面过渡动画）+ Iconify（图标）。

环境：Node.js >= 22.12.0（推荐 24.x，见 `.nvmrc`）与 pnpm。

| 命令               | 作用                                                                     |
| ------------------ | ------------------------------------------------------------------------ |
| `pnpm dev`         | 监听 `src/` 变更自动重建（不打包 zip）                                   |
| `pnpm build:only`  | 仅 `astro build`，输出到 `templates/`（开发调试常用）                    |
| `pnpm build`       | `pnpm check` + `astro build` + `pnpm package`（发布 zip 输出到 `dist/`） |
| `pnpm astro check` | 类型检查，改动后必须 0 error                                             |
| `pnpm format`      | prettier 格式化全项目，随后自动刷新 README-Halo.md                       |
| `pnpm readme:halo` | 单独触发 README→README-Halo 转换（见 5.1 的转换说明）                    |

## 2. 目录结构速览

- `src/pages/*.astro` — 页面模板（`post.astro`、`index.astro`、`category.astro` 等）
- `src/components/*.astro` / `*.svelte` — 可复用组件；`control/` 为分组页共享控件（`FilterTab` / `FilterTabs` / `PageHeader`，表达式以字符串 prop 传入，见 5.6）；`widget/` 为侧边栏小组件（`WidgetSwitch.astro` 是条目分派片段库，见 5.3）
- `src/layouts/*.astro` — 页面布局（`Layout.astro`、`MainGridLayout.astro`）
- `src/styles/*.css` — 全局样式与 CSS 变量（`variables.css` 定义主题色 / 圆角等）
- `src/types/config.ts` — `theme.config` 的类型定义
- `src/utils/*.ts` — 工具（`post-list-config.ts`、`image-suffix.ts`）
- `src/scripts/assets/*.ts` — 经典脚本源码（见 5.1）；`src/scripts/vendor/` — 第三方 vendored 资产
- `settings.yaml` — 后台主题设置表单；`theme.yaml` — 主题元信息，**`version` 禁止修改**
- `i18n/` — 多语言文案；`templates/` / `dist/` — 构建产物（勿手改）

## 3. 注释规范

注释密度高是本项目有意为之（坑位警告、同步点、反直觉因果都要写清），但表达必须收敛——**只描述「当前代码为什么是这样」，不写日期、不写过程叙事**。

**不写的**：

- **日期 / 阶段标注**：「（2026-10）」「（I27 引入）」这类一律删——版本信息 git 历史里有，注释只留结论。
- **过程叙事**：「曾经写在页头区上…已移出」「一度误判…」这类发现问题 → 修复的故事不写；教训有防错价值时压成一句警示。
- **重复表述**：同一信息多处出现时只留一处（靠近定义处 / 更权威的那处）。
- **展开的举例清单**：能压成一行就压成一行；读代码就懂的解释不写。

**必须保留的**：同步点与成对断点的提示；防错警告（「勿再删除」「勿改回 X」并说明后果）；反直觉因果（「不能用 A，因为会 B」）；数值依据与结构契约（换算关系、阈值来源、ASCII 结构图）。

**格式**：一律中文；引用变量 / 选择器直接写标识符、延用「」引号，不用 Markdown `**`；长注释块（>6 行）须有明确理由（结构契约 / 多步约定），否则压到 3 行以内；改代码时顺手修正被改处的过时注释。

**文档分工（新增信息写哪里）**：

- 局部坑（只关乎本文件 / 本段值）→ 写代码处；
- 跨文件契约与同步点 → 写本文「架构契约」，代码处留一行警示；
- 流程类（产物、发布、CI）→ 只写本文与 CONTRIBUTING。

同一事实只在一处展开、另一处一行指针；发现两边都展开的地方，按此收敛。

## 4. 提交规范

**AI 侧硬规则见「0. 硬规则」第 3 条**；格式定义与人类侧说明见 [CONTRIBUTING.md](./CONTRIBUTING.md)。

- 格式 `<type>: <中文描述> (#N)`：`type` 取 `feat`（新功能）/ `fix`（修复）/ `chore`（构建、版本等）；issue 编号写在括号里，多个用空格分隔（如 `(#17 #19)`）；复杂改动在正文用 `-` 逐项列出。
- 提交信息只描述该提交相对上一个提交的**交付差异**，不写开发过程叙述（「发现问题 → 修复」属于开发日志）。
- AI 提交时默认排除 `theme.yaml` 的版本号改动，除非用户明确要求包含。

## 5. 架构契约

### 5.1 构建产物与脚本管线

`templates/`（`astro build`）、`dist/`（`pnpm package`）、`public/assets/*.js`（脚本编译产物）都是构建生成，勿手改；要改就改 `src/` 后重新构建。

**经典脚本资产管线**（`astro.config.mjs` 的 `buildAssets` integration）：

```
src/scripts/assets/*.ts →(esbuild IIFE, build:start)→ public/assets/*.js
src/scripts/vendor/*.js →(原样拷贝, build:start)→ public/assets/*.js
→(astro 拷贝 public/)→ templates/assets/*.js →(esbuild 压缩, build:done)→ 产物
```

- `src/scripts/assets/` 是全部经典脚本源码（含 `// @ts-nocheck` 的 legacy 脚本，统一 `.ts` 后缀，兼容 nodemon watch）；`public/assets/` 是纯产物目录。
- `public/assets/*.js` 已从 git 移除跟踪：新克隆首次构建前没有这些 js 属正常，跑一次构建即可生成；不要把它们重新 `git add` 回来。
- `src/scripts/vendor/` 存放第三方 vendored 资产（如 qrcode.bundle.js UMD），构建期原样拷贝、不经 esbuild 编译。
- `_` 前缀文件（如 `_theme-config.ts`）是被 import 的共享模块，不是独立入口，esbuild 会内联进各入口。
- 产物带 `/*__ETHEMEAL_MINIFIED__*/` 标记；build:done 只压缩白名单内 public 产物，不碰 Astro/Vite 的 hashed module 文件。
- nodemon 的 ext 不含 js 是有意的（防「编译 → 重建」死循环），不要给 nodemon.json 加 js。

**README-Halo 转换**：`scripts/convert-readme.mjs` 把 README.md 转为降级版 README-Halo.md（Halo 应用市场不支持 `<picture>` 徽章，替换为内部首个浅色 `<img>`）。README-Halo.md 是生成产物（已 gitignore / prettierignore），勿手改、不提交；触发方式三选一（`pnpm readme:halo` / `pnpm format` 链尾 / 提交涉及 README 时 pre-commit 自动），产物一致。该文件仅用于发布时手工粘贴到 halo.run 开发者后台的详情页；商店版本说明走 release.md（ci.yaml）。

### 5.2 Swup 与换页时序

**非主题页豁免**：插件自带前台页等非主题页不交给 Swup 接管——接管会让 SwupHeadPlugin 先摘掉整套主题 CSS（导航栏 / 侧栏 / 页脚当场无样式），随后 `replaceContent` 容器不匹配报错并整页刷新。守卫在 `app.ts` 的 `page:load` 钩子：目标页缺任一容器（清单取自 `swup.options.containers`）即 `visit.abort()`，交还浏览器原生跳转；新增主题页面无需任何改动。

**容器清单**：`#swup-container` / `#toc-container` / `#toc-popup` / `#sidebar-toc` / `#right-sidebar-toc`（`astro.config.mjs`）。两侧栏本身不是容器（换页不替换，小组件脚本不重跑）；**新增容器时元素必须在每个主题页都渲染**——不能给容器本身加 `th:if`，页面差异只能写在容器内部（先例：无目录页面渲染空 `#toc-container` / 空目录槽位）。

**两处勿改错**：

- 交还浏览器前必须先 `history.back()` 撤销 Swup 刚 pushState 的占位条目、再 `location.assign`，否则回退只回退地址、不恢复文档（Chrome 实测）；别改回 `location.replace`。
- `visit.abort()` 会跳过 Swup 成功流程末尾的状态复位，必须手动补 `navigating = false` 并清掉 `onVisitEnd`，否则该文档后续前进 / 后退会被静默丢弃。

**换页动画时序（首页 ↔ 非首页：内容区随 is-home 位移）**：横幅 30vh / 全屏 100vh↔35vh，由 `body.is-home` + `enable-banner` 驱动（纯色 / 全屏透明无 `enable-banner`，不涉及）。全屏模式额外挂 `html.home-switch`（`animation:out:start` 判定、`animation:in:end` 移除；同时是标题显隐守卫与锁步回顶判据——改这个类前先搜全部读取方）。四条强耦合约定：

- **回顶与位移锁步**：一般换页用原生平滑；首页↔非首页必须用 `scroll-manager.ts` 的 `lockstepScrollToTop()`（rAF 插值，与位移同曲线、同时长 `--dur-banner`），否则内容（含常驻侧栏）会先下后上地往复。
- **横幅模式的 is-home 不提前切换**：位移统一在 page:view 起跑（新内容以旧定位换入再整体滑动），避免波浪越过内容顶边的 1px 缝隙。
- **标题等落位后再显现（全屏）**：显示由 `revealBannerTitleOnSwitchEnd()`（`animation:in:end` 触发）统一放行；四处守卫（`syncBannerOverlay`、`banner-responsive.ts`、`fullscreen-hero.ts`、`#banner-overlay` 的 `:not(.banner-text-hidden)` 规则）不得各自提前放行。
- **非顶部换页临时显示 `#page-height-extend`（300vh 撑高）**：撑高按「有位移 + is-home 会变 + scrollY > 0」显示；收起必须等回顶（`hidePageHeightExtendWhenAtTop`），提前收起会因文档高度骤降被钳制、产生抖动。

### 5.3 侧边栏小组件

**数据模型**（`settings.yaml` 的 `sidebar` 分组）：`widgets` / `rightWidgets` / `mobileWidgets` 是条目数组，每项只有 `{ value, sticky?, name?, html? }`（`mobileWidgets` 条目没有 `sticky`）。`value` 取值：`profile` / `announcement` / `popular-posts` / `categories` / `tag` / `music` / `hitokoto` / `site-stats` / `weather` / `schedule` / `html`（`name` + `html` 仅自定义HTML）。`profile` / `announcement` 也是普通条目，可自由排序、可勾吸顶；各小组件详细配置**外提为独立分组**（`sidebar.profile` / `announcement` / `siteStats` / `weather` / `hitokoto` / `music` / `schedule`），组件只读 `theme.config?.sidebar?.<组>?.<字段>`（不再从条目里读）；同类型可重复添加、共用同一份配置。站点统计「统计项」为多选数组，数组顺序即前台展示顺序。

**移动端列表**：留空 = 移动端沿用左右栏条目与顺序；非空 = 只显示本列表（`MobileSideBar.astro`，无吸顶、不吃「只留前 2 个」限额）。条目放在 `<template>` 里由 `is:inline` 脚本克隆挂载（桌面端不为「只在移动端用」的小部件白跑请求），挂载成功才给 `<html>` 加 `has-mobile-sidebar`（禁用 JS 时照旧显示两栏）——细节见组件顶部注释。

**吸顶前缀规则**：条目勾选「吸顶」才可能吸顶；未勾选条目**只有在它前面所有条目都未勾选时**才真的不吸顶。判定写作「前缀中未勾选吸顶的条目数 == 当前下标」：

```
widget.sticky == false and widgets.subList(0, widgetStat.index).?[#this.sticky == false].size() == widgetStat.index
```

约束：切片用 List 自身的 `subList(from, to)`（`#lists.subList` 不存在）；选择器 `.?[]` 内部只引用 `#this`，不能引用 Thymeleaf 上下文变量（SpringEL 7 抛 EL1008E）；判定写在 `th:each` 同元素的 `th:if` 上（`th:each` 优先级更高）。`sticky` 复选框默认值是 `true`，不吸顶必须显式写 `sticky: false`，且只能出现在列表前缀。

**默认列表**（只对新安装 / 重置该字段生效）：左栏 `profile`(不吸顶) → `announcement`(不吸顶) → `categories` → `tag`；右栏 `hitokoto` → `site-stats`；移动端留空 = 不启用独立列表（手机端按「内容 → 左栏 → 右栏」）。

**渲染结构**：`SideBar.astro` / `RightSideBar.astro` 把列表切成「不吸顶区 + 吸顶区」，两区与 `MobileSideBar` 模板都经 `th:replace="~{::widgetSwitch(${widget})}"` 引用 `WidgetSwitch.astro` 里**只定义一份**的 `th:switch`——新增 / 调整小组件分派只改它，任何引用处都不要内联第二份（曾因 5 处内联把每页模板从 344 KB 撑到 654 KB）。片段两个硬约束：外层 `<div th:if="false">` 守卫负责「定义处不渲染」，**不能写进片段根元素**（副本会连条件一起复制、渲染结果为空）；片段根元素自带 `class="contents"`（`th:replace` 是整体替换，不保留引用点 div 的属性）。

**TOC 归属**：`post.toc.position`（`left` / 缺省 `right`）决定三栏布局下目录挂在哪个侧栏；两栏布局不受影响（继续用 `#toc-container` 悬浮目录）。两侧栏结构对称：各有一个恒存在的槽位容器 `#sidebar-toc` / `#right-sidebar-toc`，槽位内部由服务端按页条件渲染（文章页 + `enable_toc` + 位置在本栏 + 非两栏），不需要任何客户端 refresh / 显隐代码。卡片本体 `SidebarTOC.astro` 左右栏共用（**勿复制第二份**）；「文章页只留前 2 个吸顶组件」「吸顶块限高」「吸顶组件不参与收缩」三条全部由 `Layout.astro` 的 CSS 承担、门控是 `:has(#sidebar-toc > *)`。卡片与内层滚动区都必须 `flex-auto`（不能改成 `flex-1`），`min-h` 6rem 兜底、空目录时撤掉——原因见 `SidebarTOC.astro` 顶部注释。

**两栏「右栏模式」**（`pageLayout.rightSidebarMode`，仅两栏布局出现）：侧栏与正文交换列位置，改动面四处必须同步——`Layout.astro` 的 `<body>` 类 `layout-two-column-right`（**必须挂 body**：`#main-grid` 与 `#toc-container` 是兄弟节点，只有 body 级类能同时命中）；`#main-grid` 列模板 `1fr 17.5rem`；`#main-column` 与 `#sidebar` 的 `grid-column-start` 互换；`#toc-wrapper` 的 `right: auto; left: calc(-1 * var(--toc-width))`。四处都用 `!important` 覆盖 Tailwind 任意值类（同属性两条任意值类的胜负取决于产物生成顺序，不可靠）。

**其余约定**：右栏 aside 断点——`<768px` 作为第三项可见、`768–1279px` 隐藏、`≥1280px` 三栏可见 / 两栏隐藏；右栏不吸顶区间距只写 `mb-4 xl:mb-0`（xl 起 aside 自身 `flex + gap-4`，再加 margin 会双倍）；多实例组件内部钩子用 `data-*` 不用 `id`（`data-toc-indicator` / `data-toc-empty`，查询一律走实例作用域）；小组件空卡守卫（勾选项全落空时整卡不渲染）必须放在 `th:with` 的**外层**元素上（同元素 `th:if` 先于 `th:with` 执行）；`#sidebar-sticky` / `#right-sidebar-sticky` 两个 id 被 `Layout.astro` 与 `global.css` 引用，勿改名。

### 5.4 主题设置（settings.yaml → theme.config）

`settings.yaml` 里每个 `group` 对应后台一个设置页分组；每个 `name` 会出现在前端的 `theme.config?.<group>?.<name>`。

**改动设置项需要同步修改三处（务必一致）**：

1. `settings.yaml` — 新增 / 修改表单项
2. `src/types/config.ts` — 给对应 interface 增加字段
3. 使用它的 `.astro` 模板 — 通过 `theme.config?.xxx?.yyy` 读取

读取默认值时用安全导航，例如 `theme.config?.layout?.postList?.descriptionLines == 0`。

**`help` 文案要短**：一句话说清「这个设置做什么 / 取值怎么选」，可读性优先——不写长篇大论、不解释实现原理、不用「本选项将…」式公文腔；互斥 / 取值等必要信息用短句补齐即可。正面例（settings.yaml 现有写法）：`经典：单栏居中的细线页脚；卡片：整块卡片式页脚`。

### 5.5 访客样式面板与展示层开关

- **面板结构**：后台开关在 `layout.mobileMenu.visitorStyle` 子组，缺省视为开启；开关为**标签页级**（外观 / 壁纸 / 特效），仅在总开关 `enable` 开启时显示；Tab 栏由 `DisplaySettings.svelte` 的 `visibleTabs` 驱动（≥2 个显示 Tab 栏、=1 个直接渲染该分区）。`Navbar.astro` 显示设置按钮的 `th:if` 与 `ConfigCarrier.astro` 的 `th:data-visitor-*` 一一对应——**新增 / 删除标签页开关两处必须同步**（Thymeleaf 无法从 data 属性推导）。
- **localStorage 键清单（改键名需三处同步）**：`postListLayout`、`cardBorder`、`cardFollowTheme`、`navbarBlur`、`postListMasonry`、`wallpaperOpacity`、`wallpaperBlur`、`wallpaperCardAlpha`、`bannerDisplay`、`bannerWave`、`bannerTitle`、`sakuraEnabled`。开关关闭时对应键会被忽略并清理（与 `fixed` 固定色调、`__eecs` 语义一致）。**`cardHoverLift` 已退役**（卡片悬浮恒用后台默认），首帧脚本仅清理其残留键。
- **默认值链路**：后台 `theme.config` → `ConfigCarrier.astro` 的 `th:data-*` 属性 → `setting-utils.ts` 读取；重置默认值也从 ConfigCarrier 读，勿依赖 body 内联变量（被 JS 覆盖后原值丢失）。
- **Banner 展示体系**：`#banner-wrapper` / `#scroll-down-indicator` / `#banner-credit` / 波浪容器恒渲染（已去 `th:if`），显隐与定位全由 `html[data-banner-display]` 门控（`components.css`）；`applyBannerDisplay` 同时切 `body.enable-banner` 并按模式重算 `--banner-height-extend` px（全屏 65vh / 横幅 30vh，数值来自 `constants.ts`）；波浪开关用 `body.wave-disabled`。
- **高度换算基准**：`cssVhViewportHeight()`（与 CSS 100vh 同基准，**不能**用 `window.innerHeight`——动态地址栏浏览器会露缝）；写入统一走 `writeBannerHeightExtend()`（含写守卫）。同步点：`variables.css` 默认值、`Layout.astro` 两处内联脚本（探针手写拷贝）、`banner-sync.ts`。
- **模式切换过渡**：窗口类 `html.banner-mode-transitioning` 由 `applyBannerDisplay` 临时挂、结束移除；`components.css` 内分四组（窗口过渡 / 层化清单 / 移动端瞬时化 / 媒体层桌面专属）。三个同步点：窗口内**新增带过渡的元素**要加进瞬时化清单；层化容器内**新增 fixed 元素**要移出；两处 **768px 断点**联动。细节见 `components.css` 对应注释块；**勿凭直觉改动**（撤掉移动端层化会回归切换卡顿）。
- **导航栏显隐**：固定 / 非固定两种模式在桌面端（≥1024px）都是 fixed，区别只在 `navbar-hidden` 是否生效（固定模式强制 `translate:none` 永不隐藏）；**别把非固定模式退回 sticky**（sticky 粘附范围只有 `#top-row`，滚出后上滑回不来）。方向判定有 8px 死区（`SCROLL_DIRECTION_DEADZONE_PX`）；状态统一在 `scrollFunction` 末尾落定（含移动端 / 固定 / 无导航栏的清理），隐藏态同步加 `inert`。隐藏时给 body 加 `dynamic-navbar-hidden`，`Layout.astro` 用它把 `--navbar-sticky-offset` 归零，侧栏吸顶 top 与目录 max-height 统一引用。
- **脚本顺序与门控**：`visitor-post-layout.js`（同步、首帧换布局类）必须在 `post-list-layout.js`（defer、瀑布流）之前，后者暴露 `window.__postListRelayout` 供换类后重排；文章页三件套 `post-like / post-share / post-reward` 按 `actionBar.*` 子开关 `th:if` 门控，`qrcode.bundle.js` 由 `post-share.js` 首次生成海报时经 `data-qr-src` 注入；banner 6 个脚本按 `mode == 'carousel'` / `isVideo` / `mobileActive` 门控（与 `#banner-wrapper` 的 `th:with` 同源）；`friends.bundle.js` 按列表非空门控、`links.bundle.js` 恒加载（外部门控已改脚本内守卫）；`window.__themeConfig` 缓存契约——首个消费脚本 parse 并写入、其余复用，不得各自 `JSON.parse`；樱花特效门控见 `Layout.astro` 尾部（默认值走 `data-sakura-default`，参数在 `_sakura-config.ts`、绘制核心 `_sakura-core.ts` 共享）。
- **面板文案 i18n**：`display.*` 键需同时维护 `i18n/*.properties` 与 `Layout.astro` 的 `i18nInlineScript` 两处。

### 5.6 组件表达式 prop 约定

`src/components/control/` 下的 `FilterTab.astro` / `FilterTabs.astro` / `PageHeader.astro` 把 Thymeleaf 表达式当**字符串 prop** 传，务必遵守（否则只在 Halo 渲染期才暴露错误）：

- `activeExpr` / `allActiveExpr` 传**裸布尔表达式**（无 `${}`，如 `#lists.contains(param.group, group.spec.displayName)`）；组件会把它注入 `th:classappend` 的三元追加激活类。
- 其余表达式 prop（`hrefExpr` / `labelExpr` / `countExpr` / `showIfExpr` / `withExpr` / `countShowIfExpr` / `subExpr` / `titleExpr` / `filteredExpr` / `sepShowIfExpr` 及 `all*` 系列）传**完整表达式**（含 `${}` 或 `#{}`）。
- 动态 tab 列表用 `<div class="contents" th:each=...>` 包裹（组件标签上的 `th:each` 不会转发到根元素）。
- `iconClass` 只传 `icon-[...]` 名字面量，组件统一追加 `text-base text-(--primary)`；图标名必须留在页面源码（内容扫描才能生成图标规则），勿用 `icon-[${name}]` 动态拼接。
- **沉默 footgun**：把字面量误当表达式传（或漏写 `${}`）时 `astro build` 不报错，只在 Halo 服务端渲染时抛 Thymeleaf 解析异常。改这些组件前先读懂对应 `.astro` 文件顶部的传参注释。
- `WidgetSwitch.astro` 不吃表达式 prop：片段内固定用参数 `widget`（引用处传 `${widget}`），自定义 HTML 条目取 `${widget.html}`。

### 5.7 Halo/Thymeleaf 特有约定

- `th:text`、`th:if` / `th:unless`、`th:each`、`th:href`、`th:classappend` 等是 Thymeleaf 指令，不是前端属性。
- 模板变量来自 Halo 的 Finder API 与上下文：`post`、`posts`、`site`、`theme.config`、`theme.metadata` 等。
- `theme.config?.xxx` 用 `?.` 安全导航；字面值可写成 `|${...}|` 拼接。
- 静态资源用 `#theme.assets("/assets/...")` 或 `@{/assets/...}` 引用，构建后路径带 `/themes/Ethereal` 前缀。
- 图片拼 CDN 参数使用 `imageSuffixThWith(...)`（见 `src/utils/image-suffix.ts`），不要在模板里手写硬编码后缀。

## 6. 常见坑（务必注意）

**构建与产物**

- 不要改 `dist/` / `templates/` / `public/assets/*.js`：都是构建产物，改无效；要改就改 `src/` 后重新构建。
- **Halo 模板缓存**：改完 `templates/` 后 Halo 不会自动重载，必须到后台「主题 → 重载主题」（或重新上传主题包）。服务端渲染中途抛错表现为**浏览器一直转圈（响应流截断）而非报错页**：用 curl 抓页面看是否以 `</html>` 结尾、并到日志搜 `TemplateProcessingException`；直接 `>` 截断 `halo.log` 会因写入偏移错位产生空字节，要用 `strings` 读取。
- **验收 / 发布一律用 CI 产物**（`pnpm install --frozen-lockfile` + `pnpm build`）：本机构建包可能因依赖漂移而「看着正常」，不能当发布依据。
- **`icon-[...]` 图标遮罩的 `-webkit-` 前缀会被构建链裁掉**：Chromium < 120（老微信内置内核、部分国产浏览器等）只认 `-webkit-mask-*`，产物缺声明时图标被裁掉右下角。`scripts/ensure-icon-mask-prefix.mjs`（挂 `astro:build:done`）会兜底补齐并在日志报告「补回 N 条 / 齐全」。**发版前复核**（在临时解包目录跑）：`unzip -q dist/<包>.zip -d /tmp/check && node scripts/ensure-icon-mask-prefix.mjs /tmp/check/templates`——输出「齐全」= 包没问题，输出「已兜底补回」= 该包原本是坏的（别发）；再确认拼接无事故：`grep -oh '.\{0,1\}-webkit-mask-size' /tmp/check/templates/assets/*.css | sort | uniq -c`，每行前导字符必须是 `;`。

**Thymeleaf / SpEL**

- **同元素属性优先级：`th:if` 先于自身 `th:with` 执行**。依赖本元素 `th:with` 变量的条件不能放在同元素的 `th:if` 里（未定义时按 null 比较 → 恒 false，元素静默消失）；解法是外层包一个 `th:with` + `th:remove="tag"` 的元素先算变量。变量出了定义它的元素作用域即失效，跨块使用要么放公共祖先、要么重新计算。
- **`th:case` 与 `th:if` 不要写在同一元素上**（优先级同为 300，行为不可靠）；需要「命中 case 且满足额外条件」时外层用 `<div th:case="...">` 壳、内层再写 `th:if`。
- **`th:each` / `th:switch` 不要直接加在 flex 容器上**：容器会被复制 N 份、行间 `gap-*` 失效；把迭代 / 分派放进容器内部的 `<div class="contents">` 包装层。
- **`th:style` 会整条替换 `style` 属性**，要追加得用 `th:styleappend`（Astro 的 `<style define:vars>` 注入的 CSS 变量会被 `th:style` 静默丢掉）。
- **工具方法与类型坑**：`#strings.toInteger` / `#numbers.createInteger` / `#lists.subList` 都不存在——转数字用 `#conversions.convert(x, 'java.lang.Integer')`，切片用 List 自身 `subList`；`param.xxx` 是 `String[]`（取值用 `[0]` 并先判空）；FormKit number 字段存出来可能是字符串，做算术前先转类型。

**Astro / Svelte / Tailwind / CSS**

- **带 `src={...}` 或属性声明的 `<script>` 会被当 `is:inline` 处理**，无法使用 TS / 包导入；需要包导入的脚本务必显式加 `is:inline` 或改为模块脚本。
- **组件 `<script>` 与 `<Icon>` 是同一种「只看首次使用处」的坑**：同一组件的脚本全页只输出一次、落在第一个实例处；首个实例若由 Thymeleaf 运行时决定渲不渲染（如侧栏目录卡片可配在左栏或右栏），被 `th:if` 移除时脚本一并丢失，另一栏的自定义元素永远不会 upgrade（表现为目录卡片整体空白）。解法：自定义元素注册放全局无条件的 `src/scripts/app.ts`；`astro-icon` 的 sprite 同理——这类位置改用 span + `icon-[...]`（图标数据随元素自带），确需 `<Icon>` 时加 `is:inline`，且新图标必须先加进 `astro.config.mjs` 的 `icon({ include })` 白名单。
- **Tailwind 任意值里 `calc(.../2)` 的 `/` 会被解析成修饰符**而无法生成；需要除法时改用等价固定单位（如 `top-2`），或把完整 `calc()` 写进 `is:global` 的 `<style>` 块。
- **布局 / 断点覆盖**：网格 vs 列表、移动端 vs 桌面端的样式差异集中在 `PostList.astro` 的 `is:global` `<style>` 块，改卡片样式前先看那里有没有对应覆盖。

**Swup / 脚本**

- **defer 经典脚本绑 Swup 钩子必须用 `swup:enable` 兜底**：swup 实例在 `load` 之后经 `requestIdleCallback` + 动态 import 才创建，defer 脚本执行时 `window.swup` 必然为 undefined，直接写 `window.swup?.hooks?.on(...)` 会**静默丢失**。范式：`if (window.swup?.hooks) bind(); else document.addEventListener("swup:enable", bind);`。另：Swup v3 的 `swup:contentReplaced` 在 v4 已改为 `swup:{hook}` 动态分发（如 `swup:content:replace`），写它永远不会触发；各脚本换页重绑定统一靠 SwupScriptsPlugin 重执行，无需再注册该事件。
- **小组件脚本必须按实例取元素**：`document.getElementById("固定id")` 永远命中文档里**第一个**实例，同一个小部件配两处时第二份就是空壳。三种既有做法：① `document.currentScript.parentElement` 取本实例容器（注意别撞脚本里的局部变量名）；② 每实例随机 id（`MusicPlayer` / `PopularPosts`）；③ `querySelectorAll` 一次性处理所有实例（`Announcement`）。页面级配置节点（`#theme-config`）继续用全局取值。

**Halo FormKit / settings.yaml**

- **条件字段的 `key` / `preserve`**：互斥 `if` 条件的同类型字段必须加唯一 `key`（否则 Vue 复用组件实例导致值丢失）；条件字段默认 `preserve: false`，字段卸载时值会从父数据移除，需要保留就显式加 `preserve: true`；开了 `preserve` 后不同条目的同名字段会互相覆盖，同名字段必须靠字段名区分（现状：`widget_html_*` / `right_widget_html_*` / `mobile_widget_html_*`）。
- **外提分组的配置字段一律不写无条件必填校验**（`validation: required`）：「有没有用这个小组件」不再由字段是否存在表达，加了 `required` 会造成「没启用也保存不了设置」；必填语义由「模板侧优雅降级 + help 文案」承担。
- **`select` 多选（`multiple: true`）是有序选项集合**：提交 `value` 数组、顺序 = 勾选顺序；支持 `maxCount` 与选项 `description`。⚠️ 实测（Halo 2.26）多选下拉**不支持拖动排序**，`sortable: true` 也不生效——help 文案别写成「可拖动排序」，调顺序只能取消后按目标顺序重勾。
- **`array` 的 `itemLabels.label` 只认 `$value.<字段名>` 字面前缀**（Halo 用 `label.split("$value.")[1]` 取路径），写 `||`、拼接、三元都会解析成空 → 条目列表全空白；不写 `itemLabels` 时默认列出条目所有字段。

**i18n 与外部资源**

- **i18n 词条里的字面花括号必须转义**：需要字面 `{location}` 这类占位（非 `{0}` 数字参数）时写成 `'{'location'}'`，否则 MessageFormat 解析抛错、曾导致全站白屏。
- **全局 i18n 助手**：`t()` 读取 `window.i18nResources` 的客户端助手由 `Layout.astro` 统一注入（`window.__etherealI18n` 等），内联脚本复用即可，不要各自复制实现。
- **外链 CDN 封面防盗链**：跨域 `<img>` 加载失败显示坏图、但新窗口能打开，多半是 CDN 检查 `Referer`；给 `<img>` 加 `referrerpolicy="no-referrer"`（见 `src/pages/bangumis.astro`）。
