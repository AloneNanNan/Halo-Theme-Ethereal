// @ts-nocheck —— legacy 手写脚本迁入源码目录（保持 ES5 原样，不做类型改造）
// 文章卡片瀑布流（Masonry）布局
// 仅在容器为 grid 模式且启用瀑布流（data-masonry="true"）时生效；
// 否则恢复 CSS grid 布局。换页后由 SwupScriptsPlugin 重执行覆盖（同 collapse.js）。
(function () {
  function getContainer() {
    return document.getElementById("post-list-container");
  }

  // 是否启用瀑布流：grid 模式 + masonry 开关
  function isMasonryEnabled(container) {
    return (
      container.classList.contains("post-grid-mode") &&
      container.getAttribute("data-masonry") === "true"
    );
  }

  // 计算列数：容器宽度 / (最小列宽 + 间距)
  function getColCount(containerWidth, columnWidth, gap) {
    return Math.max(
      1,
      Math.floor((containerWidth + gap) / (columnWidth + gap)),
    );
  }

  function applyMasonry(container) {
    var items = Array.prototype.slice.call(
      container.querySelectorAll(".post-card-item"),
    );
    if (items.length === 0) return;

    var gap = 16; // 与 grid 模式的 gap 保持一致
    var columnWidth = parseInt(
      container.getAttribute("data-column-width") || "320",
      10,
    );
    if (!columnWidth || columnWidth < 1) columnWidth = 320;

    // 容器改为相对定位，卡片绝对定位
    container.classList.add("masonry-active");
    container.style.position = "relative";
    container.style.display = "block";

    var containerWidth = container.offsetWidth;
    var colCount = getColCount(containerWidth, columnWidth, gap);
    var itemWidth = (containerWidth - (colCount - 1) * gap) / colCount;
    var colHeights = new Array(colCount).fill(0);

    items.forEach(function (item) {
      // 清掉可能残留的入场 transform，避免影响 offsetHeight
      item.style.transform = "";
      // 高度回归内容自定，覆盖 grid 模式的 height:100%（Firefly 同款处理）
      item.style.setProperty("height", "auto", "important");
      // 放到当前最短列
      var colIndex = colHeights.indexOf(Math.min.apply(null, colHeights));
      item.style.position = "absolute";
      item.style.width = itemWidth + "px";
      item.style.top = colHeights[colIndex] + "px";
      item.style.left = colIndex * (itemWidth + gap) + "px";
      // 使用 offsetHeight 获取真实内容高度，避免 transform: scale 影响
      colHeights[colIndex] += item.offsetHeight + gap;
    });

    container.style.height = Math.max.apply(null, colHeights) + "px";
  }

  function resetLayout(container) {
    container.classList.remove("masonry-active");
    container.style.position = "";
    container.style.display = "";
    container.style.height = "";
    var items = container.querySelectorAll(".post-card-item");
    for (var i = 0; i < items.length; i++) {
      items[i].style.position = "";
      items[i].style.top = "";
      items[i].style.left = "";
      items[i].style.width = "";
      items[i].style.height = "";
      items[i].style.transform = "";
    }
  }

  function init() {
    var container = getContainer();
    if (!container) return;
    if (isMasonryEnabled(container)) {
      applyMasonry(container);
    } else {
      resetLayout(container);
    }
  }

  // 封面图加载完成后可能改变卡片高度，重排一次
  function bindImageLoad() {
    var container = getContainer();
    if (!container || !isMasonryEnabled(container)) return;
    var imgs = container.querySelectorAll(".post-card-cover img");
    for (var i = 0; i < imgs.length; i++) {
      (function (img) {
        if (img.complete) return;
        img.addEventListener("load", function () {
          var c = getContainer();
          if (c && isMasonryEnabled(c)) applyMasonry(c);
        });
      })(imgs[i]);
    }
  }

  // 初始化
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      init();
      bindImageLoad();
    });
  } else {
    init();
    bindImageLoad();
  }

  // 暴露重排入口：访客切换文章布局（visitor-post-layout.js / 显示设置面板）
  // 换类后调用，按当前容器类决定应用瀑布流或恢复 CSS grid。
  // 幂等覆盖赋值，Swup 换页重执行本脚本时不会产生重复绑定。
  window.__postListRelayout = init;

  // 窗口尺寸变化时重排（防抖），只绑定一次避免 Swup 换页后重复监听
  if (!window.__postListLayoutResizeBound) {
    window.__postListLayoutResizeBound = true;
    var resizeTimer = null;
    window.addEventListener("resize", function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        var container = getContainer();
        if (!container || !isMasonryEnabled(container)) return;
        applyMasonry(container);
      }, 200);
    });

    // 页面从后台切回时重排（图片可能刚完成懒加载，Firefly 同款处理）
    document.addEventListener("visibilitychange", function () {
      if (!document.hidden) {
        var container = getContainer();
        if (!container || !isMasonryEnabled(container)) return;
        applyMasonry(container);
      }
    });
  }
})();
