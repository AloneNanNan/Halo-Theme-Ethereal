// @ts-check
// 把根目录 README.md（GitHub 风格，徽章用 <picture> 适配深浅色）转换为 Halo
// 应用市场可读的 README-Halo.md：halo.run 的 Markdown 渲染器不识别 <picture>，
// 需将每个 <picture> 块降级为内部第一个 <img>（即浅色模式徽章）。
// 路径基于脚本自身位置解析（import.meta.url），任意 CWD 下均可运行——
// pnpm 脚本固定以包根为 CWD，若按相对路径写 ../README.md 会指向项目外。
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const SOURCE = new URL("../README.md", import.meta.url);
const TARGET = new URL("../README-Halo.md", import.meta.url);

try {
  const readme = await readFile(SOURCE, "utf8");

  // 匹配所有 <picture>...</picture> 块，提取内部第一个 <img> 标签进行替换；
  // 未找到 <img> 的异常块保留原样，避免静默丢内容
  const converted = readme.replace(
    /<picture\b[^>]*>([\s\S]*?)<\/picture>/gi,
    (match, content) => {
      const imgMatch = content.match(/<img\b[^>]*>/i);
      return imgMatch ? imgMatch[0] : match;
    },
  );

  await writeFile(TARGET, converted, "utf8");
  console.log(`✅ 已成功转换并写入 ${fileURLToPath(TARGET)}`);
} catch (err) {
  console.error("❌ 转换失败:", /** @type {Error} */ (err).message);
  process.exitCode = 1;
}
