# GitHub Actions 工作流说明

## 总览

| 工作流 | 触发方式 | 用途 |
| ------------------------- | ------------------------------------ | ----------------------------------------------------------------------------- |
| `ci.yaml`                 | push 到 main（版本增大合规时）/ 手动 | 构建 + 质量门 + 上传 artifact；自动或手动发布到 GitHub Release |
| `cd.yaml`                 | Release 发布（tag 以 v 开头） / 手动 | 将 Release 中的主题包同步到 Halo 应用市场 |

公共组件：

| 组件 | 用途 |
| ------------------------- | ----------------------------------------------------------------------------- |
| `.github/actions/quality-gate` | 独立的产物质量门 composite action（zip 存在、HTML 注释已剥离、Thymeleaf 内联表达式完好），供 `ci.yaml` 调用 |

## ci.yaml — 构建与发布（自动 + 手动双触发）

**触发方式**：
- **push 到 `main`**：`scripts/check-version-bump.mjs` 读取当前 `theme.yaml` 的 `version`，与上一提交（HEAD~1）对比，版本增大且 semver 格式合法时自动执行完整发布流程
- **手动（workflow_dispatch）**：直接构建；输入 `tag` 参数时发布到指定 Release（兜底场景）

**输入参数（手动触发）**

| 参数 | 必填 | 说明 |
| ----- | ---- | -------------------------------------------------------------- |
| `tag` | 否   | 构建完成后将 zip 发布到该 Release tag；留空则仅保存为 artifact |

**自动发布流程（push 触发）**：
1. 构建 + 类型检查 + 质量门校验
2. 上传 artifact 留档
3. 按 `theme.yaml` 的 version **自动创建 tag**（如 `v1.0.8`；远程已存在则跳过，幂等）
4. 上传 zip 到 GitHub Release（不存在则自动创建，`release.md` 存在时作为说明；已存在则更新资产）

**手动发布流程（workflow_dispatch）**：tag 输入前置校验（`v*` 前缀、与 `theme.yaml` 的 `version` 一致）→ 构建 + 质量门 → 上传/更新 Release。

**release.md 约定**：仓库根目录的 `release.md` 自动作为 Release 说明（body）。Release 已存在时更新说明，不存在时自动创建。

**其他**：该工作流默认被 `concurrency` 串行化，同一分支的连续触发排队执行，不会并发。

## cd.yaml — 同步 Halo 应用市场

- **Release 发布触发**：tag 以 `v` 开头（如 `v1.0.4`）时自动同步
- **手动触发**：输入 `tag` 参数，前置校验（v 前缀、Release 存在性）、下载附件后校验 zip 存在（缺失时列出实际附件）

**所需 Secrets**：`APP_ID`（应用市场应用 ID）、`HALO_PAT`（Halo 应用市场个人访问令牌）。

## 触发路径与行为一览

### ci.yaml — CI (Build & Release)

| # | 触发路径 | 前置条件 | version-check | 构建链 | 质量门 | 自动创建 tag | 上传 Release | 结果 |
|---|---|---|---|---|---|---|---|---|
| 1a | push 到 main | 版本较上一提交**增大**且 semver 合规 | 运行 → `true` | ✅ | ✅ | ✅ 创建 `vX.Y.Z`（远程已有则跳过） | ✅ 创建或更新 | **自动发布** |
| 1b | push 到 main | 版本**未增大**或不合规 | 运行 → `false` | ❌ 跳过 | ❌ | ❌ | ❌ | 仅检测，不构建 |
| 2 | 手动 + 填 tag | tag 以 `v` 开头，且 = `v{theme.yaml 版本}` | 跳过 | ✅ | ✅ | ❌ 仅 push 运行 | ✅ 校验通过后创建/更新 | 发布到指定 tag |
| 3 | 手动 + tag 留空 | — | 跳过 | ✅ | ✅ | ❌ | ❌ | 仅构建 + artifact |

**各触发路径的关键差异**：

- **version-check job**：只在 push 事件运行（`if: github.event_name == 'push'`）；手动触发直接进入构建
- **自动创建 tag 步骤**：只在 push 路径运行，按 `theme.yaml` 的 version 生成 tag；已存在则幂等跳过
- **校验 tag 步骤**：只在手动 + 填 tag 时运行（`v` 前缀 + 与 `theme.yaml` version 一致性双重校验）
- **上传 Release 步骤**：push 路径用自动生成的 tag；手动路径用输入的 tag
- 构建链统一为：install → `pnpm check` → `pnpm build` → quality-gate → artifact

### cd.yaml — CD（同步应用市场）

| # | 触发路径 | 前置条件 | 校验 | 行为 | 结果 |
|---|---|---|---|---|---|
| 1 | Release published | tag 以 `v` 开头 | 附件 zip 存在 | 下载 → 校验 → 同步应用市场 | ✅ 自动同步 |
| 2 | Release published | tag 不以 `v` 开头 | — | job 被 `if` 跳过 | ❌ 静默跳过 |
| 3 | 手动 + tag（必填） | tag 以 `v` 开头 + Release 已存在 | 附件 zip 存在 | 校验 → 解析 ID → 下载 → 同步 | ✅ 手动重新同步 |

**要点**：job 顶层的 `if` 同时作用于两个事件——release 事件要求 tag 以 `v` 开头，`workflow_dispatch` 事件直接放行；手动路径额外做 v 前缀校验和 Release 存在性校验。

### 跨工作流串联与边界情况

```
push(main) 版本增大 ─┐
                     ├─► ci.yaml 构建+质量门 ──► 自动建 tag vX.Y.Z ──► Release 发布
手动 ci.yaml 输入 tag ┘                                       │
                                                              ▼
                                          cd.yaml 自动同步到 Halo 应用市场
```

- **并发**：两个 workflow 均配置 `concurrency` 串行化（ci 按 `github.ref`，cd 按 `release.id/tag`），重复触发排队执行，不并发竞争 Release 资产
- **权限**：ci build job `contents: write`（建 tag/Release 需要）；cd job `contents: read`
- **幂等**：tag 已存在跳过创建；Release 已存在用 `--clobber` 更新资产；cd 重复同步排队串行执行
- **失败即停**：构建、类型检查、质量门、tag 校验任一失败，后续发布步骤不执行，不会发出错误的 Release

## 发布流程速查

**自动发布（推荐）**：
1. 更新 `theme.yaml` 的 `version`（版本唯一来源），编写根目录 `release.md`（Release 说明）
2. 推送到 main → `ci.yaml` 检测版本增大后自动：构建 → 创建 tag（`vX.Y.Z`）→ 发布 GitHub Release
3. Release 发布后 `cd.yaml` 自动同步到 Halo 应用市场

**手动兜底**：手动触发 `ci.yaml` 输入 tag（如 `v1.0.8`）→ 构建 + 创建/更新 Release；手动触发 `cd.yaml` 输入 tag 可重新同步应用市场
