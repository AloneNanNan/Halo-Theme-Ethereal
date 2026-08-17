// 滚动 & 窗口调整处理（back-to-top、TOC、导航栏）。
// banner/波浪/is-home 同步逻辑在 banner-sync.ts（含 resize 重算延伸高度）。
import {
  BANNER_HEIGHT,
  MAIN_PANEL_OVERLAPS_BANNER_HEIGHT,
} from "../constants/constants";
import { bannerHomeHeight } from "./banner-sync";

// 语义化常量，替代硬编码魔法数字
// 导航栏高度（4.5rem × 16px），与 CSS 变量 --navbar-height 对应（variables.css）
const NAVBAR_HEIGHT_PX = 72;
const BASE_SPACING_PX = 16; // 基础间距（1rem = 16px）
// 移动/平板（<1024px / lg）共用抽屉菜单，导航栏不随滚动隐藏；
// 桌面端（≥lg）才启用导航栏滚动隐藏
const MOBILE_BREAKPOINT = 1024;

const bannerEnabled = Boolean(document.getElementById("banner-wrapper"));

// 缓存 DOM 引用，避免每次 scroll 帧重复 getElementById
// 使用 isConnected 自动检测 Swup 页面切换后的失效引用
let _backToTopBtn: HTMLElement | null = null;
let _toc: HTMLElement | null = null;
let _navbar: HTMLElement | null = null;
let _grid: HTMLElement | null = null;

function getBackToTopBtn() {
  if (!_backToTopBtn?.isConnected)
    _backToTopBtn = document.getElementById("back-to-top-btn");
  return _backToTopBtn;
}
function getToc() {
  if (!_toc?.isConnected) _toc = document.getElementById("toc-wrapper");
  return _toc;
}
function getNavbar() {
  if (!_navbar?.isConnected)
    _navbar = document.getElementById("navbar-wrapper");
  return _navbar;
}
function getGrid() {
  if (!_grid?.isConnected) _grid = document.getElementById("main-grid");
  return _grid;
}

function scrollFunction() {
  const backToTopBtn = getBackToTopBtn();
  const toc = getToc();
  const navbar = getNavbar();
  const currentBannerHeight = document.body.classList.contains("is-home")
    ? bannerHomeHeight()
    : BANNER_HEIGHT;
  const bannerHeightPx = window.innerHeight * (currentBannerHeight / 100);
  const tocRevealHeightPx = window.innerHeight * (BANNER_HEIGHT / 100);

  // 先读后写分离：所有布局读取（scrollY）在脚本最前一次性完成，之后仅写
  // class/属性——避免每帧「读 scrollTop → 写 class → 再读」的交错强制重排。
  // window.scrollY 在标准滚动容器（html/body）下等价于双 scrollTop 读取
  const scrollY = window.scrollY;

  if (backToTopBtn) {
    backToTopBtn.classList.toggle("hide", scrollY <= bannerHeightPx);
  }

  // 目录门控仅横幅/全屏模式启用（与 components.css 的
  // html[data-banner-display=...]:not(.toc-revealed) #toc-wrapper 同源）：
  // 视口在顶部横幅区（≤35vh）隐藏，滚动超过后给 <html> 加 .toc-revealed 解除；
  // disabled/transparent 模式目录恒显，清除两处隐藏状态（切回横幅模式时
  // 由 bannerModeChange 监听立即重算）
  if (toc) {
    const bannerDisplay = document.documentElement.dataset.bannerDisplay;
    const tocGated =
      bannerDisplay === "banner" || bannerDisplay === "fullscreen";
    const atTop = scrollY <= tocRevealHeightPx;
    toc.classList.toggle("toc-hide", tocGated && atTop);
    document.documentElement.classList.toggle(
      "toc-revealed",
      tocGated && !atTop,
    );
  }

  if (window.innerWidth < MOBILE_BREAKPOINT) return;
  if (!bannerEnabled || !navbar) return;
  // 固定导航栏模式：跳过隐藏逻辑，始终显示
  if (document.documentElement.dataset.navbarFixed === "true") return;
  // threshold = bannerHeightPx - navbarHeight - panelOverlap(rem→px) - baseSpacing
  const threshold =
    bannerHeightPx -
    NAVBAR_HEIGHT_PX -
    MAIN_PANEL_OVERLAPS_BANNER_HEIGHT * BASE_SPACING_PX -
    BASE_SPACING_PX;
  navbar.classList.toggle("navbar-hidden", scrollY >= threshold);
}

// 全屏首页向下箭头（#scroll-down-indicator）点击目标：手算平滑滚动到内容区。
// 落点 = 网格顶边 − 首页间距（--banner-home-content-gap）− 固定导航栏高度，
// 使"页面背景顶部边缘"（banner 底边，100vh）对齐视口顶部而非网格顶边。
// Chrome 平滑 scrollIntoView 会忽略 scroll-margin，故必须手算；间距直接读
// CSS 变量（rem）按根字号换算 px，不再借用 scroll-margin-top 传值（语义扭曲）。
// 固定导航栏（html[data-navbar-fixed="true"]）常驻顶部且滚动后不隐藏，落点需
// 再上移导航栏高度使"导航栏底边"对齐页面背景顶部边缘；高度动态测量（移动端
// 强制固定，断点间可能不同），非固定模式为 0（导航栏滚动后自动隐藏，无需让位）
export function scrollDownToContent(): void {
  const grid = getGrid();
  if (!grid) return;
  const cs = getComputedStyle(document.documentElement);
  const gap =
    (parseFloat(cs.getPropertyValue("--banner-home-content-gap")) || 0) *
    (parseFloat(cs.fontSize) || 16);
  const navbarOffset =
    document.documentElement.dataset.navbarFixed === "true"
      ? getNavbar()?.getBoundingClientRect().height || 0
      : 0;
  window.scrollTo({
    top: window.scrollY + grid.getBoundingClientRect().top - gap - navbarOffset,
    behavior: "smooth",
  });
}

let scrollTicking = false;
window.addEventListener("scroll", function () {
  if (!scrollTicking) {
    requestAnimationFrame(function () {
      scrollFunction();
      scrollTicking = false;
    });
    scrollTicking = true;
  }
});

// 访客切换壁纸模式（setting-utils 的 applyBannerDisplay 派发）后立即重算
// 目录显隐：切到横幅/全屏模式且视口在顶部时需补挂隐藏（toc-hide + 无
// toc-revealed），切到 disabled/transparent 时清除隐藏状态
window.addEventListener("bannerModeChange", scrollFunction);

export { scrollFunction };
