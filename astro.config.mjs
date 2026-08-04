// @ts-check
import { defineConfig } from "astro/config";
import fs from "node:fs";
import tailwindcss from "@tailwindcss/vite";
import swup from "@swup/astro";

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

export default defineConfig({
  base: "/themes/Ethereal",
  build: {
    assets: "assets",
    format: "file",
  },
  outDir: "./templates",
  integrations: [
    swup({
      theme: false,
      animationClass: "transition-swup-", // see https://swup.js.org/options/#animationselector
      // the default value `transition-` cause transition delay
      // when the Tailwind class `transition-all` is used
      containers: ["#swup-container", "#toc-container", "#right-sidebar"],
      smoothScrolling: true,
      cache: false, // 禁用缓存，避免友链页面内容不完整
      preload: true, // 启用预加载，加快页面切换速度
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
          "photo-library-rounded",
          "play-circle-rounded",
          "radio-button-partial-outline",
          "refresh-rounded",
          "search",
          "settings-suggest-rounded",
          "shuffle-outline-rounded",
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
      tailwindcss({
        safelist: ["navbar-blur"],
      }),
      Icons(),
    ],
  },
});
