// src/scripts/app.ts — 应用入口：协调所有初始化逻辑

// ── 全局样式 ──
import "../styles/global.css";
import "../styles/utilities.css";
import "../styles/variables.css";
import "../styles/comment-widget.css";
import "../styles/base.css";
import "../styles/components.css";
import "../styles/markdown.css";
import "../styles/transition.css";
import "../styles/scrollbar.css";
import "../styles/external-link-modal.css";

// ── 第三方 ──
import "overlayscrollbars/styles/overlayscrollbars.css";

// ── 工具模块 ──
import { SWUP_VISIT_END_DELAY } from "../constants/constants";
import {
  setTheme,
  getStoredTheme,
  getHue,
  setHue,
} from "../utils/setting-utils";
import { syncHomeClass, scrollFunction } from "../utils/scroll-manager";
import { initLegacyAdmonitions } from "../utils/legacy-admonitions";
import { initExternalLinkRedirect } from "../utils/external-link-redirect";
import {
  initContentLightbox,
  initPhotosGallery,
  destroyAll,
} from "../utils/content-media";

// ── 自定义滚动条（懒加载） ──
let scrollbarInitialized = false;
function initCustomScrollbar() {
  if (scrollbarInitialized) return;
  scrollbarInitialized = true;
  const bodyElement = document.querySelector("body");
  if (!bodyElement) return;
  import("overlayscrollbars").then(({ OverlayScrollbars }) => {
    OverlayScrollbars(
      { target: bodyElement, cancel: { nativeScrollbarsOverlaid: true } },
      {
        scrollbars: {
          theme: "scrollbar-base scrollbar-auto py-1",
          autoHide: "move",
          autoHideDelay: 500,
          autoHideSuspend: false,
        },
      },
    );
  });
}

// ── Banner 显示 ──
function showBanner() {
  const banner = document.getElementById("banner");
  if (!banner) return;
  const img = banner.querySelector("img");
  if (img) {
    if (img.complete && img.naturalWidth > 0) {
      banner.classList.remove("opacity-0", "scale-105");
    } else {
      img.onload = () => banner.classList.remove("opacity-0", "scale-105");
      img.onerror = () => banner.classList.remove("opacity-0", "scale-105");
    }
  } else {
    banner.classList.remove("opacity-0", "scale-105");
  }
}

// ── 点击外部关闭面板 ──
function setClickOutsideToClose(panel: string, ignores: string[]) {
  document.addEventListener("click", (event) => {
    const panelDom = document.getElementById(panel);
    const target = event.target;
    if (!panelDom || !(target instanceof Node)) return;
    for (const ignored of ignores) {
      const ignoredEl = document.getElementById(ignored);
      if (ignoredEl === target || ignoredEl?.contains(target)) return;
    }
    panelDom.classList.add("float-panel-closed");
  });
}

// ── 恢复 history 原始方法 ──
function restoreOriginalHistoryStateHandlers() {
  const originalHistory = (window as any).__etherealOriginalHistory;
  if (!originalHistory) return;
  if (originalHistory.pushState)
    window.history.pushState = originalHistory.pushState;
  if (originalHistory.replaceState)
    window.history.replaceState = originalHistory.replaceState;
}

// ── Swup hooks ──
function setupSwup() {
  if ((window as any).__etherealSwupHandlersBound) return;
  (window as any).__etherealSwupHandlersBound = true;

  window.swup.hooks.on("link:click", () => {
    document.documentElement.style.setProperty("--content-delay", "0ms");
  });
  window.swup.hooks.on("content:replace", initCustomScrollbar);
  window.swup.hooks.on("content:replace", destroyAll, { before: true });
  window.swup.hooks.on("content:replace", () => {
    const rightToc = document.querySelector(
      "#right-sidebar table-of-contents",
    ) as (HTMLElement & { refresh?: () => void }) | null;
    rightToc?.refresh?.();
  });
  window.swup.hooks.on("page:view", () => {
    syncHomeClass();
    void initContentLightbox();
    void initPhotosGallery();
    showBanner();
    scrollFunction();
    initLegacyAdmonitions();
    initExternalLinkRedirect();
    if (document.querySelector(".firefly-music-player")) {
      import("../styles/music-player.css");
    }
  });
  window.swup.hooks.on("visit:start", () => {
    restoreOriginalHistoryStateHandlers();
    document.getElementById("page-height-extend")?.classList.remove("hidden");
    document.getElementById("toc-wrapper")?.classList.add("toc-not-ready");
  });
  window.swup.hooks.on("visit:end", () => {
    setTimeout(() => {
      document.getElementById("page-height-extend")?.classList.add("hidden");
      document.getElementById("toc-wrapper")?.classList.remove("toc-not-ready");
    }, SWUP_VISIT_END_DELAY);
  });
}

// ── 初始化 ──
function init() {
  syncHomeClass();
  setTheme(getStoredTheme());
  setHue(getHue());
  initCustomScrollbar();
  showBanner();
  initLegacyAdmonitions();
  if (document.querySelector(".firefly-music-player")) {
    import("../styles/music-player.css");
  }
}

setClickOutsideToClose("display-setting", [
  "display-setting",
  "display-settings-switch",
]);
setClickOutsideToClose("nav-menu-panel", ["nav-menu-panel", "nav-menu-switch"]);
setClickOutsideToClose("search-panel", [
  "search-panel",
  "search-bar",
  "search-switch",
]);

init();
void initContentLightbox();
void initPhotosGallery();

if (window?.swup?.hooks) {
  setupSwup();
} else {
  document.addEventListener("swup:enable", setupSwup);
}

scrollFunction();
initExternalLinkRedirect();
