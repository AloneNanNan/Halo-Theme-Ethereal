// Banner 高度体系（权威定义）：
//   --banner-height：banner 基础高度，恒定 35vh（首页与非首页顶部同值）
//   --banner-height-home：首页 banner 总高 = 基础 + 延伸（横幅 65vh / 全屏 100vh）
//   --banner-height-extend：首页延伸量（横幅 30vh / 全屏 65vh），JS 换算为像素
//     写入 CSS 变量，向下取整到 4px 倍数避免 sub-pixel 缝隙
// ⚠️ 同步点：variables.css 同名默认值、Layout.astro head 内联换算脚本、
//   banner-sync.ts——改任何一处必须同步其余
export const BANNER_EXTEND_ROUNDING = 4;

export const PAGE_SIZE = 8;

export const LIGHT_MODE = "light",
  DARK_MODE = "dark",
  AUTO_MODE = "auto";
export const DEFAULT_THEME = AUTO_MODE;

// Banner height unit: vh
export const BANNER_HEIGHT = 35;
export const BANNER_HEIGHT_EXTEND = 30;
export const BANNER_HEIGHT_HOME = BANNER_HEIGHT + BANNER_HEIGHT_EXTEND;

// 全屏模式（displayMode == 'fullscreen'）：首页 banner 延伸至整屏
export const BANNER_HEIGHT_EXTEND_FULLSCREEN = 65;
export const BANNER_HEIGHT_HOME_FULLSCREEN =
  BANNER_HEIGHT + BANNER_HEIGHT_EXTEND_FULLSCREEN;

/** 按展示模式返回首页 banner 高度（vh） */
export function bannerHomeVh(fullscreen: boolean): number {
  return fullscreen ? BANNER_HEIGHT_HOME_FULLSCREEN : BANNER_HEIGHT_HOME;
}

/** 按展示模式返回 banner 延伸高度（vh） */
export function bannerExtendVh(fullscreen: boolean): number {
  return fullscreen ? BANNER_HEIGHT_EXTEND_FULLSCREEN : BANNER_HEIGHT_EXTEND;
}

/** 计算 banner 延伸高度（像素）。viewportHeight 必须传 cssVhViewportHeight()
 *  （与 CSS 100vh 同基准），不能传 window.innerHeight（动态视口，见下方） */
export function calcBannerHeightExtend(
  viewportHeight: number,
  vh: number = BANNER_HEIGHT_EXTEND,
): number {
  let offset = Math.floor(viewportHeight * (vh / 100));
  return offset - (offset % BANNER_EXTEND_ROUNDING);
}

/** 将 --banner-height-extend 写入 <html>；值未变时跳过写入（写守卫）。
 *  滚动时地址栏收展会近每帧触发 resize、重算恒为同值，跳过写入避免引擎对
 *  相同值 setProperty 仍标记样式失效（修「地址栏滑动时壁纸抽搐」） */
export function writeBannerHeightExtend(offset: number): void {
  const next = `${offset}px`;
  const root = document.documentElement;
  if (root.style.getPropertyValue("--banner-height-extend") === next) return;
  root.style.setProperty("--banner-height-extend", next);
}

/** 与 CSS `100vh` 同基准的视口高度（px）——banner 高度体系 JS 换算的唯一基准。
 *  移动端 Chrome/Safari 的 vh 按「大视口」解析，与 window.innerHeight（动态
 *  视口）相差一个地址栏高度；JS 按 innerHeight 换算会与 CSS 基准错位，表现为
 *  波浪底边与内容背景露缝（修「移动端波浪露缝」，内嵌 WebView 与桌面无此问题）。
 *  实现：临时插入 height:100vh 的隐藏探针读取实际像素（直接采用浏览器解析值，
 *  免区分 lvh/dvh；探测异常回退 innerHeight），结果缓存，视口变化时由
 *  banner-sync 调 invalidateCssVhViewportHeight() 重置。
 *  ⚠️ Layout.astro 两处内联脚本（head 首帧 / 访客覆盖）有同款手写拷贝需同步 */
let cachedVhViewportHeight = 0;

export function cssVhViewportHeight(): number {
  if (cachedVhViewportHeight > 0) return cachedVhViewportHeight;
  const probe = document.createElement("div");
  probe.style.cssText =
    "position:fixed;top:0;left:0;width:0;height:100vh;visibility:hidden;pointer-events:none";
  document.documentElement.appendChild(probe);
  const h = probe.offsetHeight;
  probe.parentNode?.removeChild(probe);
  cachedVhViewportHeight = h > 0 ? h : window.innerHeight;
  return cachedVhViewportHeight;
}

/** 使 cssVhViewportHeight 的缓存失效（视口可能变化时调用）。探测含强制布局
 *  读取，滚动帧高频路径依赖缓存，勿在帧内调用 */
export function invalidateCssVhViewportHeight(): void {
  cachedVhViewportHeight = 0;
}

// 全屏首页波浪下移量在 components.css #wave-container 全屏规则内（translateY
// 追加 +20%）：百分比随 h-28/32/36 断点等比下移，固定像素会留残余实心带；
// 仅全屏首页生效，横幅模式与其他页面保持原样

// The height the main panel overlaps the banner, unit: rem
export const MAIN_PANEL_OVERLAPS_BANNER_HEIGHT = 3.5;

// Page width: rem（两栏总宽 = 内容列 64 + px-4 2 + 侧栏 17.5 + gap 1 = 84.5）
// ⚠️ Layout.astro 内联覆盖到 <html>，改宽度必须同步 variables.css；
// 三栏总宽（103rem）与 TOC 隐藏断点见 components.css
export const PAGE_WIDTH = 84.5;

// Banner 响应式常量
export const BANNER_MIN_HEIGHT_PX = 180;
export const BANNER_TABLET_BREAKPOINT = 768;
export const BANNER_TITLE_MIN_SIZE_REM = 1.8;
export const BANNER_TITLE_MAX_SIZE_REM = 3.5;
export const BANNER_TITLE_VW_MULTIPLIER = 0.007;

// 移动端副标题字号阶梯（断点 → rem）
export const BANNER_SUBTITLE_480 = 1.0;
export const BANNER_SUBTITLE_640 = 1.125;
export const BANNER_SUBTITLE_767 = 1.25;
export const BANNER_SUBTITLE_DEFAULT = 1.5;

// Swup visit:end 恢复延迟（ms）
export const SWUP_VISIT_END_DELAY = 200;
