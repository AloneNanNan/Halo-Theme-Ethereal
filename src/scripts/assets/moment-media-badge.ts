import { getThumbCropDirection } from "../../utils/thumb-crop";

// 瞬间单图「长图 / 宽图」徽章：仅当图片被 CSS 裁切显示时提示。文案由 Thymeleaf 服务端
// 渲染，本脚本只切 hidden 属性（脚本未执行时徽章保持隐藏）；dataset 守卫防重复绑定。
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
