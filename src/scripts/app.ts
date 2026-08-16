// src/scripts/app.ts — 应用入口：协调所有初始化逻辑

// ── 全局样式 ──
import "../styles/global.css";
import "../styles/utilities.css";
import "../styles/variables.css";
import "../styles/comment-widget.css";
import "../styles/base.css";
import "../styles/theme-transition.css";
import "../styles/components.css";
import "../styles/markdown.css";
import "../styles/transition.css";
import "../styles/speed.css";
import "../styles/scrollbar.css";
import "../styles/external-link-modal.css";
import "../styles/link-apply-modal.css";
import "../styles/profile-status.css";

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
import { scrollDownToContent, scrollFunction } from "../utils/scroll-manager";
import { syncHomeClass, isHomePath } from "../utils/banner-sync";
import { initLegacyAdmonitions } from "../utils/legacy-admonitions";
import { initExternalLinkRedirect } from "../utils/external-link-redirect";
import { initProfileStatus } from "../utils/profile-status";
import {
  initContentLightbox,
  initPhotosGallery,
  destroyAll,
} from "../utils/content-media";

// ── 自定义滚动条（懒加载，等入场动画结束后初始化） ──
let scrollbarInitialized = false;
function initCustomScrollbar() {
  if (scrollbarInitialized) return;
  scrollbarInitialized = true;
  const bodyElement = document.querySelector("body");
  if (!bodyElement) return;
  import("overlayscrollbars").then(({ OverlayScrollbars }) => {
    let mounted = false;
    const mount = () => {
      if (mounted) return; // 防重入：Promise.all 与 setTimeout 兜底可能双调
      mounted = true;
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
    };
    // OverlayScrollbars 初始化会把 body 内容包裹进滚动容器（appendChild 移动全部
    // 元素），Chrome 对被移动且动画未结束的元素会重建 CSS 动画对象，导致入场动画
    // "播放完成后再重放一次"（复现时间点即 overlayscrollbars 下载完成瞬间）。
    // 等 fade-in-up 全部结束再初始化——此时动画已被下方的一次性保护清理，
    // 移动不再触发重放；2s 兜底防动画异常卡住。等待期间原生滚动条正常工作。
    const running = document
      .getAnimations()
      .filter(
        (a) =>
          a instanceof CSSAnimation &&
          (a.animationName === "fade-in-up" ||
            a.animationName === "slide-in-up"),
      );
    if (running.length > 0) {
      void Promise.all(
        running.map((a) => a.finished.catch(() => undefined)),
      ).then(mount);
      setTimeout(mount, 2000);
    } else {
      mount();
    }
  });
}

// ── 入场动画一次性保护 ──
// 浏览器会因元素移动（滚动容器包裹等）/样式重算重建 CSS 动画对象，使入场动画
// 从头重放。用 document 级事件委托在动画结束/取消后清理：
//  - .onload-animation 类元素：移除类（回到静态可见状态，重放无动画可播）
//  - banner 标题/副标题（动画由 CSS 选择器定义，无类可移除）：内联固化终态
//    （opacity: 1 + animation: none）
function removeOnloadAnimation(e: AnimationEvent) {
  const el = e.target as Element | null;
  if (!el) return;
  if (el.classList.contains("onload-animation")) {
    el.classList.remove("onload-animation");
  }
  if (el.id === "banner-title" || el.id === "banner-subtitle-wrapper") {
    const style = (el as HTMLElement).style;
    style.opacity = "1";
    style.animation = "none";
  }
}
document.addEventListener("animationend", removeOnloadAnimation);
document.addEventListener("animationcancel", removeOnloadAnimation);

// ── Banner 显示 ──
// 双容器（桌面 #banner / 移动 #banner-mobile-reveal）各自等待首图加载后
// 移除 opacity-0/scale-105 渐显；隐藏端（display:none）不触发加载回调，
// 由 banner-src-switch.js 在激活时升级 eager 后自然走完同一流程
function showBanner() {
  // 媒体容器统一带 .banner-reveal：图片等首图加载、视频等首帧可播后移除
  // opacity-0/scale-105 渐显；加载失败也放行，避免媒体异常时 banner 永久隐藏
  document.querySelectorAll(".banner-reveal").forEach((banner) => {
    const reveal = () => banner.classList.remove("opacity-0", "scale-105");
    const video = banner.querySelector("video");
    if (video) {
      if (video.readyState >= 2) reveal();
      else {
        video.addEventListener("loadeddata", reveal, { once: true });
        video.addEventListener("error", reveal, { once: true });
      }
      return;
    }
    const img = banner.querySelector("img");
    if (img) {
      if (img.complete && img.naturalWidth > 0) reveal();
      else {
        img.onload = reveal;
        img.onerror = reveal;
      }
    } else {
      reveal();
    }
  });
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

// ── widget-layout 自定义元素（小组件折叠"更多"按钮）──
// 必须在全局无条件注册，不能依赖任何具体小组件的渲染位置，
// 否则公告等组件被 th:if 隐藏时，分类/标签等按钮会全部失效。
class WidgetLayoutElement extends HTMLElement {
  connectedCallback() {
    if (this.dataset.isCollapsed !== "true") return;
    const id = this.dataset.id;
    const btn = this.querySelector(".expand-btn");
    const wrapper = this.querySelector(`#${id}`);
    btn?.addEventListener("click", () => {
      wrapper?.classList.remove("collapsed");
      btn.classList.add("hidden");
    });
  }
}

if (!customElements.get("widget-layout")) {
  customElements.define("widget-layout", WidgetLayoutElement);
}

// ── Swup hooks ──
function setupSwup() {
  if ((window as any).__etherealSwupHandlersBound) return;
  (window as any).__etherealSwupHandlersBound = true;

  // 注：曾在此把 --content-delay 改为 0ms（让换页后内容立即浮现），但该变量被全部
  // 入场动画的 animation-delay: calc(var(--content-delay) + Xms) 消费，点击时修改
  // 会重算已完成动画的 delay（方向依赖的重启风险，且单向永不恢复）——已移除，
  // 保持 150ms 默认错落延迟。
  window.swup.hooks.on("content:replace", initCustomScrollbar);
  window.swup.hooks.on("content:replace", destroyAll, { before: true });
  // 首页↔其他页换页（is-home 变化时）挂 home-switch：仅全屏模式启用——
  // 让新内容淡入与横幅/网格 700ms 位移同速，换入即最终布局，消除"内容先显示、
  // 再位移"的闪烁（全屏下位移大 100vh↔35vh，且波浪下移出视口、缝隙不可见）。
  // 横幅模式回归 1.1.0 行为：不在 content:replace 提前切 is-home，换入后内容
  // 与波浪/横幅同速滑动（page:view 同步），避免"波浪滑过内容顶边露 1px 背景缝"
  // （Edge 75% 缩放可复现）。URL 在 animation:out:start 前已由 Swup pushState
  // 更新，可预判新页。
  // 当前是否全屏模式：运行时读取 <html data-banner-display>（访客可在面板切换
  // 壁纸模式，默认非全屏时手动切到全屏也应生效），不能按初始化时的值缓存
  function isFullscreenMode(): boolean {
    return document.documentElement.dataset.bannerDisplay === "fullscreen";
  }
  window.swup.hooks.on("animation:out:start", () => {
    if (
      !document.body.classList.contains("enable-banner") ||
      !isFullscreenMode()
    ) {
      document.documentElement.classList.remove("home-switch");
      return;
    }
    const nextIsHome = isHomePath();
    const currentIsHome = document.body.classList.contains("is-home");
    document.documentElement.classList.toggle(
      "home-switch",
      nextIsHome !== currentIsHome,
    );
  });
  // 旧内容已淡出、新内容未换入的空档切换 is-home（仅全屏模式：横幅/网格/波浪
  // 的 700ms 位移发生在不可见阶段，跳过动画的换页维持原 page:view 同步）。
  // 横幅模式不提前切换——新内容以旧 is-home 定位换入，page:view 后再整体滑动，
  // 内容与波浪/横幅同速联动，不产生波浪越过内容顶边时的 1px 缝隙
  window.swup.hooks.on(
    "content:replace",
    () => {
      if (
        document.documentElement.classList.contains("is-changing") &&
        isFullscreenMode()
      ) {
        syncHomeClass();
      }
    },
    { before: true },
  );
  // 换入动画结束（含被 home-switch 拉长的 700ms 淡入）后移除，两侧组件淡回
  window.swup.hooks.on("animation:in:end", () => {
    document.documentElement.classList.remove("home-switch");
  });
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
    // 标记会话内已发生换页（<html> 不被 Swup 替换，标记永久有效）：
    // #right-sidebar 是 swup 容器，换页会换入带静态 onload-animation 类的新
    // aside，transition.css 据此标记永久抑制其入场动画（首刷动画不受影响）。
    document.documentElement.classList.add("swup-visited");
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
  // 首次同步完成：恢复 wave 平滑过渡（加载早期被 html:not(.page-ready) 抑制，
  // 避免 syncHomeClass 首次设置 transform 时产生 700ms 条带位移）。必须双 rAF
  // 延迟：同帧加 page-ready 会让渲染时过渡仍生效（transform 与 class 同帧提交）。
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      document.documentElement.classList.add("page-ready");
    });
  });
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
// 注：nav-menu-panel 已改为右侧抽屉（body.nav-menu-open 驱动），关闭逻辑由
// navbar.js 统一处理（遮罩点击/关闭按钮/链接点击/ESC），不再作为 float-panel 处理
setClickOutsideToClose("search-panel", [
  "search-panel",
  "search-bar",
  "search-switch",
]);

// 向下箭头滚动目标：暴露给 MainGridLayout 内联事件委托脚本调用（按钮与委托
// 位于 Swup 容器外，模块本体仅执行一次，无需额外防重绑定守卫）
if (!(window as any).__etherealScrollDown) {
  (window as any).__etherealScrollDown = scrollDownToContent;
}

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
initProfileStatus();
