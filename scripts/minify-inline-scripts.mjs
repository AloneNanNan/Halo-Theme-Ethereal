// @ts-check
// 构建后处理：压缩产物 HTML 里的内联脚本。is:inline 脚本不进 Astro/Vite 打包，注释与缩进
// 原样下发（首页内联脚本约 135 KB），这里用 esbuild 就地压缩。
// 只处理能判定安全的块：带 th:* / data-th-* 属性（th:inline="none" 除外）或块内出现 Thymeleaf
// 内联语法的一律跳过——压缩会删注释、重排表达式，服务端渲染会直接抛异常。
// 以 Astro integration 挂载到 astro:build:done（见 astro.config.mjs），
// 也可独立运行：node scripts/minify-inline-scripts.mjs [dir]（默认 ./templates）
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { transform } from "esbuild";

// 开始 / 结束标签都用 [^>]* 匹配：兼容 `</script >`、`</script data-x>` 等写法，替换时原样保留。
// 注意属性值里的 `>`（如 th:if="${a > b}"）会让 `[^>]*` 提前截断，这类标签会匹配错位；
// 当前产物中没有，新增带 `>` 的脚本标签时需改为更严格的属性解析。
const SCRIPT = /<script([^>]*)>([\s\S]*?)<\/script([^>]*)>/gi;

// 低于该长度的脚本压缩收益可忽略（按字符计，中文注释占比高时字符数远小于字节数）
const MIN_BYTES = 400;

// Thymeleaf 内联语法：/*[[${…}]]*/ 值内联、/*[# th:…]*/ 块内联、/*[(${…})]*/ 转义内联
const THYMELEAF_INLINE = /\/\*\[[\[(#/]|\[\(\$\{/;

/**
 * 判断某个 <script> 块能否安全压缩。
 * 属性里出现会触发 Thymeleaf 解析的 th:* / data-th-*，或块内出现内联语法，都不能压。
 * @param {string} attrs 开始标签的属性串（含前导空白）
 * @param {string} body 标签之间的脚本正文
 */
function isCompressible(attrs, body) {
  if (/\bsrc\s*=/i.test(attrs)) return false; // 外链脚本没有内联体积
  if (
    /\btype\s*=/i.test(attrs) &&
    !/\btype\s*=\s*["']text\/javascript["']/i.test(attrs)
  ) {
    return false; // module / application/json / importmap 等一律跳过
  }
  // data-th-* 是 Thymeleaf 5 的替代写法，与 th:* 同样会把脚本交给服务端解析
  if (/\bdata-th-[a-z-]+/i.test(attrs)) return false;
  // 属性名与 none 都按大小写敏感处理（Thymeleaf 只认小写 th:inline="none"），
  // 大写写法不生效、脚本仍会按默认 javascript 内联解析，交给下面的内联语法检测兜底
  const thAttrs = attrs.match(/\bth:[a-z-]+/g) ?? [];
  const hasParsedTh = thAttrs.some(
    (name) => !new RegExp(`${name}\\s*=\\s*["']none["']`).test(attrs),
  );
  if (hasParsedTh) return false;
  if (THYMELEAF_INLINE.test(body)) return false;
  return body.length >= MIN_BYTES;
}

/**
 * 压缩单个 HTML 字符串里的全部可压内联脚本。
 * @param {string} html
 * @returns {Promise<{ html: string; count: number; saved: number }>}
 */
async function minifyHtml(html) {
  const matches = [...html.matchAll(SCRIPT)];
  if (matches.length === 0) return { html, count: 0, saved: 0 };
  let out = "";
  let cursor = 0;
  let count = 0;
  let saved = 0;
  for (const match of matches) {
    const [full, attrs, body, closeAttrs] = match;
    const start = match.index ?? 0;
    out += html.slice(cursor, start);
    cursor = start + full.length;
    if (isCompressible(attrs, body)) {
      try {
        const result = await transform(body, {
          minify: true,
          target: ["es2015"],
          legalComments: "none",
          // 默认 ascii 会把中文转义成 \uXXXX（3 字节变 6 字节），
          // 页面本身是 UTF-8，保留原字符体积更小
          charset: "utf8",
        });
        out += `<script${attrs}>${result.code}</script${closeAttrs}>`;
        count++;
        saved += Buffer.byteLength(body) - Buffer.byteLength(result.code);
        continue;
      } catch {
        // 语法不可解析（模板片段、HTML 实体等）→ 原样保留，不中断构建
      }
    }
    out += full;
  }
  out += html.slice(cursor);
  return { html: out, count, saved };
}

/**
 * @param {string} dirPath
 * @returns {Promise<{ files: number; count: number; saved: number }>}
 */
async function minifyDir(dirPath) {
  let files = 0;
  let count = 0;
  let saved = 0;
  let entries;
  try {
    entries = await readdir(dirPath, { withFileTypes: true });
  } catch {
    console.warn(`[minify-inline] 目录不存在，跳过：${dirPath}`);
    return { files, count, saved };
  }
  for (const entry of entries) {
    const file = join(dirPath, entry.name);
    if (entry.isDirectory()) {
      const sub = await minifyDir(file);
      files += sub.files;
      count += sub.count;
      saved += sub.saved;
      continue;
    }
    if (!entry.name.endsWith(".html")) continue;
    const html = await readFile(file, "utf8");
    const result = await minifyHtml(html);
    if (result.html !== html) {
      await writeFile(file, result.html);
      files++;
      count += result.count;
      saved += result.saved;
    }
  }
  return { files, count, saved };
}

/** @param {string} dirPath */
export async function minifyInlineScriptsInDir(dirPath) {
  const { files, count, saved } = await minifyDir(dirPath);
  console.log(
    `[minify-inline] 压缩 ${count} 段内联脚本，省下 ${(saved / 1024).toFixed(1)} KB（${files} 个 HTML）`,
  );
  return { files, count, saved };
}

// 独立运行入口：node scripts/minify-inline-scripts.mjs [dir]
if (
  process.argv[1] &&
  resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1])
) {
  const dir = process.argv[2] ?? "templates";
  minifyInlineScriptsInDir(dir).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
