/**
 * 缩略图裁剪判定（瞬间媒体区专用）
 *
 * Moment 的 medium 数据不含图片宽高，服务端无法预知图片比例，展示时是否被 CSS
 * 裁剪只能在图片加载后比较「元素盒子比例」与「图片真实比例」得出。
 * 两个消费方共用同一判据，避免各自实现出现偏差：
 *  - content-photoswipe.ts：决定 PhotoSwipe zoom 过渡是否从裁剪态开始（thumbCropped）
 *  - moment-media-badge.ts：决定是否显示「长图 / 宽图」徽章
 */

/** 比例差超过该值才判定为裁剪（吸收亚像素与取整误差） */
export const CROP_RATIO_TOLERANCE = 0.02;

export type ThumbCropDirection = "tall" | "wide";

/**
 * 判断缩略图相对原图是否被裁剪，并给出裁剪方向：
 *  - tall：盒子比图片更宽 → 图片更高，被裁掉下方（超长图，展示顶部）
 *  - wide：盒子比图片更高 → 图片更宽，被裁掉右侧（超宽图，展示左侧）
 *  - null：未裁剪，或图片/盒子尺寸尚未就绪
 */
export function getThumbCropDirection(
  img: HTMLImageElement,
): ThumbCropDirection | null {
  const naturalWidth = img.naturalWidth;
  const naturalHeight = img.naturalHeight;
  const boxWidth = img.clientWidth;
  const boxHeight = img.clientHeight;
  if (!naturalWidth || !naturalHeight || !boxWidth || !boxHeight) {
    return null;
  }

  const boxRatio = boxWidth / boxHeight;
  const imageRatio = naturalWidth / naturalHeight;
  if (Math.abs(boxRatio - imageRatio) <= CROP_RATIO_TOLERANCE) {
    return null;
  }
  return boxRatio > imageRatio ? "tall" : "wide";
}

/** 是否需要按「裁剪缩略图」处理 PhotoSwipe 过渡动画 */
export function isThumbCropped(img: HTMLImageElement): boolean {
  return getThumbCropDirection(img) !== null;
}
