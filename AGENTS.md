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

| 命令               | 作用                                                      |
| ------------------ | --------------------------------------------------------- |
| `pnpm build:only`  | 仅执行 `astro build`，输出到 `templates/`（开发调试常用） |
| `pnpm build`       | `astro build` + `pnpm package`（打成发布 zip）            |
| `pnpm astro check` | 类型检查，务必在改动后运行确认 0 error                    |
| `pnpm format`      | prettier 格式化全项目                                     |

**重要：改完代码后运行的校验是 `pnpm astro check` 和 `pnpm build:only`。** 两类产物的位置不同：`astro build` 的 HTML 模板输出到 `templates/`；`pnpm package` 打出的发布 zip 输出到 `dist/`。两者都是构建生成、勿手动编辑——要改就改 `src/` 后重新构建。

## 目录结构速览

- `src/pages/*.astro` — 页面模板（`post.astro`、`index.astro`、`category.astro` 等）
- `src/components/*.astro` / `*.svelte` — 可复用组件（`PostCard.astro`、`PostList.astro` 等）
- `src/layouts/*.astro` — 页面布局（`Layout.astro`、`MainGridLayout.astro`）
- `src/styles/*.css` — 全局样式与 CSS 变量（`variables.css` 定义主题色/圆角等）
- `src/types/config.ts` — `theme.config` 的类型定义
- `src/utils/*.ts` — 工具（`post-list-config.ts`、`image-suffix.ts`）
- `settings.yaml` — **后台主题设置表单**（改后台开关/设置项在这里）
- `theme.yaml` — 主题元信息，**版本号唯一来源**（`version` 字段）
- `i18n/` — 多语言文案
- `templates/` — 构建产物（勿手改，会被 `astro build` 覆盖）

## 主题设置（settings.yaml → theme.config）

`settings.yaml` 里每个 `group` 对应后台的一个设置页分组；每个 `name` 字段会出现在前端的 `theme.config?.<group>?.<name>`。

**改动设置项需要同步修改的地方（务必三处一致）：**

1. `settings.yaml` — 新增/修改表单项
2. `src/types/config.ts` — 给对应 interface 增加字段
3. 使用它的 `.astro` 模板 — 通过 `theme.config?.xxx?.yyy` 读取

读取默认值时用安全导航，例如 `theme.config?.post?.postList?.descriptionLines == 0`。

## Halo/Thymeleaf 特有约定

- `th:text`（输出文本）、`th:if` / `th:unless`（条件）、`th:each`（循环）、`th:href`（链接）、`th:classappend`（追加类）——这些是 Thymeleaf 指令，不是前端属性。
- 模板变量来自 Halo 的 Finder API 与上下文：`post`、`posts`、`site`、`theme.config`、`theme.metadata` 等。
- `theme.config?.xxx` 用 `?.` 安全导航；字面值可写成 `|${...}|` 拼接。
- 静态资源用 `#theme.assets("/assets/...")` 或 `@{/assets/...}` 引用，构建后路径带 `/themes/Ethereal` 前缀。
- 图片拼 CDN 参数使用 `imageSuffixThWith(...)`（见 `src/utils/image-suffix.ts`），不要在模板里手写硬编码后缀。

## 常见坑（务必注意）

- **不要改 `dist/`**：它是 `pnpm package` 打出的发布 zip 产物，改无效。要改就改 `src/` 后重新构建（HTML 模板产物在 `templates/`）。
- **Tailwind 任意值里的 `calc(.../2)` 的 `/` 会被解析成修饰符而无法生成**。需要除法时改用等价的固定单位（如 `top-2`、`top-0.5`），或把完整 `calc()` 写进 `is:global` 的 `<style>` 块。
- **带 `src={...}` / 属性声明的 `<script>` 会被当 `is:inline` 处理**，无法使用 TS/包导入。需要包导入的脚本务必显式加 `is:inline`，或改为模块脚本。
- **Halo FormKit 已知坑**：互斥 `if` 条件的同类型字段必须加唯一 `key`，否则 Vue 会复用组件实例导致设置值丢失（`settings.yaml` 里已有先例）。
- **布局/断点覆盖**：网格 vs 列表、移动端 vs 桌面端的样式差异集中在 `PostList.astro` 的 `is:global` `<style>` 块里，改卡片样式前先看那里有没有对应覆盖，别只改组件类。

## 提交规范

提交信息格式：`<type>: <中文描述> (#N)`，`type` 参考 `feat`（新功能）/ `fix`（修复）/ `chore`（构建、版本等），issue 编号写在括号里，多个用空格分隔（如 `(#17 #19)`）。复杂改动在提交信息正文用 `-` 逐项列出。
