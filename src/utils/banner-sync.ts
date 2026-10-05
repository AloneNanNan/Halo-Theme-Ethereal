// Banner / 波浪 / is-home 同步逻辑（滚动处理见 scroll-manager.ts）。
// 全屏模式（displayMode == 'fullscreen'）由 <html data-banner-display> 标记，
// 与 CSS（components.css / variables.css 的 html[data-banner-display=fullscreen]）
// 同源，不再维护 body.banner-fullscreen class。
// 高度数值的权威定义在 constants.ts（BANNER_HEIGHT / *_EXTEND / *_HOME 等）。
import {
  bannerExtendVh,
  bannerHomeVh,
  calcBannerHeightExtend,
  cssVhViewportHeight,
  invalidateCssVhViewportHeight,
  writeBannerHeightExtend,
} from "../constants/constants";

// 首页 banner 高度随 <html data-banner-display> 推导（全屏 100vh / 横幅 65vh）。访客可
// 运行期切换壁纸模式，故一律现场读取、不缓存加载时快照（refreshBannerExtend 同此约定）。
function isFullscreenBanner(): boolean {
  return document.documentElement.dataset.bannerDisplay === "fullscreen";
}

/** 首页 banner 高度（vh）：按当前模式实时计算，供滚动逻辑消费 */
export function bannerHomeHeight(): number {
  return bannerHomeVh(isFullscreenBanner());
}

const basePath = import.meta.env.BASE_URL.replace(/\/+$/, "");

// 按路径判定是否首页（供 syncHomeClass 与换页前预判 is-home 变化共用）
function isHomePath(pathname = window.location.pathname): boolean {
  let normalizedPath = pathname.replace(/\/+$/, "") || "/";
  if (basePath && normalizedPath.startsWith(basePath)) {
    normalizedPath =
      normalizedPath.slice(basePath.length).replace(/\/+$/, "") || "/";
  }
  if (normalizedPath.endsWith("/index.html")) {
    normalizedPath = normalizedPath.slice(0, -"/index.html".length) || "/";
  }
  return normalizedPath === "/" || normalizedPath === "/index";
}

/** 即将发生的换页是否会改变 is-home（调用时机敏感）：横幅模式的 is-home 延后到
 *  page:view 才切换，URL 已更新的换页途中用「路径 vs 当前 body 类」比对可预判；
 *  全屏模式已在 content:replace 提前切换，此后调用恒为 false（此时只能认
 *  home-switch 类，见 app.ts 的换页回顶判定） */
function isHomeSwitching(): boolean {
  return isHomePath() !== document.body.classList.contains("is-home");
}

// 同步 body.is-home。波浪位置完全由 CSS 驱动（body.is-home + data-banner-display +
// --banner-height-extend，见 components.css），与网格/横幅同 --dur-banner 同帧切换，
// 无需 JS 顺序处理（Safari 首帧 getComputedStyle 读不到 head 刚写入的值）。
function syncHomeClass(pathname = window.location.pathname) {
  document.body.classList.toggle("is-home", isHomePath(pathname));
}

// 重算延伸像素写入 CSS 变量（head 内联脚本负责首帧，此处负责运行期响应式与兜底）。
// 基准为 cssVhViewportHeight()（勿换 innerHeight——地址栏收展会让基准错位露缝）；
// 按 data-banner-display 现场判定，不用加载时快照。
function refreshBannerExtend(): void {
  const fullscreen =
    document.documentElement.dataset.bannerDisplay === "fullscreen";
  writeBannerHeightExtend(
    calcBannerHeightExtend(cssVhViewportHeight(), bannerExtendVh(fullscreen)),
  );
}

// load 后重算一次兜底（先失效探针缓存；写守卫保证相同值零扰动）。resize 防抖 200ms：
// 移动端滚动时地址栏收展近每帧触发 resize，而重算含强制布局的探针，逐次处理会卡顿。
let resizeDebounceTimer = 0;
window.addEventListener("load", () => {
  invalidateCssVhViewportHeight();
  refreshBannerExtend();
});
window.addEventListener("resize", () => {
  window.clearTimeout(resizeDebounceTimer);
  resizeDebounceTimer = window.setTimeout(() => {
    resizeDebounceTimer = 0;
    invalidateCssVhViewportHeight();
    refreshBannerExtend();
  }, 200);
});

export { syncHomeClass, isHomePath, isHomeSwitching };
