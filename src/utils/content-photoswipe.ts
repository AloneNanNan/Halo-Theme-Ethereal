import PhotoSwipeLightbox from "photoswipe/lightbox";
import { isThumbCropped } from "./thumb-crop";

export function initContentPhotoSwipe() {
  const pswp = import("photoswipe");
  const lightbox = new PhotoSwipeLightbox({
    gallery:
      ".custom-md img, #post-cover img, .moment-media img, #photo-detail-image",
    pswpModule: () => pswp,
    padding: { top: 20, bottom: 20, left: 20, right: 20 },
    wheelToZoom: true,
    arrowPrev: false,
    arrowNext: false,
    imageClickAction: "close",
    tapAction: "close",
    doubleTapAction: "zoom",
  });

  lightbox.addFilter("domItemData", (itemData, element) => {
    if (element instanceof HTMLImageElement) {
      const src = element.dataset.pswpSrc || element.src;
      const dataWidth = Number(element.dataset.pswpWidth || 0);
      const dataHeight = Number(element.dataset.pswpHeight || 0);
      const width = dataWidth || element.naturalWidth || window.innerWidth;
      const height = dataHeight || element.naturalHeight || window.innerHeight;
      itemData.src = src;
      itemData.width = width;
      itemData.height = height;
      itemData.w = width;
      itemData.h = height;
      itemData.msrc = element.src;
      // 缩略图被 CSS 裁剪时必须声明 thumbCropped，否则 PhotoSwipe 按原图比例反推
      // zoom 过渡起点，表现为「点击后先变成原比例再放大」。
      // 不能用 data-cropped 属性：PhotoSwipe 只在 linkEl 上读取（_domElementToItemData：
      // linkEl = element.tagName === 'A' ? element : element.querySelector('a')），
      // 本主题 gallery children 是 <img>，linkEl 恒为 null，属性不会被解析。
      // 判据统一见 ./thumb-crop（不能用上面的 width/height，它们带窗口尺寸兜底值，
      // 图片未解码时会退化成视口比例导致误判）。
      itemData.thumbCropped = isThumbCropped(element);
    } else if (element instanceof HTMLAnchorElement) {
      const src = element.dataset.pswpSrc || element.href;
      itemData.src = src;
      itemData.w = Number(element.dataset.pswpWidth || window.innerWidth);
      itemData.h = Number(element.dataset.pswpHeight || window.innerHeight);
    }
    return itemData;
  });

  // 打开/关闭动画期间禁用缩略图自身的 hover 放大：
  // 点击瞬间缩略图处于 scale(1.05) 且带 300ms transition，PhotoSwipe 会采样到
  // 放大中/放大后的矩形，导致 zoom 过渡的起始位置与尺寸不符（见 issue #66）。
  // 在 afterInit 复位、destroy 恢复，覆盖整个打开/关闭动画。
  lightbox.on("afterInit", () => {
    document.body.classList.add("pswp-transition");
  });
  lightbox.on("destroy", () => {
    document.body.classList.remove("pswp-transition");
  });

  lightbox.init();
  return lightbox;
}
