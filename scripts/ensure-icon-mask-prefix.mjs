// @ts-check
// 构建后处理（issue #83）：兜底补回 iconify mask 图标规则被 CSS 工具链裁掉的 -webkit- 前缀。
//
// 背景：主题的 icon-[...] 图标是 CSS 遮罩图标（background-color: currentColor +
// mask-image: var(--svg)），遮罩 SVG 的固有尺寸是 24×24，靠 mask-size:100% 100% 缩进
// 1em 的方框里。Chromium < 120（OPPO/一加自带 HeyTap 浏览器 115、老微信内置内核等）
// 只认 -webkit-mask-image/-size/-repeat，不认无前缀的 mask-*：
// 一旦产物里缺这几条 -webkit- 声明，这些内核就按遮罩固有尺寸左上角贴合绘制（并允许平铺），
// 被方框裁掉右下角 —— 表现为图标显示不全（字形贴边的图标尤其明显）。
//
// 这些前缀是否被保留，由构建链按「目标浏览器」决定，且随构建环境漂移（同一份源码、
// 不同机器/流水线可能一个有一个没有；官方 CI 产物 1.1.0–1.2.4 就是缺的），因此不能依赖
// 工具链行为：这里直接对产物做兜底补齐，并把补齐结果写进构建日志（补回即说明工具链又裁了）。
//
// 以 Astro integration 挂载到 astro:build:done（见 astro.config.mjs），
// 也可独立运行：node scripts/ensure-icon-mask-prefix.mjs [outDir]（默认 ./templates）
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// 只有 iconify mask 图标规则含此标记（主题自身的渐变遮罩、提示框图标不含 --svg）。
// 冒号/括号后允许空白：产物 CSS 已压缩（`--svg:url(`），但内联进 HTML 的样式可能是美化过的（`--svg: url(`）
const ICON_MARKER = /--svg:\s*url\(\s*["']?data:image\/svg\+xml/;
// 匹配「选择器 { 含标记的声明块 }」：@media/@layer 等外层花括号含 `{`，故 [^{}] 不会跨层匹配，
// 只会命中最内层那条图标规则；声明块内的换行由 [^{}] 正常匹配（兼容美化的内联样式）
const ICON_RULE =
  /([^{}]+)\{([^{}]*--svg:\s*url\(\s*["']?data:image\/svg\+xml[^{}]*)\}/g;
/** 必须具备的 -webkit- 前缀声明（值即 iconify 插件本意，缺失时按此补齐） */
const REQUIRED = [
  ["-webkit-mask-image", "var(--svg)"],
  ["-webkit-mask-size", "100% 100%"],
  ["-webkit-mask-repeat", "no-repeat"],
];

/**
 * 给一段 CSS（或内嵌了 <style> 的 HTML）里的 iconify 图标规则补齐缺失的 -webkit- 声明
 * @param {string} content
 * @returns {{ content: string, rules: number, patched: number, added: string[] }}
 */
function patchMaskPrefixes(content) {
  let rules = 0;
  let patched = 0;
  const added = new Set();
  const out = content.replace(ICON_RULE, (match, selector, body) => {
    rules++;
    const missing = REQUIRED.filter(([prop]) => !body.includes(prop + ":"));
    if (missing.length === 0) return match;
    // 压缩产物的末位声明一般不带分号（如 `…mask-repeat:no-repeat}`），直接拼接会把值
    // 粘成 `no-repeat-webkit-mask-size:100% 100%`：整条声明非法 → 前缀等于没补上。
    // 故先补一个声明分隔符，再把缺的声明接在后面。
    const separator = /[;{]\s*$/.test(body) ? "" : ";";
    const additions = missing
      .map(([prop, value]) => `${prop}:${value};`)
      .join("");
    const nextBody = `${body}${separator}${additions}`;
    // 断言：新增声明必须落在声明边界上。若拼接方式出问题（历史上曾出现缺分隔符导致
    // 静默产出非法 CSS、日志却显示"已补回"），这里直接抛错中断构建，而不是放过。
    for (const [prop] of missing) {
      if (!new RegExp(`(?:^|[;{])\\s*${prop}:`).test(nextBody)) {
        throw new Error(
          `[icon-mask-prefix] 补丁插入点非法（选择器：${selector.trim()}）`,
        );
      }
      added.add(prop);
    }
    patched++;
    return `${selector}{${nextBody}}`;
  });
  return { content: out, rules, patched, added: [...added] };
}

/**
 * 扫描 outDir 下的 assets/*.css 与页面 *.html，补齐 iconify 图标遮罩的 -webkit- 前缀
 * @param {string} outDir 构建输出根目录（astro outDir，即 templates/）
 * @param {string} [assetsName] 输出目录下的静态资源子目录名（与 astro.config 的 build.assets 一致）
 * @returns {Promise<{files: number, rules: number, patched: number}>}
 */
export async function ensureIconMaskPrefixInDir(outDir, assetsName = "assets") {
  const result = { files: 0, rules: 0, patched: 0 };
  const patchedFiles = [];
  const addedProps = new Set();

  /** @type {{ dir: string, ext: string, label: string }[]} */
  const targets = [
    { dir: join(outDir, assetsName), ext: ".css", label: "CSS" },
    // HTML 分支是防御性兜底：Astro 的 inlineStylesheets 变化时图标规则可能被内联进页面
    { dir: outDir, ext: ".html", label: "HTML" },
  ];

  for (const { dir, ext, label } of targets) {
    let entries;
    try {
      entries = await readdir(dir);
    } catch {
      continue; // 目录不存在（如无 HTML 的独立运行场景）跳过
    }
    for (const name of entries) {
      if (!name.endsWith(ext)) continue;
      const file = join(dir, name);
      const content = await readFile(file, "utf8");
      // 快速跳过不含图标规则的产物（绝大多数文件）
      if (!ICON_MARKER.test(content)) continue;
      const {
        content: fixed,
        rules,
        patched,
        added,
      } = patchMaskPrefixes(content);
      result.rules += rules;
      if (patched === 0) continue;
      result.patched += patched;
      result.files++;
      for (const prop of added) addedProps.add(prop);
      patchedFiles.push(`${label} ${name}（${patched} 条）`);
      await writeFile(file, fixed);
    }
  }

  if (result.rules === 0) {
    console.log("[icon-mask-prefix] 未发现 iconify 图标遮罩规则，跳过");
    return result;
  }
  if (result.patched > 0) {
    console.warn(
      `[icon-mask-prefix] ⚠️ 产物缺少 ${[...addedProps].join(" / ")}，已兜底补回 ${result.patched} 条规则：` +
        `${patchedFiles.join("、")}\n` +
        "[icon-mask-prefix]    说明本次构建链裁掉了前缀（Chromium<120 会据此裁切图标），产物已修正；" +
        "若持续出现请检查 Tailwind/Lightning CSS 目标浏览器设置。",
    );
  } else {
    console.log(
      `[icon-mask-prefix] 图标遮罩 -webkit- 前缀齐全（${result.rules} 条规则）`,
    );
  }
  return result;
}

// 独立运行入口：node scripts/ensure-icon-mask-prefix.mjs [outDir]
if (
  process.argv[1] &&
  resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1])
) {
  const outDir = process.argv[2] ?? "templates";
  ensureIconMaskPrefixInDir(outDir).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
