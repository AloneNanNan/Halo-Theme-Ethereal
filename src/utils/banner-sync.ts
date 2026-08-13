// Banner / 波浪 / is-home 同步逻辑（滚动处理见 scroll-manager.ts）。
// 全屏模式（displayMode == 'fullscreen'）由 <html data-banner-display> 标记，
// 与 CSS（components.css / variables.css 的 html[data-banner-display=fullscreen]）
// 同源，不再维护 body.banner-fullscreen class。
// 高度数值的权威定义在 constants.ts（BANNER_HEIGHT / *_EXTEND / *_HOME 等）。
import {
  bannerExtendVh,
  bannerHomeVh,
  calcBannerHeightExtend,
  FULLSCREEN_WAVE_DOWNSHIFT,
} from "../constants/constants";

// 全屏模式由 <html data-banner-display> 标记；首页 banner 高度 / 延伸高度
// 随模式推导（全屏 100vh / 横幅 65vh）
const bannerFullscreen =
  document.documentElement.dataset.bannerDisplay === "fullscreen";
export const bannerHomeHeight = bannerHomeVh(bannerFullscreen);
export const bannerExtendHeight = bannerExtendVh(bannerFullscreen);

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

// wave 位于 Layout（Swup 容器外）跨页持久，缓存引用即可；
// isConnected 自动检测换页后的失效引用（与 scroll-manager 的缓存同模式）
let _wave: HTMLElement | null = null;
function getWave() {
  if (!_wave?.isConnected) _wave = document.getElementById("wave-container");
  return _wave;
}

function syncHomeClass(pathname = window.location.pathname) {
  const isHome = isHomePath(pathname);
  const wave = getWave();
  if (wave) {
    // 注意顺序：getComputedStyle 会强制同步样式刷新。若先切 is-home 再读
    // getComputedStyle，grid 的 translate 过渡会在该 flush 时刻启动，而 wave
    // 的 transform 要到下一帧才提交——两条过渡起点错开一帧，缓动前段移动快，
    // 视觉上表现为 wave 先动、先到终点，与下部页面产生间隙。
    // 先读变量（此时样式干净，flush 无副作用）→ wave 与 is-home 同一脏批次
    // 提交，两条过渡同帧开始。
    const cs = getComputedStyle(document.documentElement);
    const ext = cs.getPropertyValue("--banner-height-extend").trim();
    // 覆盖量读取与 components.css #wave-container 基值同一变量
    // （--wave-cover-offset），避免两处各自写死数值而失步；
    // "4px" 回退与 variables.css :root 默认值一致
    const cover = cs.getPropertyValue("--wave-cover-offset").trim() || "4px";
    const offset = isHome ? ext : "0px";
    const downshift =
      isHome && bannerFullscreen ? ` + ${FULLSCREEN_WAVE_DOWNSHIFT}` : "";
    // cover 保证波浪底边恒盖过 banner 底边（100vh）：banner 底边已用与
    // --banner-height-extend 相同的像素值精确落在 100vh，而波浪底 =
    // 35vh + extend + 余量；取整（向下取 BANNER_EXTEND_ROUNDING 倍数）会使
    // 余量不足时露出 1~2px banner 图片缝
    const value = `translateY(calc(-100% + ${cover} + ${offset}${downshift}))`;
    wave.style.transform = value;
  }
  document.body.classList.toggle("is-home", isHome);
}

// 视口变化时重算延伸像素并重新同步波浪（Layout.astro head 内联脚本负责首帧
// 计算，此处负责运行期响应式，两处同用 calcBannerHeightExtend 的公式）
window.addEventListener("resize", () => {
  const offset = calcBannerHeightExtend(window.innerHeight, bannerExtendHeight);
  document.documentElement.style.setProperty(
    "--banner-height-extend",
    `${offset}px`,
  );
  syncHomeClass();
});

export { syncHomeClass, isHomePath };
