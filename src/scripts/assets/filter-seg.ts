// @ts-nocheck —— 经典浏览器脚本（SwupScriptsPlugin 换页重执行，全部幂等）
/**
 * 分组筛选「胶囊池」（segmented）滑块定位 + 滚动两端渐隐。结构见 components.css 的
 * .seg-* 段（.seg-scroll / .seg[data-filter-seg] / .seg-thumb / .seg-item.seg-active，
 * 就绪后轨道挂 data-seg-ready）。
 *
 * 行为：入场按当前 .seg-active 无动画定位；点击先让浮块滑向点击项再导航（修饰键点击不
 * 预移动）；容器可横滚时按滚动位置切 can-scroll-left/right；resize / 字体加载后校正。
 * 幂等：window.__etherealFilterSeg 单例——换页重执行只调 init()，监听不累积。
 */
(function () {
  if (window.__etherealFilterSeg) {
    window.__etherealFilterSeg.init();
    return;
  }

  function moveTo(seg, item, animate) {
    var thumb = seg.querySelector(".seg-thumb");
    if (!thumb || !item) return;
    if (animate === false) thumb.style.transition = "none";
    thumb.style.width = item.offsetWidth + "px";
    thumb.style.transform = "translateX(" + item.offsetLeft + "px)";
    if (animate === false) {
      // 强制回流再恢复过渡，避免初始定位（或 resize 校正）也播动画
      void thumb.offsetWidth;
      thumb.style.transition = "";
    }
  }

  function placeCurrent(seg, animate) {
    var item =
      seg.querySelector(".seg-item.seg-active") ||
      seg.querySelector(".seg-item");
    moveTo(seg, item, animate);
  }

  function initSeg(seg) {
    if (!seg.getAttribute("data-seg-ready")) {
      seg.setAttribute("data-seg-ready", "1");
      // 点击预移动：注册在轨道上（条目是服务端渲染的 <a>，无需逐个绑定）
      seg.addEventListener("click", function (e) {
        if (
          e.defaultPrevented ||
          e.button !== 0 ||
          e.metaKey ||
          e.ctrlKey ||
          e.shiftKey ||
          e.altKey
        )
          return;
        var target = e.target;
        var item =
          target && target.closest ? target.closest(".seg-item") : null;
        if (item && seg.contains(item)) moveTo(seg, item, true);
      });
    }
    placeCurrent(seg, false);
  }

  function updateMask(el) {
    var max = el.scrollWidth - el.clientWidth;
    el.classList.toggle("can-scroll-left", el.scrollLeft > 2);
    el.classList.toggle("can-scroll-right", max > 2 && el.scrollLeft < max - 2);
  }

  function initScroller(sc) {
    if (sc.getAttribute("data-seg-scroll-ready")) {
      updateMask(sc);
      return;
    }
    sc.setAttribute("data-seg-scroll-ready", "1");
    sc.addEventListener(
      "scroll",
      function () {
        updateMask(sc);
      },
      { passive: true },
    );
    updateMask(sc);
  }

  function init() {
    var segs = document.querySelectorAll("[data-filter-seg]");
    Array.prototype.forEach.call(segs, function (seg) {
      initSeg(seg);
      var sc = seg.closest ? seg.closest(".seg-scroll") : null;
      if (sc) initScroller(sc);
    });
    // 已就绪过的滚动容器在换页后可能未被重新收集：统一刷新一次渐隐
    Array.prototype.forEach.call(
      document.querySelectorAll(".seg-scroll"),
      updateMask,
    );
  }

  function refresh() {
    Array.prototype.forEach.call(
      document.querySelectorAll("[data-filter-seg]"),
      function (seg) {
        placeCurrent(seg, false);
      },
    );
  }

  window.__etherealFilterSeg = { init: init, refresh: refresh };

  window.addEventListener("resize", refresh);
  if (document.fonts && document.fonts.ready && document.fonts.ready.then) {
    document.fonts.ready.then(refresh);
  }
  window.addEventListener("load", refresh);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
