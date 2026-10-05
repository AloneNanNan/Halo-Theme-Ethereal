// @ts-check
// 把 README.md（徽章用 <picture> 适配深浅色）转换为 Halo 应用市场可读的 README-Halo.md：
// halo.run 不识别 <picture>，降级为内部第一个 <img>（浅色徽章）。路径基于脚本自身位置
//（import.meta.url）解析，任意 CWD 可运行——按相对路径写会指向项目外。
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
