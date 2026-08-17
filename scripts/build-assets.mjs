// @ts-check
// 构建期脚本资产管线：
//  1. compileAssets()：把 src/scripts/assets/*.ts 编译为 IIFE 经典脚本输出到 public/assets/
//     （保持经典脚本形态：SwupScriptsPlugin 换页重执行 + window 守卫的架构依赖它）
//  2. copyVendorAssets()：把 src/scripts/vendor/*.js 原样拷贝到 public/assets/
//     （第三方 vendored 资产，如 qrcode.bundle.js UMD，不经过 esbuild 编译）
//  3. compressAssetsInDir(dir, names)：对 outDir/assets/ 下指定的 *.js 做 esbuild 压缩
//     （只压缩 public/ 拷贝进来的经典脚本，跳过 Astro/Vite 的 hashed module 产物）
// 以 Astro integration 挂载：build:start 编译+拷贝（先于 public/ 拷贝）、build:done 压缩。
// 亦可独立运行：node scripts/build-assets.mjs [publicDir] [--watch]
import { build, transform } from "esbuild";
import { readdir, readFile, writeFile, copyFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_PUBLIC_DIR = new URL("../public/assets/", import.meta.url);
const SRC_DIR = new URL("../src/scripts/assets/", import.meta.url);
const VENDOR_DIR = new URL("../src/scripts/vendor/", import.meta.url);

/**
 * 编译 src/scripts/assets/ 下全部入口到 public/assets/
 * @param {URL} publicDir
 * @returns {Promise<string[]>} 编译输出的文件名列表
 */
export async function compileAssets(publicDir = DEFAULT_PUBLIC_DIR) {
  const srcDir = fileURLToPath(SRC_DIR);
  const outDir = fileURLToPath(publicDir);
  const entries = (await readdir(srcDir)).filter(
    // _ 前缀为被 import 的共享模块，非独立入口（如 _theme-config.ts）
    (f) => !f.startsWith("_") && (f.endsWith(".ts") || f.endsWith(".js")),
  );
  if (entries.length === 0) {
    console.log("[build-assets] 无编译入口，跳过");
    return [];
  }
  await build({
    entryPoints: entries.map((f) => join(srcDir, f)),
    outdir: outDir,
    bundle: true,
    format: "iife",
    platform: "browser",
    target: ["es2015"],
    minify: true,
    logLevel: "warning",
  });
  const out = entries.map((f) => f.replace(/\.(ts|js)$/, ".js"));
  console.log(
    `[build-assets] 编译 ${entries.length} 个入口 → public/assets/（${out.join(", ")}）`,
  );
  return out;
}

/**
 * 拷贝 src/scripts/vendor/ 下的 vendored 资产到 public/assets/（原样，不编译）
 * @param {URL} publicDir
 */
export async function copyVendorAssets(publicDir = DEFAULT_PUBLIC_DIR) {
  const vendorDir = fileURLToPath(VENDOR_DIR);
  const outDir = fileURLToPath(publicDir);
  const files = (await readdir(vendorDir)).filter((f) => f.endsWith(".js"));
  for (const name of files) {
    await copyFile(join(vendorDir, name), join(outDir, name));
  }
  if (files.length > 0) {
    console.log(
      `[build-assets] 拷贝 ${files.length} 个 vendored 资产 → public/assets/（${files.join(", ")}）`,
    );
  }
  return files;
}

/**
 * 压缩 outDir/assets/ 下指定名称的经典脚本（仅 public/ 拷贝产物）
 * @param {string} assetsDir outDir 下的 assets 目录绝对路径
 * @param {string[]} names 白名单文件名（build:start 时从 public/assets 采集）
 */
export async function compressAssetsInDir(assetsDir, names) {
  if (names.length === 0) return { files: 0, before: 0, after: 0 };
  let files = 0;
  let before = 0;
  let after = 0;
  for (const name of names) {
    const file = join(assetsDir, name);
    let code;
    try {
      code = await readFile(file, "utf8");
    } catch {
      continue; // 未拷贝（理论上不会发生）
    }
    // 跳过已经压缩过的产物（minify 幂等，但省时且避免二次改写）
    if (code.startsWith("/*__ETHEMEAL_MINIFIED__*/")) continue;
    const result = await transform(code, {
      minify: true,
      target: ["es2015"],
      legalComments: "none",
    });
    const header =
      "/*__ETHEMEAL_MINIFIED__*/\n/* 本文件为构建产物，源码见 src/scripts/assets/ 或 public/assets/ */\n";
    before += Buffer.byteLength(code);
    after += Buffer.byteLength(header + result.code);
    await writeFile(file, header + result.code);
    files++;
  }
  console.log(
    `[build-assets] 压缩 ${files} 个经典脚本：${(before / 1024).toFixed(1)}K → ${(after / 1024).toFixed(1)}K`,
  );
  return { files, before, after };
}

// 独立运行入口：node scripts/build-assets.mjs [publicDir]
if (
  process.argv[1] &&
  resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1])
) {
  const dir = process.argv[2]
    ? new URL(process.argv[2], import.meta.url)
    : DEFAULT_PUBLIC_DIR;
  compileAssets(dir)
    .then(() => copyVendorAssets(dir))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
