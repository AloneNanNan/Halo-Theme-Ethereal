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

## 目录结构速览

- `src/pages/*.astro` — 页面模板（`post.astro`、`index.astro`、`category.astro` 等）
- `src/components/*.astro` / `*.svelte` — 可复用组件（`PostCard.astro`、`PostList.astro` 等）
- `src/components/control/` — 分组页共享控件：`FilterTab.astro` / `FilterTabs.astro`（分组筛选 tab）/ `PageHeader.astro`（页头），把 Thymeleaf 表达式当字符串 prop 传（见「组件表达式 prop 约定」）
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

## 常见坑（务必注意）

- **不要改 `dist/`**：它是 `pnpm package` 打出的发布 zip 产物，改无效。要改就改 `src/` 后重新构建（HTML 模板产物在 `templates/`）。
- **Halo 模板缓存**：改完 `templates/` 后 Halo 不会自动重载，必须到后台「主题 → 重载主题」（或重新上传主题包）才生效。服务端渲染中途抛错会表现为**浏览器一直转圈（响应流截断）而非报错页**；此时用 curl 抓页面看是否以 `</html>` 结尾、并到日志搜 `TemplateProcessingException` 定位。直接 `>` 截断 `halo.log` 会因写入偏移错位产生空字节，要用 `strings` 命令读取。
- **Thymeleaf 同元素属性优先级：`th:if` 先于自身 `th:with` 执行**。依赖本元素 `th:with` 定义的变量不能直接放在同元素的 `th:if` 里（未定义时 SpEL 按 null 比较 → 恒 false，元素静默消失）。解法见 `MainGridLayout.astro` / timeline·skills 分页：外层包一个 `th:with` + `th:remove="tag"` 的元素先算变量，内层元素再写 `th:if`。同理，变量出了定义它的元素作用域即失效，跨块使用要么放公共祖先上、要么在目标元素重新计算。
- **Thymeleaf 工具方法与类型坑**：`#strings.toInteger` / `#numbers.createInteger` / `#lists.subList` **都不存在**——字符串转数字用 `#conversions.convert(x, 'java.lang.Integer')`，列表切片用 List 自身的 `list.subList(from, to)`；`param.xxx` 是 `String[]` 数组，取值用 `param.xxx[0]` 并先判空和 `matches '\d+'`；FormKit number 字段存出来的可能是字符串，做算术前必须转类型。
- **Tailwind 任意值里的 `calc(.../2)` 的 `/` 会被解析成修饰符而无法生成**。需要除法时改用等价的固定单位（如 `top-2`、`top-0.5`），或把完整 `calc()` 写进 `is:global` 的 `<style>` 块。
- **带 `src={...}` / 属性声明的 `<script>` 会被当 `is:inline` 处理**，无法使用 TS/包导入。需要包导入的脚本务必显式加 `is:inline`，或改为模块脚本。
- **Halo FormKit 已知坑**：互斥 `if` 条件的同类型字段必须加唯一 `key`，否则 Vue 会复用组件实例导致设置值丢失（`settings.yaml` 里已有先例）。
- **布局/断点覆盖**：网格 vs 列表、移动端 vs 桌面端的样式差异集中在 `PostList.astro` 的 `is:global` `<style>` 块里，改卡片样式前先看那里有没有对应覆盖，别只改组件类。
- **i18n 词条里的字面花括号必须转义**：词条值中若需要字面 `{location}` 这类占位（非 `{0}` 数字参数），必须写成 `'{'location'}'`（MessageFormat 单引号转义），否则渲染 `[(#{...})]` 时 MessageFormat 会把它当参数占位符解析并抛错，曾导致全站白屏。新增含花括号词条前先看 `i18n/default.properties` 里 `welcome.defaultTemplate` 的写法。
- **全局 i18n 助手**：`t()` 读取 `window.i18nResources` 的客户端翻译助手统一由 `Layout.astro` 注入（`window.__etherealI18n`，另含 `__etherealLangTag`/`__etherealSetLanguage`/`__etherealBigNum`）。内联脚本复用即可，不要各自复制实现。
- **外链 CDN 封面防盗链（B 站等）**：跨域 `<img>` 加载失败显示坏图、但新窗口打开又能正常加载，多半是 CDN 检查 `Referer` 头防盗链。给 `<img>` 加 `referrerpolicy="no-referrer"` 即可，见 `src/pages/bangumis.astro` 追番封面。

## 访客样式切换（显示设置面板）

导航栏「显示设置」面板允许访客切换样式（参考 firefly）。后台开关在 `settings.yaml` 的 `layout.mobileMenu.visitorStyle` 子组，缺省视为开启；子项开关（主题色相/文章布局/卡片样式/壁纸模式/壁纸设置/透明设置）仅在总开关 `enable` 开启时显示，瀑布流与波浪不再单独设开关（分别随卡片样式、壁纸设置区联动）。

**localStorage 键清单（改键名需三处同步）**：`postListLayout`（list/grid）、`cardHoverLift`、`navbarBlur`（bool 字符串）、`postListMasonry`（bool 字符串，仅网格布局生效）、`wallpaperOpacity`（0–1）、`wallpaperBlur`（px 数值）、`wallpaperCardAlpha`（0–1）、`bannerDisplay`（disabled/banner/fullscreen/transparent）、`bannerWave`（bool 字符串）、`bannerTitle`（bool 字符串，首页壁纸标题）。开关关闭时对应键会被忽略并清理（与 `fixed` 固定色调、`__eecs` 语义一致）。

**壁纸模式切换约定**：`#banner-wrapper` / `#scroll-down-indicator` / `#banner-credit` / 波浪容器恒渲染（已去 `th:if`），显隐与定位全由 `html[data-banner-display]` 门控（`components.css`），`applyBannerDisplay` 同时切 `body.enable-banner` 并按模式重算 `--banner-height-extend` px（全屏 65vh / 横幅 30vh，数值来自 `constants.ts`）。波浪关闭用 `body.wave-disabled`（CSS 隐藏），开启时由后台默认 + `wave.js` 的 desktop_only 守卫决定。

**默认值传递链路**：后台 `theme.config` → `src/components/ConfigCarrier.astro` 的 `th:data-*` 属性 → `src/utils/setting-utils.ts` 读取。重置默认值时也从 ConfigCarrier 读，勿依赖 body 内联变量（被 JS 覆盖后原值丢失）。

**入口条件同步约定**：`Navbar.astro` 中显示设置按钮的 `th:if` 会逐项枚举 visitorStyle 子开关，与 `ConfigCarrier.astro` 的 `th:data-visitor-*` 一一对应——**新增/删除访客子开关时两处必须同步修改**（Thymeleaf 无法从 data 属性推导，只能手写枚举）。

**脚本执行顺序约定**（务必保持）：

- `public/assets/visitor-post-layout.js`（同步，首帧换布局类）必须在 `public/assets/post-list-layout.js`（defer，瀑布流）**之前**，`PostList.astro` 中标签顺序保证；两者均由 SwupScriptsPlugin 按序重执行。
- `post-list-layout.js` 暴露 `window.__postListRelayout`，访客换类后调用它触发瀑布流重排/复位。
- `Layout.astro` body 起始处（`<ConfigCarrier />` 后）的 `is:inline` 脚本应用卡片/壁纸变量，仅在首载运行一次（body 不被 Swup 替换）。

**脚本门控约定**（I27，改动脚本时同步检查）：

- **文章页三件套**：`post-like.js` / `post-share.js` / `post-reward.js` 在 `post.astro` 各自按 `actionBar.like/share/reward` 子开关 `th:if` 门控；`qrcode.bundle.js` 不在模板引用，由 `post-share.js` 首次生成海报时经按钮 `data-qr-src` 动态注入（`window.__etherealQRState` 守卫，加载失败走 hasQR 退化）。
- **banner 脚本**：`MainGridLayout.astro` 中 6 个 banner 脚本包在 `{isHomePage && <div th:with={bannerThWith()} th:remove="tag">}` 内，按 `mode == 'carousel'` / `isVideo` / `mobileActive` 精确门控——与 `#banner-wrapper` 的 `th:with` 同源表达式，新增模式时两处条件必须一致。
- **friends/links 合并**：`friends.bundle.js`（4 脚本合并）在 `friends.astro` 以 `not #lists.isEmpty(allItems.items)` 门控（空列表不加载）；`links.bundle.js`（5 脚本合并）恒加载，link-apply/random-visit 的外部门控已移除，改由脚本内部元素存在性守卫承担（新增 links 功能时往 bundle 加 IIFE + 守卫）。
- **`window.__themeConfig` 缓存契约**：`#theme-config` JSON 由首个消费脚本 parse 并写入 `window.__themeConfig`，其余脚本（含 public/ legacy 的 wave/banner-carousel/banner-src-switch、WelcomePopup 内联脚本）直接复用，不得各自重复 `JSON.parse`。

**面板文案 i18n**：`display.*` 键需同时维护 `i18n/*.properties` 与 `Layout.astro` 的 `i18nInlineScript` 两处，缺一会回退到组件内的中文兜底。

## 提交规范

提交信息格式：`<type>: <中文描述> (#N)`，`type` 参考 `feat`（新功能）/ `fix`（修复）/ `chore`（构建、版本等），issue 编号写在括号里，多个用空格分隔（如 `(#17 #19)`）。复杂改动在提交信息正文用 `-` 逐项列出。
