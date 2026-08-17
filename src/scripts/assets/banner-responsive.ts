// @ts-nocheck —— legacy 手写脚本迁入源码目录（保持 ES5 原样，不做类型改造）
// Banner 叠加层：首页可见 + 居中 + 响应式字号 + 空间不足隐藏
(function () {
  // ── Banner 响应式常量 ──
  var MIN_BANNER_HEIGHT = 180;
  var BP_TABLET = 768;
  var TITLE_MIN_REM = 1.8;
  var TITLE_MAX_REM = 3.5;
  var TITLE_VW_FACTOR = 0.007;
  var SUB_SIZE_480 = 1.0;
  var SUB_SIZE_640 = 1.125;
  var SUB_SIZE_767 = 1.25;
  var SUB_SIZE_DEFAULT = 1.5;

  // 保存 th:style 原始字号，PC 端原样还原
  var origTitleSize = null;
  var origSubSize = null;
  var origCursorH = null;

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

  function saveOriginals() {
    var t = getEl("banner-title");
    var s = getEl("banner-subtitle");
    var c = getEl("banner-cursor");
    if (t && origTitleSize === null) origTitleSize = t.style.fontSize || "";
    if (s && origSubSize === null) origSubSize = s.style.fontSize || "";
    if (c && origCursorH === null) origCursorH = c.style.height || "";
  }

  function applyResponsive() {
    saveOriginals();
    var title = getEl("banner-title");
    var sub = getEl("banner-subtitle");
    var cursor = getEl("banner-cursor");

    if (window.innerWidth <= BP_TABLET) {
      // 标题：min(userSize, vw%) 响应式策略
      // 10vw / 14px(移动端 root) → 乘数 0.007，上限 3.5rem，下限 1.8rem
      var w = window.innerWidth;
      var ts = Math.max(
        TITLE_MIN_REM,
        Math.min(TITLE_MAX_REM, w * TITLE_VW_FACTOR),
      );

      // 副标题：按断点逐级缩放
      var ss;
      if (w <= 480) ss = SUB_SIZE_480;
      else if (w <= 640) ss = SUB_SIZE_640;
      else if (w <= 767) ss = SUB_SIZE_767;
      else ss = SUB_SIZE_DEFAULT;
      if (title) title.style.fontSize = ts.toFixed(2) + "rem";
      if (sub) sub.style.fontSize = ss.toFixed(2) + "rem";
      if (cursor) cursor.style.height = ss.toFixed(2) + "rem";
    } else {
      // PC：还原 th:style 原始值
      if (title && origTitleSize) title.style.fontSize = origTitleSize;
      if (sub && origSubSize) sub.style.fontSize = origSubSize;
      if (cursor && origCursorH) cursor.style.height = origCursorH;
    }
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
    applyResponsive();
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
