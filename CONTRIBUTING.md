# 贡献指南

感谢你愿意为 **Ethereal** 贡献代码！本仓库是 Halo 主题，构建链路与普通前端项目略有不同。

**两份文档的分工**：本文件写**协作流程**（环境准备、自检、提 PR）；代码库知识——构建细节、目录约定、Halo/Thymeleaf 约定、常见坑——统一维护在根目录 [`AGENTS.md`](./AGENTS.md)，**改代码前请先读对应章节**。

> 面向 AI 协作者：请先读 AGENTS.md 的「硬规则」；AI 不得私自 `commit` / `push`。

## 快速开始

需要 **Node.js >= 22.12.0**（推荐 24.x，见 `.nvmrc`）与 **pnpm**。

```bash
# 克隆项目（Fork 后请 clone 你自己的仓库）
git clone https://github.com/AloneNanNan/halo-theme-ethereal.git
cd halo-theme-ethereal

# 安装依赖
pnpm install
```

常用命令：

| 命令               | 作用                                      |
| ------------------ | ----------------------------------------- |
| `pnpm dev`         | 开发模式，监听 `src/` 变更自动重建        |
| `pnpm build:only`  | 仅执行 `astro build`，输出到 `templates/` |
| `pnpm build`       | 完整构建 + 打包发布 zip（输出到 `dist/`） |
| `pnpm astro check` | 类型检查，提交前务必确认 0 error          |
| `pnpm format`      | prettier 格式化全项目                     |

> 产物说明：`templates/`、`dist/`、`public/assets/`、`README-Halo.md` 都是构建 / 生成产物，勿手改——要改就改 `src/`（或 README.md）后重新构建；脚本管线与 README-Halo 转换的细节见 AGENTS.md 的「构建产物与脚本管线」。

## 提交前自检

PR 不会自动触发 CI，请在本地验证：

```bash
pnpm astro check   # 确认 0 error
pnpm build:only    # 确认构建通过
pnpm format        # 统一代码风格
```

想在本机 Halo 里看实际效果：`pnpm build` 后在后台「主题 → 安装」上传 `dist/*.zip`，或直接加载 `templates/` 目录。

## 提 PR 流程

常规协作流程：**Fork → 建分支 → 改代码 → 本地自检 → 提交 → 提 PR**。

### 1. 建分支

```bash
git checkout -b feat/xxx   # 新功能用 feat/ 前缀
git checkout -b fix/xxx    # 修复用 fix/ 前缀
```

### 2. 提交信息规范

格式：`<type>: <中文描述> (#N)`

- `feat` — 新功能；`fix` — 修复；`chore` — 构建、版本等杂项
- 关联的 issue 编号写在括号里，多个用空格分隔（如 `(#17 #19)`）
- 复杂改动可在正文用 `-` 逐项列出；只写该提交的交付差异，不写「发现问题 → 修复」的开发过程

示例：

```
feat: 新增前台语言切换面板并补齐全站 i18n
fix: 修复文章分享海报保存无反应与公告小组件 PC 端无法关闭 (#21 #22)
```

> 完整规则（含 AI 侧约束）见 AGENTS.md 的「提交规范」。仓库配置了 husky + lint-staged：提交时自动用 prettier 格式化暂存文件，若产生改动请重新 `git add` 后再提交；提交涉及 README.md 时还会自动重新生成本地 README-Halo.md（生成产物，不进提交）。

### 3. PR 描述模板

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

- **硬性规定**：不得修改 `theme.yaml` 的 `version`（发布流程唯一来源）；不得直接改构建产物。原因与相关同步点见 AGENTS.md 的「硬规则」。
- **报 Bug / 提建议**：请使用 [Issue 模板](https://github.com/AloneNanNan/halo-theme-ethereal/issues/new/choose)，选择合适的模板填写。
- **使用疑问**：可在 [QQ 交流群](https://qm.qq.com/q/onMpJjYvgQ) 讨论。
- **许可证**：本项目基于 [MIT License](./LICENSE)，基于 [halo-theme-fuwari](https://github.com/jiewenhuang/halo-theme-fuwari)（MIT 许可）二次开发，贡献即代表同意代码以 MIT 协议开源。
