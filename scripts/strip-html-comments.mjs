// @ts-check
// 构建后处理：剥离产物 HTML（templates/**/*.html）中的 <!-- --> 注释。
// 保护 <script>/<style> 块内部——其中含有 Thymeleaf th:inline="javascript"
// 的内联表达式语法 /*[[${...}]]*/，是功能性代码，绝不能删。
// 以 Astro integration 挂载到 astro:build:done（见 astro.config.mjs），
// 也可独立运行：node scripts/strip-html-comments.mjs [dir]（默认 ./templates）
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// 保护块：script/style 内部（Thymeleaf 内联语法、字符串字面量中的 `<!--` 均在其中）
// 结束标签用 [^>]*> 宽松匹配：兼容 `</script >`、`</script data-x>` 等带空白/属性的写法
const PROTECTED =
  /(<script\b[\s\S]*?<\/script[^>]*>|<style\b[\s\S]*?<\/style[^>]*>)/gi;
// 跨行非贪婪匹配 HTML 注释；未闭合（无 --> 配对）时匹配到段尾一并清除，避免残留破坏结构
const COMMENT = /<!--[\s\S]*?(?:-->|$)/g;

/** @param {string} dirPath */
export async function stripHtmlCommentsInDir(dirPath) {
  let files = 0;
  let comments = 0;
  let entries;
  try {
    entries = await readdir(dirPath);
  } catch {
    console.warn(`[strip-comments] 目录不存在，跳过：${dirPath}`);
    return { files: 0, comments: 0 };
  }
  for (const name of entries) {
    if (!name.endsWith(".html")) continue;
    const file = join(dirPath, name);
    let html = await readFile(file, "utf8");
    const parts = html.split(PROTECTED);
    let removed = 0;
    const stripped = parts
      .map((seg, i) => {
        if (i % 2 === 1) return seg; // 保护块原样保留
        const matched = seg.match(COMMENT);
        if (matched) removed += matched.length;
        return seg.replace(COMMENT, "");
      })
      .join("");
    if (stripped !== html) {
      await writeFile(file, stripped);
      files++;
      comments += removed;
    }
  }
  console.log(`[strip-comments] 剥离 ${comments} 条注释（${files} 个 HTML）`);
  return { files, comments };
}

// 独立运行入口：node scripts/strip-html-comments.mjs [dir]
if (
  process.argv[1] &&
  resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1])
) {
  const dir = process.argv[2] ?? "templates";
  stripHtmlCommentsInDir(dir).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
