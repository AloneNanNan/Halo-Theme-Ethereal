// @ts-nocheck —— legacy 手写脚本迁入源码目录（保持 ES5 原样，不做类型改造）
// Banner 叠加层：首页可见 + 居中 + 空间不足隐藏。
// 注：标题/副标题的响应式字号已迁至 components.css 的媒体查询（SSR 首帧即生效，
// 修复旧实现「先以桌面内联字号渲染、本脚本 defer 执行后才收窄」造成的移动端首屏
// 大字号闪变）。本脚本不再读写任何元素字号——勿在此处加回字号逻辑（内联 font-size
// 会盖过媒体查询，详见 components.css 字号块注释）。
(function () {
  // ── Banner 常量 ──
  var MIN_BANNER_HEIGHT = 180;

  function getEl(id) {
    return document.getElementById(id);
  }

  function isHomepage() {
    var p = window.location.pathname;
    return (
      (p
        .replace(/\/+$/, "")
        .replace(/\/index\.html$/, "")
        .replace(/\/index$/, "") || "/") === "/"
    );
  }

  function positionOverlay() {
    var overlay = getEl("banner-overlay");
    var wrapper = getEl("banner-wrapper");
    if (overlay && wrapper) {
      // overlay 本身有 absolute inset-0，覆盖整个 wrapper
      // is-home 生效后 wrapper translate-y 将其带到视口顶部
      // 仅做清理：移除可能由旧逻辑残留的 inline top/bottom
      overlay.style.top = "";
      overlay.style.bottom = "";
    }
  }

  function updateVisibility() {
    var overlay = getEl("banner-overlay");
    if (!overlay) return;
    if (!isHomepage()) {
      // 非首页：淡出
      overlay.classList.add("banner-text-hidden");
      return;
    }

    var wrapper = getEl("banner-wrapper");
    if (!wrapper) {
      overlay.classList.remove("banner-text-hidden");
      return;
    }
    var wasHidden = overlay.classList.contains("banner-text-hidden");
    var rect = wrapper.getBoundingClientRect();
    if (rect.bottom >= MIN_BANNER_HEIGHT) {
      overlay.classList.remove("banner-text-hidden");
      // 从隐藏变为可见时，通知打字机/下坠脚本重新初始化
      if (wasHidden) {
        document.dispatchEvent(new CustomEvent("banner:visible"));
      }
    } else {
      overlay.classList.add("banner-text-hidden");
    }
  }

  function fullUpdate() {
    updateVisibility();
    positionOverlay();
  }

  // 清除 SSR 可能残留的 display:none，统一用 opacity 过渡
  (function initOverlay() {
    var overlay = getEl("banner-overlay");
    if (overlay && overlay.style.display === "none") {
      overlay.style.display = "";
      overlay.classList.add("banner-text-hidden");
    }
  })();

  fullUpdate();

  // window/document 级监听器只绑一次：本脚本会被 SwupScriptsPlugin 在每次换页时
  // 克隆重执行，不守卫则 resize/scroll 处理器逐次叠加（N 次换页 = N 倍回调开销）。
  // 换页后的重排由上方 fullUpdate() 在每次重执行时完成。
  // 原 swup:contentReplaced 监听删除：Swup v3 事件名，v4 分发 swup:{hook}，从未触发。
  if (!window.__bannerRespBound) {
    window.__bannerRespBound = true;

    var resizeTimer;
    window.addEventListener("resize", function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(fullUpdate, 150);
    });

    var scrollTimer;
    window.addEventListener(
      "scroll",
      function () {
        clearTimeout(scrollTimer);
        scrollTimer = setTimeout(function () {
          updateVisibility();
        }, 100);
      },
      { passive: true },
    );
  }
})();
