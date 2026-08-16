// Banner / 波浪 / is-home 同步逻辑（滚动处理见 scroll-manager.ts）。
// 全屏模式（displayMode == 'fullscreen'）由 <html data-banner-display> 标记，
// 与 CSS（components.css / variables.css 的 html[data-banner-display=fullscreen]）
// 同源，不再维护 body.banner-fullscreen class。
// 高度数值的权威定义在 constants.ts（BANNER_HEIGHT / *_EXTEND / *_HOME 等）。
import {
  bannerExtendVh,
  bannerHomeVh,
  calcBannerHeightExtend,
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

// 同步 body.is-home。波浪位置不再由 JS 计算——完全由 CSS 驱动（body.is-home +
// html[data-banner-display] + --banner-height-extend，见 components.css
// #wave-container 系列规则），与网格/横幅同 --dur-banner、同缓动、同帧切换，
// 天然同步开始，无需此前"先 getComputedStyle 再切类"的顺序处理（Safari 首帧
// getComputedStyle 读不到 head 脚本刚写入的延伸量，波浪曾错位）
function syncHomeClass(pathname = window.location.pathname) {
  document.body.classList.toggle("is-home", isHomePath(pathname));
}

// 重算延伸像素写入 CSS 变量。head 内联脚本负责首帧计算（解析期 innerHeight），
// 此处负责运行期响应式（resize）与首屏后纠正。访客可在运行期切换壁纸模式
// （setting-utils 的 applyBannerDisplay 会重写 data-banner-display 并重算延伸），
// 因此每次按 <html data-banner-display> 现场判定模式，而非用模块加载时的快照
function refreshBannerExtend(): void {
  const fullscreen =
    document.documentElement.dataset.bannerDisplay === "fullscreen";
  const offset = calcBannerHeightExtend(
    window.innerHeight,
    bannerExtendVh(fullscreen),
  );
  document.documentElement.style.setProperty(
    "--banner-height-extend",
    `${offset}px`,
  );
}

// Safari 首次导航：解析期 window.innerHeight 与最终视口可能不一致（布局未
// 定型 / 地址栏收展），head 脚本按该值算出的首帧延伸量会偏小，导致波浪/网格
// 首帧错位、且除非刷新否则不会自愈。load 后视口已稳定，重算一次纠正（波浪为
// CSS 变量驱动，改写变量后自动重解析；Chrome 下该值为幂等，无副作用）。
// resize 同理重算；is-home 只与路径相关，由 app.ts 的 init / 换页钩子维护，
// 此处无需重复同步
window.addEventListener("load", refreshBannerExtend);
window.addEventListener("resize", refreshBannerExtend);

export { syncHomeClass, isHomePath };
