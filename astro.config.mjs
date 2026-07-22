// @ts-check
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import swup from "@swup/astro";

import Icons from "unplugin-icons/vite";
import svelte from "@astrojs/svelte";
import icon from "astro-icon";

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
      ignoreVisit: function (url) {
        // 禁用 Swup 对友链页面的处理
        return url.pathname === "/links" || url.pathname === "/links.html";
      },
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
          "content-copy-outline-rounded",
          "copyright-outline-rounded",
          "dark-mode-outline-rounded",
          "edit-calendar-outline-rounded",
          "edit-rounded",
          "expand-more-rounded",
          "favorite-outline-rounded",
          "favorite-rounded",
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
          "radio-button-partial-outline",
          "refresh-rounded",
          "search",
          "settings-suggest-rounded",
          "shuffle-outline-rounded",
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
    plugins: [
      tailwindcss({
        safelist: ["navbar-blur"],
      }),
      Icons(),
    ],
  },
});
