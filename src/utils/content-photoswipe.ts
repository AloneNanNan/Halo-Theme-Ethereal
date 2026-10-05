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
      // 缩略图被 CSS 裁剪时必须声明 thumbCropped，否则 PhotoSwipe 按原图比例反推 zoom
      // 过渡起点（表现为「点击后先变成原比例再放大」）。不能用 data-cropped：PhotoSwipe
      // 只在 linkEl 上读取（element.tagName === 'A' ? element : element.querySelector('a')），
      // 本主题 gallery children 是 <img>、linkEl 恒为 null，属性不会被解析。判据统一见
      // ./thumb-crop（不能用 width/height，它们带窗口兜底值，未解码时会误判）。
      itemData.thumbCropped = isThumbCropped(element);
    } else if (element instanceof HTMLAnchorElement) {
      const src = element.dataset.pswpSrc || element.href;
      itemData.src = src;
      itemData.w = Number(element.dataset.pswpWidth || window.innerWidth);
      itemData.h = Number(element.dataset.pswpHeight || window.innerHeight);
    }
    return itemData;
  });

  // 打开/关闭动画期间禁用缩略图自身的 hover 放大：点击瞬间缩略图处于 scale(1.05) 且
  // 带 300ms transition，PhotoSwipe 会采样到放大中/后的矩形，zoom 起始位置与尺寸不符。
  lightbox.on("afterInit", () => {
    document.body.classList.add("pswp-transition");
  });
  lightbox.on("destroy", () => {
    document.body.classList.remove("pswp-transition");
  });

  lightbox.init();
  return lightbox;
}
