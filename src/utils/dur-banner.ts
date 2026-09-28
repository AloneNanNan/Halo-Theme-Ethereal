/** --dur-banner 的毫秒读数（过渡窗口收尾、hero 模糊过渡等共用）。
 *
 *  getComputedStyle 返回 CSSOM 规范化后的 ".7s" 而非 "700ms"，直接 parseFloat
 *  得 0.7 —— 用它做收尾定时器会让过渡窗口只挂约 100ms，过渡中途被摘、元素
 *  瞬跳到终点（切模式时壁纸尺寸/位置突变、模糊过渡半途而废即由此而来）。
 *  解析失败或非正值回退 700ms（与 CSS 默认值一致）。 */
export function readDurBannerMs(root: HTMLElement): number {
  const raw = getComputedStyle(root).getPropertyValue("--dur-banner").trim();
  const n = parseFloat(raw);
  if (!Number.isFinite(n) || n <= 0) return 700;
  return raw.endsWith("ms") ? n : n * 1000;
}
