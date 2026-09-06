import { getThumbCropDirection } from "../../utils/thumb-crop";

// 瞬间单图「长图 / 宽图」徽章：仅当图片被 CSS 裁切显示时提示（长图裁下、宽图裁右）。
// 文案由 Thymeleaf 服务端渲染（多语言），本脚本只切换 hidden 属性，因此脚本未执行时
// 徽章保持隐藏，不会露出半成品状态。
// 绑定用 dataset 守卫：Swup 换页时脚本会被重执行，避免重复绑定。
(function () {
  function mark(img: HTMLImageElement) {
    var figure = img.closest(".moment-media-item");
    if (!figure) return;
    var tallEl = figure.querySelector<HTMLElement>(".moment-media-badge-tall");
    var wideEl = figure.querySelector<HTMLElement>(".moment-media-badge-wide");
    if (!tallEl || !wideEl) return;

    var direction = getThumbCropDirection(img);
    tallEl.hidden = direction !== "tall";
    wideEl.hidden = direction !== "wide";
  }

  function bind(img: HTMLImageElement) {
    if (img.dataset.badgeBound) return;
    img.dataset.badgeBound = "1";
    if (img.complete && img.naturalWidth) {
      mark(img);
    } else {
      img.addEventListener("load", function () {
        mark(img);
      });
    }
  }

  function init() {
    document
      .querySelectorAll<HTMLImageElement>(
        ".moment-media-count-1 .moment-media-item img",
      )
      .forEach(bind);
  }

  init();
})();
