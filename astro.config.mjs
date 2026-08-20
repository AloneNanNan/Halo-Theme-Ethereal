// @ts-check
import { defineConfig } from "astro/config";
import fs from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import swup from "@swup/astro";

import { stripHtmlCommentsInDir } from "./scripts/strip-html-comments.mjs";
import {
  compileAssets,
  copyVendorAssets,
  compressAssetsInDir,
} from "./scripts/build-assets.mjs";

import Icons from "unplugin-icons/vite";
import svelte from "@astrojs/svelte";
import icon from "astro-icon";

// 从 theme.yaml 读取主题版本号（Halo 主题版本的唯一来源），构建期注入全局
// ASSET_VERSION，用于静态资源缓存指纹（如 post.bundle.js?v=1.0.6）。
// 后续升级主题只需改 theme.yaml 一处，避免两处版本号失步导致缓存不失效。
const themeYaml = fs.readFileSync(
  new URL("./theme.yaml", import.meta.url),
  "utf8",
);
const themeVersion =
  (themeYaml.match(/^[ \t]*version:\s*["']?([^"'\r\n]+)["']?/m) ||
    [])[1]?.trim() || "0.0.0";

// 构建完成后剥离产物 HTML 中的 <!-- --> 开发注释
/** @type {import("astro").AstroIntegration} */
const stripHtmlComments = {
  name: "strip-html-comments",
  hooks: {
    "astro:build:done": async ({ dir }) => {
      await stripHtmlCommentsInDir(fileURLToPath(dir));
    },
  },
};

// 经典脚本资产管线：
//  - build:start：把 src/scripts/assets/*.ts 编译为 IIFE 经典脚本输出到 public/assets/
//    （须先于 Astro 拷贝 public/，见 scripts/build-assets.mjs），并采集 public/assets
//    全部 *.js 文件名作为 build:done 压缩白名单
//  - build:done：压缩 outDir/assets/ 下由 public/ 拷贝来的经典脚本
//    （只压缩白名单内的 public 产物，跳过 Astro/Vite 的 hashed module 产物）
/** @type {import("astro").AstroIntegration} */
const buildAssets = {
  name: "build-assets",
  hooks: {
    "astro:build:start": async () => {
      await compileAssets();
      await copyVendorAssets();
      const names = await fs.promises.readdir(
        join(fileURLToPath(new URL("./public/assets/", import.meta.url))),
      );
      publicAssetJs = names.filter((f) => f.endsWith(".js"));
    },
    "astro:build:done": async ({ dir }) => {
      await compressAssetsInDir(
        join(fileURLToPath(dir), "assets"),
        publicAssetJs,
      );
    },
  },
};

// build:start 时从 public/assets 采集的经典脚本文件名，供 build:done 压缩白名单使用
/** @type {string[]} */
let publicAssetJs = [];

export default defineConfig({
  base: "/themes/Ethereal",
  build: {
    assets: "assets",
    format: "file",
  },
  outDir: "./templates",
  integrations: [
    stripHtmlComments,
    buildAssets,
    swup({
      theme: false,
      animationClass: "transition-swup-", // see https://swup.js.org/options/#animationselector
      // the default value `transition-` cause transition delay
      // when the Tailwind class `transition-all` is used
      containers: [
        "#swup-container",
        "#toc-container",
        "#right-sidebar",
        "#toc-popup",
      ],
      // 跨页回顶滚动统一走浏览器原生平滑（behavior:"smooth"）：app.ts 在
      // content:scroll 接管并调用 window.scrollTo 原生平滑，插件的
      // betweenPages 平滑（scrl JS 引擎）被跳过，不再参与跨页滚动。
      // 保留 SwupScrollPlugin 是因为同页锚点（目录点击）的 samePageWithHash
      // 平滑仍依赖它——此处保持插件启用与 animateScroll 对象配置不变。
      // 注：@swup/astro 类型声明为 boolean，但运行时会透传给 SwupScrollPlugin
      // 选项对象（enabledPlugins 的 options === true ? {} : options 分支），
      // 故此处需绕过类型限制
      smoothScrolling: /** @type {any} */ ({
        animateScroll: {
          betweenPages: true,
          samePageWithHash: true,
          samePage: true,
        },
      }),
      cache: false, // 禁用缓存，避免友链页面内容不完整
      // I25：删除 preload——cache:false 下 @swup/astro 强制禁用 preload（死配置），
      // 保留会误导未来误启用（每 hover = 整页 HTML 拉取，成为带宽放大面）
      accessibility: true,
      updateHead: true,
      updateBodyClass: false,
      globalInstance: true,
      ignore: [
        // 认证 / 后台 / 用户中心等非主题页面：直接整页跳转，
        // 避免 Swup 先播放下场动画再跳转导致瞬间样式散架
        "/login",
        "/logout",
        "/register",
        "/console",
        "/uc",
        "/admin",
      ],
    }),
    icon({
      include: {
        "fa6-brands": ["creative-commons"],
        "fa6-regular": ["address-card"],
        "fa6-solid": [
          "arrow-up-right-from-square",
          "arrow-rotate-left",
          "chevron-right",
        ],
        mdi: [
          "text-box-outline",
          "comment-text-outline",
          "loading",
          "weather-sunny",
          "weather-cloudy",
          "weather-cloudy-alert",
          "weather-rainy",
          "weather-pouring",
          "weather-lightning-rainy",
          "weather-snowy",
          "weather-snowy-heavy",
          "weather-snowy-rainy",
          "weather-fog",
          "weather-dust",
          "weather-night",
          "weather-night-partly-cloudy",
          "map-marker",
          "cloud-off-outline",
          "key-variant",
          "playlist-music",
        ],
        "material-symbols": [
          "account-circle",
          "add-circle-outline-rounded",
          "arrow-back-rounded",
          "article-outline",
          "article-outline-rounded",
          "book-2-outline-rounded",
          "calendar-clock-outline",
          "calendar-today-outline-rounded",
          "chat-bubble-outline-rounded",
          "check-circle-rounded",
          "check-rounded",
          "checklist-rounded",
          "chevron-left-rounded",
          "chevron-right",
          "chevron-right-rounded",
          "close-rounded",
          "code-rounded",
          "content-copy-outline-rounded",
          "copyright-outline-rounded",
          "dark-mode-outline-rounded",
          "description-rounded",
          "edit-calendar-outline-rounded",
          "edit-rounded",
          "expand-more-rounded",
          "favorite-outline-rounded",
          "favorite-rounded",
          "folder-open-rounded",
          "folder-outline",
          "folder-outline-rounded",
          "history-rounded",
          "hourglass-top",
          "inbox-rounded",
          "info-outline-rounded",
          "inventory-2-rounded",
          "label-outline",
          "link-rounded",
          "menu-rounded",
          "more-horiz",
          "open-in-new-rounded",
          "palette-outline",
          "person-outline-rounded",
          "photo-library-outline-rounded",
          "photo-library-sharp",
          "play-circle-rounded",
          "radio-button-partial",
          "refresh-rounded",
          "search",
          "settings-suggest-rounded",
          "shuffle-rounded",
          "star-rounded",
          "tag-rounded",
          "text-ad-outline-rounded",
          "thumb-up-outline-rounded",
          "verified-outline-rounded",
          "visibility-outline",
          "visibility-outline-rounded",
          "warning-outline-rounded",
          "wb-sunny-outline-rounded",
          "home-outline-rounded",
          "keyboard-arrow-up-rounded",
          "music-note-rounded",
          "subtitles-off-outline-rounded",
          "subtitles-outline-rounded",
          "volume-up-rounded",
          "volume-off-rounded",
          "repeat-rounded",
          "repeat-one-rounded",
          "shuffle-rounded",
          "skip-previous-rounded",
          "play-arrow-rounded",
          "pause-rounded",
          "skip-next-rounded",
          "sync-rounded",
          "graphic-eq-rounded",
          "format-list-bulleted-rounded",
        ],
        tabler: ["smart-home", "external-link"],
      },
    }),
    svelte(),
  ],
  vite: {
    define: {
      ASSET_VERSION: JSON.stringify(themeVersion),
    },
    plugins: [
      // Tailwind v4 已移除 safelist 选项（v3 遗留，会被静默忽略）：
      // navbar-blur 类在 Navbar.astro 源码中以字面量存在，内容检测会自动生成
      tailwindcss(),
      Icons(),
    ],
  },
});
