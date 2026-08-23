# 贡献指南

感谢你愿意为 **Ethereal** 贡献代码。本仓库是 Halo 主题，构建链路与普通前端项目略有不同，提交前请务必读完本指南。

> 面向 AI 协作者：仓库根目录提供 [`AGENTS.md`](./AGENTS.md)，内含更完整的构建命令、目录约定、Halo/Thymeleaf 约定、常见坑与提交规范。使用 AI 编码工具（Codex / opencode / Cursor 等）贡献前请先阅读。

## 项目简介

Ethereal 是一款基于 Astro 构建的 Halo CMS 主题。先用 Astro 编写组件与模板，构建后输出为 Halo 使用的 Thymeleaf 模板，再由 Halo（Spring Boot + Thymeleaf）在服务端渲染最终页面。

**核心心智模型**：你在 `.astro` 文件里写的 `th:xxx` 属性不是前端语法，而是给 Thymeleaf 模板引擎用的指令，构建后原样保留在 `templates/*.html` 里。

技术栈：**Astro**（页面/路由）+ **Svelte 5**（交互组件）+ **Tailwind CSS 4** + **TypeScript** + **Swup**（页面过渡动画）+ **Iconify**（图标）。

## 环境准备

需要 **Node.js >= 22.12.0**（推荐 24.x，见仓库根目录 `.nvmrc`）与 **pnpm**。

```bash
# 克隆项目（Fork 后请 clone 你自己的仓库）
git clone https://github.com/AloneNanNan/halo-theme-ethereal.git
cd halo-theme-ethereal

# 安装依赖
pnpm install
```

### 常用命令

| 命令               | 作用                                           |
| ------------------ | ---------------------------------------------- |
| `pnpm dev`         | 开发模式，监听 `src/` 文件变更自动重建         |
| `pnpm build:only`  | 仅执行 `astro build`，输出到 `templates/`      |
| `pnpm build`       | 完整构建 + 打包发布 zip（输出到 `dist/`）      |
| `pnpm astro check` | 类型检查，提交前务必确认 0 error               |
| `pnpm format`      | prettier 格式化全项目，随后刷新 README-Halo.md |
| `pnpm readme:halo` | 单独触发 README→README-Halo 转换               |

## 目录速览

| 路径                                      | 说明                                                                                                                                |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `src/pages/*.astro`                       | 页面模板（`post.astro`、`index.astro`、`category.astro` 等）                                                                        |
| `src/components/`                         | 可复用组件（`*.astro` / `*.svelte`），其中 `control/` 为分组页共享控件（FilterTab/FilterTabs/PageHeader，表达式以字符串 prop 传入） |
| `src/layouts/*.astro`                     | 页面布局（`Layout.astro`、`MainGridLayout.astro`）                                                                                  |
| `src/styles/*.css`                        | 全局样式与 CSS 变量                                                                                                                 |
| `src/types/config.ts`                     | `theme.config` 的类型定义                                                                                                           |
| `src/utils/*.ts`                          | 工具函数                                                                                                                            |
| `src/scripts/assets/`                     | 经典脚本源码（esbuild 编译为 IIFE 输出到 `public/assets/`）                                                                         |
| `src/scripts/vendor/`                     | 第三方 vendored 资产（原样拷贝，不经编译）                                                                                          |
| `settings.yaml`                           | 后台主题设置表单                                                                                                                    |
| `theme.yaml`                              | 主题元信息，**`version` 字段禁止修改**                                                                                              |
| `i18n/`                                   | 多语言文案                                                                                                                          |
| `templates/` / `dist/` / `public/assets/` | 构建产物（勿手改，会被构建覆盖）                                                                                                    |

## 代码约定

### `src/` 是唯一真源

`templates/` 是 `astro build` 的产物，`dist/` 是 `pnpm package` 打出的发布 zip，`public/assets/` 是经典脚本的编译产物，**三者都是构建生成，手动修改无效**。要改就改 `src/` 后重新构建。

同理，根目录 `README-Halo.md` 是 `scripts/convert-readme.mjs` 从 README.md 生成的降级版（Halo 应用市场渲染器不支持 `<picture>` 徽章），已进 `.gitignore` 不提交、勿手改；改徽章只改 README.md 源文件后跑 `pnpm readme:halo` 重新生成。

经典脚本请改 `src/scripts/assets/*.ts` 源码（带 `// @ts-nocheck` 的 legacy 脚本也已迁入，统一用 `.ts` 后缀），不要直接编辑 `public/assets/*.js`。

### 禁止修改 `theme.yaml` 的 `version`

版本号是发布流程唯一来源，CI 会根据它检测版本是否增大、自动打 tag 发布。**贡献者不得改动 `version` 字段**，否则会与线上主题版本错乱。

### 主题设置需要三处同步

改后台设置项时，以下三处必须保持一致：

1. `settings.yaml` — 新增/修改表单项
2. `src/types/config.ts` — 给对应 interface 增加字段
3. 使用它的 `.astro` 模板 — 通过 `theme.config?.xxx?.yyy` 读取

读取默认值时用安全导航，例如 `theme.config?.layout?.postList?.descriptionLines == 0`。

另外，访客样式切换面板的子开关（主题色相 / 文章布局 / 卡片样式 / 壁纸等）需要 **两处同步**：`Navbar.astro` 中显示设置按钮的 `th:if` 与 `ConfigCarrier.astro` 的 `th:data-visitor-*` 属性一一对应，**新增/删除子开关时必须同时修改这两处**。

### Thymeleaf 常用指令

模板变量来自 Halo 的 Finder API 与上下文：`post`、`posts`、`site`、`theme.config` 等。

| 指令                  | 用途     |
| --------------------- | -------- |
| `th:text`             | 输出文本 |
| `th:if` / `th:unless` | 条件判断 |
| `th:each`             | 循环     |
| `th:href`             | 链接     |
| `th:classappend`      | 追加类名 |

### 常见坑

- **Tailwind 任意值里的除法**：`calc(.../2)` 中的 `/` 会被解析成修饰符而无法生成。需要除法时改用等价的固定单位，或把完整 `calc()` 写进 `is:global` 的 `<style>` 块。
- **带 `src={...}` 的 `<script>`**：会被当 `is:inline` 处理，无法使用 TS/包导入。需要包导入的脚本务必显式加 `is:inline`，或改为模块脚本。
- **i18n 花括号转义**：词条值中若需要字面 `{location}` 这类占位（非 `{0}` 数字参数），必须写成 `'{'location'}'`（MessageFormat 单引号转义），否则会抛错导致全站白屏。

## 提 PR 流程

常规协作流程：**Fork → 建分支 → 改代码 → 本地自检 → 提交 → 提 PR**。

### 1. Fork 并创建分支

```bash
git checkout -b feat/xxx   # 新功能用 feat/ 前缀
git checkout -b fix/xxx    # 修复用 fix/ 前缀
```

### 2. 本地自检（提交前必做）

PR 不会自动触发 CI，请在本地验证：

```bash
pnpm astro check   # 确认 0 error
pnpm build:only    # 确认构建通过
pnpm format        # 统一代码风格
```

想在本机 Halo 里看实际效果：`pnpm build` 后在后台「主题 → 安装」上传 `dist/*.zip`，或直接加载 `templates/` 目录。

### 3. 提交信息规范

格式：`<type>: <中文描述> (#N)`

- `feat` — 新功能
- `fix` — 修复
- `chore` — 构建、版本等杂项
- 关联的 issue 编号写在括号里，多个用空格分隔（如 `(#17 #19)`）
- 复杂改动可在提交信息正文用 `-` 逐项列出

> 仓库配置了 husky + lint-staged，提交时会自动用 prettier 格式化暂存文件；若格式化产生了改动，请重新 `git add` 后再提交。提交涉及 README.md 时还会自动重新生成本地 README-Halo.md（生成产物，不进提交）。

示例：

```
feat: 新增前台语言切换面板并补齐全站 i18n
fix: 修复文章分享海报保存无反应与公告小组件 PC 端无法关闭 (#21 #22)
```

### 4. PR 描述模板

提 PR 时建议按以下结构描述，方便 reviewer 快速理解：

```markdown
## 改动内容

（这次改了什么，一句话或列表说明）

## 为什么需要

（修复的问题 / 需求背景）

## 验证方式

（本地跑过哪些命令，如何验证效果）

## 是否涉及主题设置 / 访客开关

（改动了 settings.yaml / 新增了访客开关？是的话写明）
```

## 其他

- **报 Bug / 提建议**：请使用 [Issue 模板](https://github.com/AloneNanNan/halo-theme-ethereal/issues/new/choose)，选择合适的模板填写。
- **使用疑问**：可在 [QQ 交流群](https://qm.qq.com/q/onMpJjYvgQ) 讨论。
- **许可证**：本项目基于 [MIT License](./LICENSE)，基于 [halo-theme-fuwari](https://github.com/jiewenhuang/halo-theme-fuwari)（MIT 许可）二次开发，贡献即代表同意代码以 MIT 协议开源。
