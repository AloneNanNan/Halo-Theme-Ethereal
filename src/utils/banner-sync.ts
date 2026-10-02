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

// 全屏模式由 <html data-banner-display> 标记；首页 banner 高度随模式推导
// （全屏 100vh / 横幅 65vh）。访客可在运行期切换壁纸模式（setting-utils 的
// applyBannerDisplay 会改写 data-banner-display），因此一律现场读取、不缓存
// 模块加载时的快照（refreshBannerExtend 同此约定）
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

// 同步 body.is-home。波浪位置不再由 JS 计算——完全由 CSS 驱动（body.is-home +
// html[data-banner-display] + --banner-height-extend，见 components.css
// #wave-container 系列规则），与网格/横幅同 --dur-banner、同缓动、同帧切换，
// 天然同步开始，无需此前"先 getComputedStyle 再切类"的顺序处理（Safari 首帧
// getComputedStyle 读不到 head 脚本刚写入的延伸量，波浪曾错位）
function syncHomeClass(pathname = window.location.pathname) {
  document.body.classList.toggle("is-home", isHomePath(pathname));
}

// 重算延伸像素写入 CSS 变量。head 内联脚本负责首帧计算，此处负责运行期
// 响应式（resize / 旋屏）与首屏后兜底纠正。换算基准为 cssVhViewportHeight()
// （与 CSS 100vh 同基准，见其注释——历史上此处用 window.innerHeight，
// 是「地址栏收展导致基准错位、波浪露缝」的根源，已修复）。访客可在运行期
// 切换壁纸模式（setting-utils 的 applyBannerDisplay 会重写 data-banner-display
// 并重算延伸），因此每次按 <html data-banner-display> 现场判定模式，
// 而非用模块加载时的快照
function refreshBannerExtend(): void {
  const fullscreen =
    document.documentElement.dataset.bannerDisplay === "fullscreen";
  writeBannerHeightExtend(
    calcBannerHeightExtend(cssVhViewportHeight(), bannerExtendVh(fullscreen)),
  );
}

// load 后重算一次作兜底：极早期（head 解析期 / app.ts 顶层）若探针受布局
// 未定型影响读到异常值，load 时视口已稳定——先失效探针缓存再重算纠正
// （波浪为 CSS 变量驱动，改写变量后自动重解析；幂等；写守卫保证相同值
// 零扰动）。
// resize 防抖 200ms 尾触发：移动端 Safari/Chrome 滚动时地址栏收展会以近每帧
// 的频率连续触发 resize，而重算含探针（强制布局读取）——逐次处理会让滚动
// 期间每帧强制布局（引入新卡顿）；防抖到风暴结束只处理一次，配合写守卫对
// 页面零扰动。旋屏等单次 resize 延迟 200ms 生效，可接受。
// is-home 只与路径相关，由 app.ts 的 init / 换页钩子维护，此处无需重复同步
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
