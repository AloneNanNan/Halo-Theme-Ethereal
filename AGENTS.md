# AGENTS.md

面向 AI 协作者的开发约定与注意事项。本文件是给编码代理（Codex、opencode、Cursor 等）读取的，用于在改代码前快速了解本项目的构建方式、目录约定与常见坑，减少到处搜索。

## 项目是什么

Ethereal 是一款基于 Astro 构建的 **Halo CMS 主题**。它先用 Astro 编写组件与模板，构建后输出为 Halo 使用的 **Thymeleaf 模板**，再由 Halo（Spring Boot + Thymeleaf）在服务端渲染最终页面。

核心心智模型：**你在 `.astro` 文件里写的 `th:xxx` 属性不是前端语法，而是给 Thymeleaf 模板引擎用的指令**，构建后原样保留在 `templates/*.html` 里。

技术栈：**Astro**（页面/路由）+ **Svelte 5**（交互组件，如 Search、LightDarkSwitch）+ **Tailwind CSS 4** + **TypeScript** + **Swup**（页面过渡动画）+ **Iconify**（图标）。

## 开发环境

- 需要 **Node.js >= 22.12.0**（推荐 24.x，见 `.nvmrc`）与 **pnpm**。
- `pnpm dev`：监听 `src/` 文件变更自动重建（不会打包 zip）。

## 构建与校验命令

| 命令               | 作用                                                       |
| ------------------ | ---------------------------------------------------------- |
| `pnpm build:only`  | 仅执行 `astro build`，输出到 `templates/`（开发调试常用）  |
| `pnpm build`       | `astro build` + `pnpm package`（打成发布 zip）             |
| `pnpm astro check` | 类型检查，务必在改动后运行确认 0 error                     |
| `pnpm format`      | prettier 格式化全项目，随后自动刷新 README-Halo.md         |
| `pnpm readme:halo` | 单独触发 README→README-Halo 转换（见「README-Halo 转换」） |

**重要：改完代码后运行的校验是 `pnpm astro check` 和 `pnpm build:only`。** 两类产物的位置不同：`astro build` 的 HTML 模板输出到 `templates/`；`pnpm package` 打出的发布 zip 输出到 `dist/`。两者都是构建生成、勿手动编辑——要改就改 `src/` 后重新构建。

**经典脚本资产管线**（I27 引入，`astro.config.mjs` 的 `buildAssets` integration）：

```
src/scripts/assets/*.ts →(esbuild IIFE, build:start)→ public/assets/*.js
src/scripts/vendor/*.js →(原样拷贝, build:start)→ public/assets/*.js
→(astro 拷贝 public/)→ templates/assets/*.js →(esbuild 压缩, build:done)→ 产物
```

- **`src/scripts/assets/` 是全部经典脚本源码（含 `// @ts-nocheck` 的 legacy 脚本），`public/assets/` 是纯产物目录，勿手改**。legacy 脚本（wave/navbar/wishes/upvote/banner-* 等）迁入后统一 `.ts` 后缀（兼容 nodemon watch，esbuild 照常编译）。
- **`public/assets/*.js` 已从 git 移除跟踪**（`public/assets/*.js` 忽略规则生效中）：新克隆的仓库在首次构建前目录里没有这些 js，属正常现象、跑一次构建即可生成；不要把它们重新 `git add` 回来。
- `src/scripts/vendor/` 存放第三方 vendored 资产（如 qrcode.bundle.js UMD），构建期原样拷贝、不经过 esbuild 编译。
- `_` 前缀文件（如 `_theme-config.ts`）是被 import 的共享模块，不是独立入口，esbuild 会内联进各入口。
- 产物带 `/*__ETHEMEAL_MINIFIED__*/` 标记；build:done 只压缩白名单内 public 产物，不碰 Astro/Vite 的 hashed module 文件。
- **nodemon 的 ext 不含 js 是有意的**：编译产物写入 public/ 不会触发重建（防编译→重建死循环）。不要给 nodemon.json 加 js；改脚本源码统一用 `.ts` 后缀。

## README-Halo 转换

Halo 应用市场的 Markdown 渲染器不支持 `<picture>`（GitHub 深浅色徽章），`scripts/convert-readme.mjs` 把根目录 README.md 转换为降级版 README-Halo.md（每个 `<picture>` 块替换为内部首个 `<img>`，即浅色徽章）。

- **README-Halo.md 是生成产物**：已进 `.gitignore` 与 `.prettierignore`，不提交、勿手改；改徽章只改 README.md 源文件后重新转换。
- **触发方式三选一，产物一致**：`pnpm readme:halo` 单独触发；`pnpm format` 链尾自动刷新；提交涉及 README.md 时 pre-commit（lint-staged 的 `README.md` 任务）自动重新生成本地文件。
- 脚本路径基于 `import.meta.url` 解析（pnpm 脚本固定以包根为 CWD，按 `../README.md` 相对 CWD 写会指向项目外），任意目录下均可运行。
- 该文件仅供发布时手工粘贴到 halo.run 开发者后台的应用详情页——商店版本说明走 GitHub Release body（ci.yaml 用 release.md），与它无关。

## Swup 非主题页豁免

非主题页（插件自带前台页等没有主题 Swup 容器、也不是由主题 Layout 渲染的页面）**不交给 Swup 接管**：一旦接管，`SwupHeadPlugin` 会先摘掉整套主题 CSS（换页期间可见的导航栏/侧栏/页脚当场无样式），随后 `replaceContent` 容器不匹配报错并整页刷新。守卫在 `src/scripts/app.ts` 的 `page:load` 钩子：目标页缺任一容器（清单取自 `swup.options.containers`，改容器配置无需同步）即 `visit.abort()`，交还浏览器原生跳转。新增主题页面无需任何改动（容器齐备即正常接管）。

**容器清单**：`#swup-container` / `#toc-container` / `#toc-popup` / `#sidebar-toc` / `#right-sidebar-toc`（`astro.config.mjs`）。**两侧栏 `#sidebar` / `#right-sidebar` 本身不是容器**：换页不替换它们，小组件脚本因此不再每页重跑（音乐播放器不必"寄存"、天气不重复扫描、组件内部状态不重置——原先右栏是容器时那套寄存逻辑已随去容器化删除）；唯一按页变化的目录，各自放在一个恒存在的**槽位容器**里。**新增容器时元素必须在每个主题页都渲染**——不能给容器本身加 `th:if`，否则目标页缺容器会让该页所有换页退化成原生跳转；页面差异只能写在容器**内部**。既有先例：`#toc-container` 在无目录页面渲染空 `<div id="toc" />`，两个目录槽位在非文章页渲染空 div。

**两处勿改错（浏览器 / swup 内部时序坑）**：

- **交还姿势**：必须先 `history.back()` 撤销 Swup 刚 pushState 的占位条目、再 `location.assign`，否则浏览器回退只回退地址不恢复文档（地址变了内容不变、需刷新；Chrome 实测）。别改回 `location.replace`。
- **abort 的收尾**：`visit.abort()` 会跳过 Swup 成功流程末尾的状态复位，必须手动补 `navigating = false` 并清掉 `onVisitEnd`，否则该文档后续前进/后退会被静默丢弃（同样表现为"地址变、内容不变"）。

## 目录结构速览

- `src/pages/*.astro` — 页面模板（`post.astro`、`index.astro`、`category.astro` 等）
- `src/components/*.astro` / `*.svelte` — 可复用组件（`PostCard.astro`、`PostList.astro` 等）
- `src/components/control/` — 分组页共享控件：`FilterTab.astro` / `FilterTabs.astro`（分组筛选 tab）/ `PageHeader.astro`（页头），把 Thymeleaf 表达式当字符串 prop 传（见「组件表达式 prop 约定」）
- `src/components/widget/` — 侧边栏小组件；`WidgetSwitch.astro` 是左右栏**共用**的条目分派片段库（`th:switch` 全站只定义一份，各栏用 `th:replace` 引用，见「侧边栏小组件」）
- `src/layouts/*.astro` — 页面布局（`Layout.astro`、`MainGridLayout.astro`）
- `src/styles/*.css` — 全局样式与 CSS 变量（`variables.css` 定义主题色/圆角等）
- `src/types/config.ts` — `theme.config` 的类型定义
- `src/utils/*.ts` — 工具（`post-list-config.ts`、`image-suffix.ts`）
- `src/scripts/assets/*.ts` — 经典脚本源码（全部脚本统一管理，esbuild 编译为 IIFE 输出到 `public/assets/`，见「构建与校验命令」）
- `src/scripts/vendor/` — 第三方 vendored 资产（原样拷贝，不经编译）
- `settings.yaml` — **后台主题设置表单**（改后台开关/设置项在这里）
- `theme.yaml` — 主题元信息，**版本号唯一来源**（`version` 字段）。**禁止修改 `version` 字段**：版本号只能由发布流程手工提升，AI 不得改动，否则会造成线上主题版本错乱。
- `i18n/` — 多语言文案
- `templates/` — 构建产物（勿手改，会被 `astro build` 覆盖）

## 主题设置（settings.yaml → theme.config）

`settings.yaml` 里每个 `group` 对应后台的一个设置页分组；每个 `name` 字段会出现在前端的 `theme.config?.<group>?.<name>`。

**改动设置项需要同步修改的地方（务必三处一致）：**

1. `settings.yaml` — 新增/修改表单项
2. `src/types/config.ts` — 给对应 interface 增加字段
3. 使用它的 `.astro` 模板 — 通过 `theme.config?.xxx?.yyy` 读取

读取默认值时用安全导航，例如 `theme.config?.layout?.postList?.descriptionLines == 0`。

## 侧边栏小组件（条目化 + 吸顶 + 配置外提）

**数据模型（`settings.yaml` 的 `sidebar` 分组）**：

- `widgetsConfig.widgets` / `widgetsConfig.rightWidgets` / `widgetsConfig.mobileWidgets`：条目数组，每项只有 `{ value, sticky?, name?, html? }`（`mobileWidgets` 的条目**没有 `sticky`**）。`value` 取值：`profile` / `announcement` / `popular-posts` / `categories` / `tag` / `music` / `hitokoto` / `site-stats` / `weather` / `schedule` / `html`（`name` + `html` 仅「自定义HTML」使用；条目里的条件字段必须用本列表专属字段名，见「常见坑」的 FormKit 条目——现状是 `widget_html_*` / `right_widget_html_*` / `mobile_widget_html_*`）。
- **`mobileWidgets`（移动端专用列表，<768px）**：留空 = 移动端沿用 `widgets` + `rightWidgets` 的条目与顺序；非空 = 移动端只显示本列表（`MobileSideBar.astro`，**没有吸顶概念**、按顺序排一个普通流块）。实现要点：
  1. **条目放在 `<template>` 里**（不是直接渲染），由组件内的 `is:inline` 脚本在移动端断点下 `cloneNode(true)` + `appendChild` 挂载——`<template>` 内容不渲染、内联脚本也不执行，于是「只在移动端用的小部件」在桌面端不会白跑请求（`innerHTML` 插入的脚本不会执行，DOM 插入的会）。挂载脚本必须 `is:inline` 且紧贴 template：Astro 处理过的脚本会变成 defer 模块，挂载推迟到解析结束，移动端会先闪一下左右两栏。
  2. 挂载成功后才给 `<html>` 加 `has-mobile-sidebar`，由 `Layout.astro` 的 `@media (max-width: 767.98px)` 规则隐藏 `#sidebar` / `#right-sidebar`。**类必须由脚本加、不能服务端渲染时就加**：脚本没跑（禁用 JS）时移动端照旧显示左右两栏，而不是白屏。
  3. 同一个小部件可以同时配在桌面列表与移动端列表：各小组件脚本都按实例作用域取元素（见「常见坑」的小组件条目），DOM 位置只决定视觉顺序——移动端两个 aside 是 `display:none`，不参与网格排布。
  4. 挂载是一次性的（`dataset.mounted` 守护）：侧栏在 Swup 容器之外，换页不重建、不重复请求；桌面→移动（拖窄/转屏）由 `matchMedia` 的 change 监听补挂一次。
- **`profile` / `announcement` 也是普通条目**（可自由排序、可勾吸顶），显示位置由「放进哪个列表」决定；原先的 `position` / `display_position` 与各自的 `enable` 开关已废弃。
- 各小组件的详细配置**外提为独立分组**：`sidebar.profile` / `announcement` / `siteStats` / `weather` / `hitokoto` / `music` / `schedule`。组件一律读 `theme.config?.sidebar?.<组>?.<字段>`，**不再从条目里读**（改配置读取时别去找 `widget.xxx`）。同类型小组件可在同一列表重复添加，共用同一份配置。
- 站点统计的「统计项」是多选数组（`sidebar.siteStats.items`），**数组顺序即前台展示顺序**。

**吸顶的前缀规则**：条目勾选「吸顶」才可能吸顶；未勾选的条目**只有在它前面所有条目都未勾选时**才真的不吸顶，一旦前面出现过勾选项就回退为吸顶。判定写作「前缀中未勾选吸顶的条目数 == 当前下标」：

```
widget.sticky == false and widgets.subList(0, widgetStat.index).?[#this.sticky == false].size() == widgetStat.index
```

两个约束：切片用 List 自身的 `subList(from, to)`（`#lists.subList` 不存在）；选择器 `.?[]` 内部**只引用 `#this`**，不能引用 Thymeleaf 上下文变量（SpringEL 7 会抛 EL1008E）。判定写在 `th:each` 同元素的 `th:if` 上（`th:each` 优先级更高，所以迭代变量可用）。

**渲染结构**：`SideBar.astro` / `RightSideBar.astro` 各自把列表切成「不吸顶区（正常流，排在吸顶块之前）」+「吸顶区」，两区（以及 `MobileSideBar` 的模板）都用 `<div th:replace="~{::widgetSwitch(${widget})}"></div>` 引用 `WidgetSwitch.astro` 里**只定义一次**的 `th:switch` 片段——新增/调整小组件分派只改它，**任何引用处都不要内联第二份 switch**（曾因 5 处内联把每页模板从 344 KB 撑到 654 KB、主题包从 3.1 MB 涨到 5.3 MB）。

**片段库 `WidgetSwitch.astro` 的两个硬约束**（改动前必读，其顶部注释有完整说明）：

1. 它是 Thymeleaf fragment（`th:fragment="widgetSwitch(widget)"`），定义处被外层 `<div th:if="false">` 守卫、由 `MainGridLayout` 全站只渲染一次 → 页面模板里只存一份标记，其余是五处一行引用；片段被选择走解析树、不受 `th:if` 影响，引用处照常取得到。
2. 守卫**必须留在外层元素**：若把 `th:if` / `th:remove` 写进片段根元素，被 `th:replace` 引用出的副本会连条件一起复制、渲染结果为空。片段根元素还要自带 `class="contents"`（`th:replace` 是整体替换，不保留引用点 div 的属性）。

- **默认小组件列表**（`settings.yaml` → 小组件设置，只对新安装/重置该字段生效，不影响站点已保存的配置）：左栏 `profile`(不吸顶) → `announcement`(不吸顶) → `categories` → `tag`；右栏 `hitokoto` → `site-stats`；移动端留空 = 不启用独立列表，手机端按「内容 → 左栏 → 右栏」顺序显示。`sticky` 复选框默认值是 `true`，不吸顶必须显式写 `sticky: false`，且只能出现在列表前缀（前缀规则见上）。

- `#sidebar-sticky` / `#right-sidebar-sticky` 两个 id 被 `Layout.astro`（吸顶 top / max-height）与 `global.css`（banner 偏移）引用，**勿改名**。

**目录（TOC）挂在哪一栏**：`post.toc.position`（`left` / 缺省 `right`）决定三栏布局下目录挂在哪个侧栏；两栏布局不受影响（继续用 `#toc-container` 的悬浮目录）。两侧栏结构完全对称：各有一个恒存在的**目录槽位容器** `#sidebar-toc` / `#right-sidebar-toc`，槽位内部由服务端按页条件渲染（文章页 + `enable_toc` + 位置在本栏 + 非两栏 → 卡片，否则空内容），**不需要任何客户端 refresh / 显隐代码**。

- 卡片本体是 `SidebarTOC.astro`，左右栏共用（**勿复制第二份**）；滚动容器靠 `closest("[data-toc-scroll]")` 定位、不认 id，所以换到任意一栏都能工作。
- 「文章页只留前 2 个吸顶组件」「吸顶块限高」「吸顶组件不参与收缩」三条**全部由 `Layout.astro` 的 CSS 承担、左右同源**，门控是 `:has(#sidebar-toc > *)` / `:has(#right-sidebar-toc > *)`（= 槽位里确实有卡片）；无目录的页面（首页/分类页等）三条都不命中，吸顶组件照常全部显示。三个坑：
  1. 隐藏组件的规则必须 `:not(#槽位id)` 排除槽位自身，否则「2 个吸顶组件 + 槽位」时槽位正好排第 3 个被隐藏；
  2. 槽位用 `#sidebar-toc, #right-sidebar-toc { display: contents }`（**不能用 `.contents` 类**，会被按 `.contents` 数量的规则误伤）；
  3. 整段包在 `md+`——卡片是 `hidden md:flex`，手机上不能让它白吃两个吸顶名额、也不该限高。
- **卡片必须用 `flex-auto`（`flex: 1 1 auto`）而不是 `flex-1`（`flex: 1 1 0%`）**：flex 负空间按「收缩系数 × flex-basis」分摊，basis 为 0 时卡片只会"有余量时长高、不够时一点不缩"，于是限高变化（导航栏出现让出 72px）会全部砸到吸顶组件上把它们压扁。配合「吸顶组件 `flex-shrink: 0`（选中 `.card-base`，覆盖 WidgetLayout / Profile / 自定义HTML 三种形态，widget 内部无嵌套 `.card-base`）」，差额才只由卡片承担（卡片内部本来就能滚）。**卡片内层滚动区（`[data-toc-scroll]`）同样必须 `flex-auto` 而不是 `flex-1`**：内层 basis 为 0 时它对卡片的内容高贡献为 0，卡片 basis 只剩标题高、被 `min-h` 钉死——单词条目录留一块空白、长目录把条目塞进几十像素的小滚动区（实测 20 条只有 140px 可滚）。`min-h` 保底取 6rem（≈ 标题 + 1 个条目）只为极端情况兜底，别调大。**空目录例外**：`:has([data-toc-empty]:not(.hidden))`（hidden 类由 TOC 组件按有无标题切换）时撤掉 `min-h` 保底并 `flex-grow: 0`，卡片收回内容高度，否则一行"此文章无目录"会被撑在一整块空白卡片里。吸顶块保持 `overflow: hidden`、不做内部滚动：极端情况下（两个吸顶组件本身就快到一屏、连卡片 `min-h` 保底都塞不下）目录底部会被裁，属已知取舍。
- **多实例组件的内部钩子用 `data-*`、不要用 `id`**：`TOC.astro` 一页会渲染多份（侧栏卡片、两栏悬浮目录、移动端弹窗），高亮条与空目录占位故用 `data-toc-indicator` / `data-toc-empty`。重 id 的坑在于 JS 与 CSS 行为不一致——`getElementById` / `querySelector("#…")` 只命中第一个实例，CSS 的 `#…` 却全部命中，表现为"某一份的脚本改错元素"且不报错；查这类钩子一律走 `this.querySelector()` 实例作用域，别用全站查找。

**两栏「右栏模式」**（`pageLayout.rightSidebarMode`，设置项仅在 `layoutMode === 'two-column'` 时出现）：侧栏与正文交换列位置，两栏的悬浮目录镜像到左侧空白槽。两栏的左右完全由 CSS 决定，改动面就是四处，改两栏布局时必须同步：

1. `Layout.astro` 的 `<body>` class `layout-two-column-right`（`th:classappend` 末尾追加）。**必须挂 body**：`#main-grid` 与 `#toc-container` 是兄弟节点，只有 body 级类能同时命中——既有的 `.layout-two-column` 挂在 `#top-row` 与面板 div 上，够不到 TOC（`TOC.astro` 里 `closest(".layout-three-column")` 与 `.layout-three-column [data-toc-entry]` 那套样式其实一直没生效，正是因为够不到）。
2. `#main-grid` 的 `grid-template-columns: 1fr 17.5rem`（原文 `17.5rem_1fr`）。
3. `#main-column`（主内容列，`MainGridLayout` 新加的 id）与 `#sidebar` 的 `grid-column-start` 互换。
4. `#toc-wrapper` 的 `right: auto; left: calc(-1 * var(--toc-width))`（`#toc-inner-wrapper` 是 fixed，横向走静态位置，跟着父元素走，无需另改）。

四处都用 `!important` 覆盖 Tailwind 的任意值工具类：同一属性两条任意值类谁生效取决于产物生成顺序，不可靠。移动端顺序（内容 → 左侧列表 → 右侧列表 → 页脚）与三栏布局都不受该开关影响。

- 右栏 aside 的断点行为：`<768px` 作为「第三项」可见、`768–1279px` 隐藏、`≥1280px` 三栏布局可见 / 两栏布局隐藏。右栏**不吸顶区**的间距只写 `mb-4 xl:mb-0`——xl 起 aside 自身是 `flex + gap-4`，再给 margin 会变成双倍间距。
- 移动端顺序天然是「左栏列表 → 右栏列表」（`#main-grid` 的排列顺序），已不存在「个人简介/公告固定第一二位」的老逻辑；也**已移除**「右栏的个人简介/公告回落左栏」的兜底，右栏条目在平板宽度下整体不显示。
- 小组件的**空卡守卫**（勾选项全落空时整卡不渲染）必须放在 `th:with` 的**外层**元素上：同元素 `th:if` 先于 `th:with` 执行，写在一起会拿到 `null`（`SiteStats.astro` 的 `stats` 就曾因此恒为 null，导致「只勾选访问量/点赞/评论」时整卡消失）。

## Halo/Thymeleaf 特有约定

- `th:text`（输出文本）、`th:if` / `th:unless`（条件）、`th:each`（循环）、`th:href`（链接）、`th:classappend`（追加类）——这些是 Thymeleaf 指令，不是前端属性。
- 模板变量来自 Halo 的 Finder API 与上下文：`post`、`posts`、`site`、`theme.config`、`theme.metadata` 等。
- `theme.config?.xxx` 用 `?.` 安全导航；字面值可写成 `|${...}|` 拼接。
- 静态资源用 `#theme.assets("/assets/...")` 或 `@{/assets/...}` 引用，构建后路径带 `/themes/Ethereal` 前缀。
- 图片拼 CDN 参数使用 `imageSuffixThWith(...)`（见 `src/utils/image-suffix.ts`），不要在模板里手写硬编码后缀。

## 组件表达式 prop 约定

`src/components/control/` 下的 `FilterTab.astro` / `FilterTabs.astro` / `PageHeader.astro` 把 Thymeleaf 表达式当**字符串 prop** 传，约定如下（务必遵守，否则只在 Halo 渲染期才暴露错误）：

- `activeExpr` / `allActiveExpr` 传**裸布尔表达式**（无 `${}`，如 `#lists.contains(param.group, group.spec.displayName)`）。组件会把它注入 `th:classappend` 的三元追加激活类。
- 其余表达式 prop（`hrefExpr` / `labelExpr` / `countExpr` / `showIfExpr` / `withExpr` / `countShowIfExpr` / `subExpr` / `titleExpr` / `filteredExpr` / `sepShowIfExpr` 及 `all*` 系列）传**完整表达式**（含 `${}` 或 `#{}`）。
- 动态 tab 列表用 `<div class="contents" th:each=...>` 包裹（组件标签上的 `th:each` 不会转发到根元素，故不能放 FilterTab 自身）。
- `iconClass` 只传 `icon-[...]` 名字面量，组件统一追加 `text-base text-(--primary)`；图标名必须留在页面源码，Tailwind/Iconify 内容扫描才能生成图标规则，勿用 `icon-[${name}]` 动态拼接。
- **沉默 footgun**：若把字面量误当表达式传（或漏写 `${}`），`astro build` 不报错，只在 Halo 服务端渲染时抛 Thymeleaf 解析异常。改这些组件前先读懂对应 `.astro` 文件顶部的传参注释。
- `src/components/widget/WidgetSwitch.astro` 不吃表达式 prop：片段内固定用参数 `widget`（引用处传 `${widget}`），自定义 HTML 条目取 `${widget.html}`（见「侧边栏小组件」的片段库说明）。

## 常见坑（务必注意）

- **不要改 `dist/`**：它是 `pnpm package` 打出的发布 zip 产物，改无效。要改就改 `src/` 后重新构建（HTML 模板产物在 `templates/`）。
- **Halo 模板缓存**：改完 `templates/` 后 Halo 不会自动重载，必须到后台「主题 → 重载主题」（或重新上传主题包）才生效。服务端渲染中途抛错会表现为**浏览器一直转圈（响应流截断）而非报错页**；此时用 curl 抓页面看是否以 `</html>` 结尾、并到日志搜 `TemplateProcessingException` 定位。直接 `>` 截断 `halo.log` 会因写入偏移错位产生空字节，要用 `strings` 命令读取。
- **Thymeleaf 同元素属性优先级：`th:if` 先于自身 `th:with` 执行**。依赖本元素 `th:with` 定义的变量不能直接放在同元素的 `th:if` 里（未定义时 SpEL 按 null 比较 → 恒 false，元素静默消失）。解法见 `MainGridLayout.astro` / timeline·skills 分页：外层包一个 `th:with` + `th:remove="tag"` 的元素先算变量，内层元素再写 `th:if`。同理，变量出了定义它的元素作用域即失效，跨块使用要么放公共祖先上、要么在目标元素重新计算。
- **`th:case` 与 `th:if` 不要写在同一元素上**（两者优先级同为 300，同元素行为不可靠）。需要「命中该 case 且满足额外条件」时，外层用 `<div th:case="...">` 壳、内层元素再写 `th:if`，见 `SiteStats.astro` 的访问量/点赞/评论/运行天数行。
- **`th:each` / `th:switch` 不要直接加在 flex 容器上**：容器会被复制 N 份，行与行之间的 `gap-*` 随之失效。把迭代/分派放进容器**内部**的 `<div class="contents">` 包装层（`display:contents` 不产生盒子，行仍是原容器的 flex 项），见 `SiteStats.astro`、`SideBar.astro`。
- **`th:style` 会整条替换元素上的 `style` 属性，要「追加」得用 `th:styleappend`**：Astro 的 `<style define:vars>` 会把 CSS 变量注入到组件根元素的 `style` 里（如 `WidgetLayout.astro` 的 `--collapsedHeight`），对这类元素写 `th:style` 会静默丢掉那些变量。
- **Thymeleaf 工具方法与类型坑**：`#strings.toInteger` / `#numbers.createInteger` / `#lists.subList` **都不存在**——字符串转数字用 `#conversions.convert(x, 'java.lang.Integer')`，列表切片用 List 自身的 `list.subList(from, to)`；`param.xxx` 是 `String[]` 数组，取值用 `param.xxx[0]` 并先判空和 `matches '\d+'`；FormKit number 字段存出来的可能是字符串，做算术前必须转类型。
- **Tailwind 任意值里的 `calc(.../2)` 的 `/` 会被解析成修饰符而无法生成**。需要除法时改用等价的固定单位（如 `top-2`、`top-0.5`），或把完整 `calc()` 写进 `is:global` 的 `<style>` 块。
- **带 `src={...}` / 属性声明的 `<script>` 会被当 `is:inline` 处理**，无法使用 TS/包导入。需要包导入的脚本务必显式加 `is:inline`，或改为模块脚本。
- **Astro 的组件 `<script>` 与 `<Icon>` 是同一种「只看首次使用处」的坑（脚本版）**：同一组件的脚本**全页只输出一次、落在第一个实例处**。若第一个实例由 Thymeleaf 运行时决定渲不渲染（如侧栏目录卡片可配在左栏或右栏、左栏源码更靠前），该实例被 `th:if` 移除时脚本一并丢失，另一栏的 `<table-of-contents>` 永远不会 upgrade——表现为**目录卡片整体空白**（条目、`此文章无目录` 占位都没有），而换到另一栏却正常。解法：自定义元素的注册与实现放进全局无条件的 `src/scripts/app.ts`（现存 `widget-layout`、`table-of-contents` 两处），组件里只留标记。
- **小组件脚本必须按实例取元素**：组件脚本是 `is:inline`、每个实例各跑一份，但 `document.getElementById("固定id")` 永远命中文档里**第一个**实例——同一个小部件配在两处（左栏 + 右栏、桌面 + 移动端列表、模板挂载后与桌面那份）时第二份就是空壳。三种既有做法：① `document.currentScript.parentElement` 取本实例容器，再 `querySelector("#id")`（`Hitokoto` / `SiteStats` / `Weather`；**变量名别撞上脚本里的局部变量**——Weather 里有局部 `root`，故用 `widgetRoot`）；② 每实例随机 id（`MusicPlayer` 的 `widgetId`、`PopularPosts` 的 `instanceId`）；③ `querySelectorAll` 一次性处理所有实例（`Announcement`）。页面级配置节点（`#theme-config`）继续用全局取值。
- **astro-icon 的 sprite 会丢图标**：`astro-icon/components` 的 `<Icon>` 默认走 sprite——同一页面内某个图标只在**首次使用处**输出 `<symbol>`，其余位置只输出 `<use href="#ai:...">`。若首次使用处落在由 Thymeleaf 运行时决定渲不渲染的分支里（如同一小组件可配在左栏或右栏，源码中左栏分支更靠前），该分支没渲染时另一栏就只剩 `<use>` 引用 → 图标全丢。这类位置改用全站统一的 span + `icon-[...]`（图标数据随元素自带，与渲染位置无关），见 `MusicPlayer.astro`；确实要保留 `<Icon>` 时给它加 `is:inline`。另：`astro.config.mjs` 的 `icon({ include })` 白名单已精简到 5 个（`BackToTop.astro` 与目录按钮在用的那几个），新增 `<Icon>` 前必须先把图标加进白名单，否则构建期直接报错。
- **`icon-[...]` 图标遮罩的 `-webkit-` 前缀会被构建链裁掉**：图标是 CSS 遮罩（`background-color: currentColor` + `mask-image: var(--svg)`），靠 `mask-size:100% 100%` 把固有 24px 的遮罩缩进 `1em` 方框；Chromium < 120（OPPO/一加自带 HeyTap 浏览器、老微信内置内核等）只认 `-webkit-mask-image` / `-webkit-mask-size` / `-webkit-mask-repeat`。这两条前缀是否被保留由构建链按「目标浏览器」决定、且随构建环境漂移（同一份源码不同机器可能一个有一个没有，官方 CI 产物 1.1.0–1.2.4 就缺），缺了表现为图标被裁掉右下角（字形贴边的图标最明显，见 issue #83）。因此 `scripts/ensure-icon-mask-prefix.mjs`（挂在 `astro.config.mjs` 的 `astro:build:done`）会对产物兜底补齐 `-webkit-mask-image/-size/-repeat` 三件套，并在日志里报告「补回 N 条」或「齐全」（压缩产物的末位声明不带分号，脚本会先补声明分隔符，并有"插入点必须在声明边界"的断言，避免再出现"静默产出非法 CSS 却显示已补回"）。**发版前复核**（脚本会就地修正，务必在临时解包目录跑）：`unzip -q dist/<包>.zip -d /tmp/check && node scripts/ensure-icon-mask-prefix.mjs /tmp/check/templates`——输出「齐全」= 包没问题，输出「已兜底补回」= 该包原本是坏的（别发）；再顺手确认无拼接事故：`grep -oh '.\{0,1\}-webkit-mask-size' /tmp/check/templates/assets/*.css | sort | uniq -c`，每行前导字符必须是 `;`。别用 `grep '\.icon-…'` 数条数当唯一判据：`group-[.liked]:icon-[…]` 这类变体选择器写作 `\:icon-\[`，会被漏掉（每份 CSS 少 1 条）。另：**验收/发布一律用 CI 产物**（`pnpm install --frozen-lockfile` + `pnpm build`），本机构建包可能因依赖漂移而「看着正常」，不能当发布依据。
- **Halo FormKit 已知坑（条件字段的 `key` / `preserve`）**：互斥 `if` 条件的同类型字段必须加唯一 `key`，否则 Vue 会复用组件实例导致设置值丢失（`settings.yaml` 里已有先例）。侧边栏条目里目前只剩「自定义HTML」还有条件字段，它们已按 `widget_html_name` / `widget_html_html`（右侧 `right_widget_*`）补齐 `key` + `preserve: true`。另：条件字段默认 `preserve: false`——字段因 `if` 不成立而卸载时**值会从父数据中移除**，表现为切换下拉后设置丢失，需要保留就显式加 `preserve: true`；而开了 `preserve` 后**不同条目的同名字段会互相覆盖**，故同一容器内不同用途的同名字段必须靠字段名区分（小组件的详细配置已外提为独立分组，组内字段名天然唯一，无需前缀）。
- **外提到独立分组的配置字段，一律不写无条件必填校验（`validation: required`）**：分组是常显的，「有没有用这个小组件」不再由字段是否存在表达，加了 `required` 会造成「没启用该小组件也保存不了设置」。必填语义改由「模板侧优雅降级 + help 文案提示」承担（例：`MusicPlayer.astro` 在 ID 为空时渲染「未配置 ID」提示卡，见「侧边栏小组件」）。
- **`select` 的多选模式（`multiple`）可当作「有序选项集合」控件**：`multiple: true`（提交 `value` 数组，**顺序 = 勾选顺序**）、`maxCount`（限选数量）、选项支持 `description`（label 下方说明，且参与本地搜索）。站点统计的「统计项」就是这么做的——数组顺序即前台展示顺序。⚠️ 实测（Halo 2.26）多选下拉**不支持拖动排序**，写 `sortable: true` 也不生效，help 文案别写成「可拖动排序」；要调顺序只能取消后按目标顺序重新勾选。
- **`array` 的 `itemLabels.label` 不是表达式，只认 `$value.<字段名>` 这个字面前缀**：Halo 的 `ArrayInput.vue` 用 `label.split("$value.")[1]` 取路径再 `get(item, path)`，写 `||`、字符串拼接、三元都会解析成空 → 条目列表全变空白（踩过一次）。要显示条目自身字段就写 `label: $value.value`；另外**不写 `itemLabels` 时它默认列出条目的所有字段**（`value`、`sticky`…），所以要么显式写、要么接受全字段展示。
- **布局/断点覆盖**：网格 vs 列表、移动端 vs 桌面端的样式差异集中在 `PostList.astro` 的 `is:global` `<style>` 块里，改卡片样式前先看那里有没有对应覆盖，别只改组件类。
- **i18n 词条里的字面花括号必须转义**：词条值中若需要字面 `{location}` 这类占位（非 `{0}` 数字参数），必须写成 `'{'location'}'`（MessageFormat 单引号转义），否则渲染 `[(#{...})]` 时 MessageFormat 会把它当参数占位符解析并抛错，曾导致全站白屏。新增含花括号词条前先看 `i18n/default.properties` 里 `welcome.defaultTemplate` 的写法。
- **全局 i18n 助手**：`t()` 读取 `window.i18nResources` 的客户端翻译助手统一由 `Layout.astro` 注入（`window.__etherealI18n`，另含 `__etherealLangTag`/`__etherealSetLanguage`/`__etherealBigNum`）。内联脚本复用即可，不要各自复制实现。
- **外链 CDN 封面防盗链（B 站等）**：跨域 `<img>` 加载失败显示坏图、但新窗口打开又能正常加载，多半是 CDN 检查 `Referer` 头防盗链。给 `<img>` 加 `referrerpolicy="no-referrer"` 即可，见 `src/pages/bangumis.astro` 追番封面。

## 导航栏滚动显隐（固定菜单栏开关）

后台开关：`settings.yaml` 的 `layout.mobileMenu.navbarFixed` → `<html data-navbar-fixed>`（`Layout.astro`）。

- **固定/非固定两种模式在桌面端（≥1024px）都是 fixed**：`#navbar-wrapper` 的定位规则写在 `Layout.astro` 的 `is:global` `<style>` 块里，不再带 `html[data-navbar-fixed="true"]` 前缀。区别只在 `navbar-hidden` 是否生效——固定模式强制 `translate:none` 永不隐藏；非固定模式由 `scroll-manager.ts` 按**滚动方向**加/移除 `navbar-hidden`（上滑或仍在顶部阈值内显示，下滑且离开顶部隐藏）。**别把非固定模式退回 sticky**：sticky 的粘附范围只有 `#top-row` 高度，滚出视口后上滑回不来，方向感知就失效了。
- **方向判定有 8px 死区**（`scroll-manager.ts` 的 `SCROLL_DIRECTION_DEADZONE_PX`）：位移未超死区不翻转状态、也不更新基准（小位移可累积）。触控板微动/惯性回弹/橡皮筋产生的 1~2px 反向 delta 会让无死区的实现高频闪烁。顶部区（`scrollY <= threshold`）恒显示，不受死区约束。
- **状态统一在 `scrollFunction` 末尾落定**：移动端 / 固定模式 / 无导航栏时不隐藏，并清掉可能残留的 `navbar-hidden`、`body.dynamic-navbar-hidden`、`inert`，避免桌面缩窗或切模式后状态泄漏。隐藏态同步给 `#navbar-wrapper` 加 `inert`（否则键盘 Tab 会聚焦进已 translate 出视口的导航栏）。
- 导航栏隐藏时给 `body` 加 `dynamic-navbar-hidden`，`Layout.astro` 桌面块用它把 `--navbar-sticky-offset`（默认 `--navbar-height`）归零，侧边栏吸顶 `top` 与目录 `max-height` 统一引用该变量——新增页面类型只需写一遍规则，不要再加成对的 `.dynamic-navbar-hidden` 回退块。固定模式永不隐藏，该类不会被加。
- 移动/平板（<1024px）恒 fixed 且永不隐藏。插件契约页 `templates/layout.html` 自带外壳、不加载本样式块，不受上述规则影响。

## 访客样式切换（显示设置面板）

导航栏「显示设置」面板允许访客切换样式（参考 firefly）。后台开关在 `settings.yaml` 的 `layout.mobileMenu.visitorStyle` 子组，缺省视为开启；开关为**标签页级**（外观/壁纸/特效，一个开关对应面板一个标签页），仅在总开关 `enable` 开启时显示；标签页内的模式相关细分显隐（透明设置仅全屏透明等）仍由客户端按当前模式判断。面板 Tab 栏由「可见 Tab 收集」（`DisplaySettings.svelte` 的 `visibleTabs`）驱动：≥2 个显示 Tab 栏、=1 个直接渲染该分区。

**localStorage 键清单（改键名需三处同步）**：`postListLayout`（list/grid）、`cardBorder`（卡片边框和阴影）、`cardFollowTheme`（卡片跟随主题色）、`navbarBlur`（bool 字符串）、`postListMasonry`（bool 字符串，仅网格布局生效）、`wallpaperOpacity`（0–1）、`wallpaperBlur`（px 数值）、`wallpaperCardAlpha`（0–1）、`bannerDisplay`（disabled/banner/fullscreen/transparent）、`bannerWave`（bool 字符串）、`bannerTitle`（bool 字符串，首页壁纸标题）、`sakuraEnabled`（bool 字符串，樱花特效，切换后经 `sakuraToggle` 事件实时启停脚本）。开关关闭时对应键会被忽略并清理（与 `fixed` 固定色调、`__eecs` 语义一致）。**`cardHoverLift` 已退役**（卡片悬浮效果不再对访客开放、恒用后台默认），首帧脚本仅清理其残留键。

**壁纸模式切换约定**：`#banner-wrapper` / `#scroll-down-indicator` / `#banner-credit` / 波浪容器恒渲染（已去 `th:if`），显隐与定位全由 `html[data-banner-display]` 门控（`components.css`），`applyBannerDisplay` 同时切 `body.enable-banner` 并按模式重算 `--banner-height-extend` px（全屏 65vh / 横幅 30vh，数值来自 `constants.ts`）。波浪关闭用 `body.wave-disabled`（CSS 隐藏），开启时由后台默认 + `wave.js` 的 desktop_only 守卫决定。

**模式切换过渡（性能治理，改动过渡/层化规则前必读）**：切换窗口由 `applyBannerDisplay` 临时挂 `html.banner-mode-transitioning` 开、结束移除，`components.css` 内规则分四组：①窗口过渡（panel / grid / wrapper / 媒体层，时长 `--dur-banner`）；②层化清单（grid、moments、侧栏吸顶块临时 `translateZ(0)`，含移动端）；③移动端瞬时化清单（<768px 一律 `transition: none`）；④媒体层桌面专属（≥768px 推拉镜头）。三个同步点：窗口内**新增带过渡的元素**要同步加进瞬时化清单（移动端唯一剔除机制）；层化容器内**新增 fixed 元素**要移出（层化期定位基准变化）；两处 **768px 断点**（瞬时化 / 桌面媒体层）联动修改。规则细节与「勿再删除」警告见 `components.css` 对应注释块——勿凭直觉改动（曾误判「无过渡 = 层化无用」撤掉移动端层化、实测回归卡顿）。

**Banner 高度体系（`constants.ts` 为权威定义）**：`--banner-height-extend` 的 px 换算基准是 `cssVhViewportHeight()`（与 CSS 100vh 同基准），**不能**用 `window.innerHeight`（动态视口，动态地址栏浏览器上会露缝）；写入统一走 `writeBannerHeightExtend()`（含写守卫）。同步点：`variables.css` 默认值、`Layout.astro` 两处内联脚本（探针手写拷贝）、`banner-sync.ts`。

**默认值传递链路**：后台 `theme.config` → `src/components/ConfigCarrier.astro` 的 `th:data-*` 属性 → `src/utils/setting-utils.ts` 读取。重置默认值时也从 ConfigCarrier 读，勿依赖 body 内联变量（被 JS 覆盖后原值丢失）。

**入口条件同步约定**：`Navbar.astro` 中显示设置按钮的 `th:if` 会枚举 visitorStyle 标签页开关（外观/壁纸/特效），与 `ConfigCarrier.astro` 的 `th:data-visitor-*` 一一对应——**新增/删除标签页开关时两处必须同步修改**（Thymeleaf 无法从 data 属性推导，只能手写枚举）。

**脚本执行顺序约定**（务必保持）：

- `public/assets/visitor-post-layout.js`（同步，首帧换布局类）必须在 `public/assets/post-list-layout.js`（defer，瀑布流）**之前**，`PostList.astro` 中标签顺序保证；两者均由 SwupScriptsPlugin 按序重执行。
- `post-list-layout.js` 暴露 `window.__postListRelayout`，访客换类后调用它触发瀑布流重排/复位。
- `Layout.astro` body 起始处（`<ConfigCarrier />` 后）的 `is:inline` 脚本应用卡片/壁纸变量，仅在首载运行一次（body 不被 Swup 替换）。

**脚本门控约定**（I27，改动脚本时同步检查）：

- **文章页三件套**：`post-like.js` / `post-share.js` / `post-reward.js` 在 `post.astro` 各自按 `actionBar.like/share/reward` 子开关 `th:if` 门控；`qrcode.bundle.js` 不在模板引用，由 `post-share.js` 首次生成海报时经按钮 `data-qr-src` 动态注入（`window.__etherealQRState` 守卫，加载失败走 hasQR 退化）。
- **banner 脚本**：`MainGridLayout.astro` 中 6 个 banner 脚本包在 `{isHomePage && <div th:with={bannerThWith()} th:remove="tag">}` 内，按 `mode == 'carousel'` / `isVideo` / `mobileActive` 精确门控——与 `#banner-wrapper` 的 `th:with` 同源表达式，新增模式时两处条件必须一致。
- **friends/links 合并**：`friends.bundle.js`（4 脚本合并）在 `friends.astro` 以 `not #lists.isEmpty(allItems.items)` 门控（空列表不加载）；`links.bundle.js`（5 脚本合并）恒加载，link-apply/random-visit 的外部门控已移除，改由脚本内部元素存在性守卫承担（新增 links 功能时往 bundle 加 IIFE + 守卫）。
- **`window.__themeConfig` 缓存契约**：`#theme-config` JSON 由首个消费脚本 parse 并写入 `window.__themeConfig`，其余脚本（含 public/ legacy 的 wave/banner-carousel/banner-src-switch、WelcomePopup 内联脚本）直接复用，不得各自重复 `JSON.parse`。
- **樱花特效**：`sakura.js` 在 `Layout.astro` 尾部按 `styleSwitches.sakura == true or (visitorStyle.enable != false and visitorStyle.effects != false)` 门控（两者都不成立时樱花永不显示、不输出脚本标签）；默认值走 ConfigCarrier `data-sakura-default`，「访客样式切换 → 特效切换」关闭时忽略 `sakuraEnabled`（Layout 启动脚本负责清理）；图片 / Worker 路径从脚本自身 `src` 推导（`sakura-worker.js` 由主脚本按经典 Worker 加载，不支持 OffscreenCanvas 时回退主线程绘制）；参数集中在 `_sakura-config.ts`、绘制核心 `_sakura-core.ts` 两套实现共享。

**面板文案 i18n**：`display.*` 键需同时维护 `i18n/*.properties` 与 `Layout.astro` 的 `i18nInlineScript` 两处，缺一会回退到组件内的中文兜底。

## 注释规范

注释密度高是本项目有意为之（坑位警告、同步点、反直觉因果都要写清），但表达必须收敛——**只描述「当前代码为什么是这样」，不写日期、不写过程叙事**。标准如下：

**不写的**：

- **日期 / 阶段标注**：「（2026-10）」「（I27 引入）」这类一律删——版本信息 git 历史里有，注释只留结论。
- **过程叙事**：「曾经写在页头区上…已移出」「一度误判…」这类发现问题 → 修复的故事不写；教训有防错价值时压成一句警示（如「曾误判『无过渡 = 层化无用』撤掉、实测回归卡顿，勿再删除」）。
- **重复表述**：同一信息多处出现时只留一处（靠近定义处 / 更权威的那处）。
- **展开的举例清单**：能压成一行就压成一行；读代码就懂的解释不写。

**必须保留的**：

- ⚠️ 同步点（如「改这里必须同步 variables.css / Layout.astro 内联脚本」）与成对断点的同步提示；
- ⚠️ 防错警告（「勿再删除」「勿改回 X」并说明后果）；
- 反直觉因果（「不能用 A，因为会 B」）；
- 数值依据（换算关系、阈值来源）与结构契约（ASCII 结构图、表达式契约）。

**格式**：

- 一律中文说明；引用变量 / 选择器直接写标识符，沿用「」引号，不用 Markdown `**` 强调（在代码注释里没有渲染意义）。
- 长注释块（>10 行）须有明确理由（结构契约 / 多步约定），否则压到 3~8 行。
- 改代码时顺手修正或删除被改处的过时注释，不留待下轮。

## 提交规范

提交信息格式：`<type>: <中文描述> (#N)`，`type` 参考 `feat`（新功能）/ `fix`（修复）/ `chore`（构建、版本等），issue 编号写在括号里，多个用空格分隔（如 `(#17 #19)`）。复杂改动在提交信息正文用 `-` 逐项列出。

- **提交信息只描述该提交相对上一个提交的交付差异**（新增/变更了什么），**不要写开发过程中「发现问题 → 修复」的过程性叙述**（如「避免 XX 残留」「修复悬浮高亮不均」「规避 XX 取空」）——后者是开发日志，不属于交付描述。
- **AI 不得私自创建 commit，也不得推送远程仓库**：只有用户明确要求时才执行 `git commit` / `git push`，且先与用户确认范围。禁止 `push --force`，禁止 amend / rebase 已推送的提交；默认禁止推云端，推送前需用户明确授权。
- AI 提交时默认**排除 `theme.yaml` 的版本号改动**（版本号由发布流程手工提升），除非用户明确要求包含。
