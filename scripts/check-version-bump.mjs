// @ts-check
// 检测 theme.yaml 的 version 是否较上一版本增大且 semver 合规。
// 供 CI 使用（.github/workflows/ci-on-version-bump.yaml，自动触发默认注释），
// 可独立运行：
//   node scripts/check-version-bump.mjs          # 基线 = HEAD~1 提交中的 theme.yaml
//   node scripts/check-version-bump.mjs 1.0.6    # 指定基线
// 退出码：0 = 应触发构建（版本增大且合规）；1 = 不触发。
// stdout 输出 JSON：{ current, baseline, valid, trigger }
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const VERSION_RE = /^[ \t]*version:\s*["']?([^"'\r\n]+)["']?/m;

/** @param {string} content */
function readVersion(content) {
  return content.match(VERSION_RE)?.[1]?.trim() ?? null;
}

function readCurrentVersion() {
  const content = readFileSync(
    new URL("../theme.yaml", import.meta.url),
    "utf8",
  );
  return readVersion(content);
}

// 基线：显式参数优先；否则取 HEAD~1 提交中的 theme.yaml（首次提交时无历史 → null）
/** @param {string | undefined} explicit */
function readBaselineVersion(explicit) {
  if (explicit) return explicit;
  try {
    const content = execFileSync("git", ["show", "HEAD~1:theme.yaml"], {
      encoding: "utf8",
    });
    return readVersion(content);
  } catch {
    return null;
  }
}

// semver 解析（x.y.z，允许 -预发布 后缀），非法返回 null
/** @param {unknown} raw */
function parseVersion(raw) {
  const m = String(raw).match(/^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/);
  if (!m) return null;
  if ([m[1], m[2], m[3]].some((part) => part.length > 1 && part.startsWith("0"))) {
    return null;
  }
  if (
    m[4]?.split(".").some(
      (part) => /^\d+$/.test(part) && part.length > 1 && part.startsWith("0"),
    )
  ) {
    return null;
  }
  return { major: +m[1], minor: +m[2], patch: +m[3], pre: m[4] ?? "" };
}

// a > b → 1；a == b → 0；a < b → -1
/**
 * @param {{ major: number; minor: number; patch: number; pre: string }} a
 * @param {{ major: number; minor: number; patch: number; pre: string }} b
 */
function compareVersions(a, b) {
  if (a.major !== b.major) return a.major > b.major ? 1 : -1;
  if (a.minor !== b.minor) return a.minor > b.minor ? 1 : -1;
  if (a.patch !== b.patch) return a.patch > b.patch ? 1 : -1;
  if (a.pre === b.pre) return 0;
  if (!a.pre) return 1; // 正式版大于预发布
  if (!b.pre) return -1;
  const aParts = a.pre.split(".");
  const bParts = b.pre.split(".");
  const length = Math.max(aParts.length, bParts.length);
  for (let index = 0; index < length; index++) {
    if (index >= aParts.length) return -1;
    if (index >= bParts.length) return 1;
    const aPart = aParts[index];
    const bPart = bParts[index];
    if (aPart === bPart) continue;
    const aNumeric = /^\d+$/.test(aPart);
    const bNumeric = /^\d+$/.test(bPart);
    if (aNumeric && bNumeric) {
      const aNumber = BigInt(aPart);
      const bNumber = BigInt(bPart);
      return aNumber > bNumber ? 1 : -1;
    }
    if (aNumeric !== bNumeric) return aNumeric ? -1 : 1;
    return aPart > bPart ? 1 : -1;
  }
  return 0;
}

const current = readCurrentVersion();
const baseline = readBaselineVersion(process.argv[2]);
const cur = current ? parseVersion(current) : null;
const base = baseline ? parseVersion(baseline) : null;

// 触发条件：当前版本合法，且（无历史基线 或 基线合法且当前 > 基线）
const trigger = Boolean(
  cur &&
  (baseline === null || (base !== null && compareVersions(cur, base) > 0)),
);

console.log(
  JSON.stringify({ current, baseline, valid: Boolean(cur), trigger }, null, 2),
);
process.exit(trigger ? 0 : 1);
