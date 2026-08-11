// 滚动 & 窗口调整处理（back-to-top、TOC、导航栏）
import {
  BANNER_HEIGHT,
  BANNER_HEIGHT_HOME,
  MAIN_PANEL_OVERLAPS_BANNER_HEIGHT,
  calcBannerHeightExtend,
} from "../constants/constants";

// 语义化常量，替代硬编码魔法数字
const NAVBAR_HEIGHT_PX = 72; // 导航栏高度（约 4.5rem）
const BASE_SPACING_PX = 16; // 基础间距（1rem = 16px）
// 移动/平板（<1024px / lg）共用抽屉菜单，导航栏不随滚动隐藏；
// 桌面端（≥lg）才启用导航栏滚动隐藏
const MOBILE_BREAKPOINT = 1024;

const bannerEnabled = Boolean(document.getElementById("banner-wrapper"));

const basePath = import.meta.env.BASE_URL.replace(/\/+$/, "");

function syncHomeClass(pathname = window.location.pathname) {
  let normalizedPath = pathname.replace(/\/+$/, "") || "/";
  if (basePath && normalizedPath.startsWith(basePath)) {
    normalizedPath =
      normalizedPath.slice(basePath.length).replace(/\/+$/, "") || "/";
  }
  if (normalizedPath.endsWith("/index.html")) {
    normalizedPath = normalizedPath.slice(0, -"/index.html".length) || "/";
  }
  const isHome = normalizedPath === "/" || normalizedPath === "/index";
  const wave = document.getElementById("wave-container");
  if (wave) {
    // 注意顺序：getComputedStyle 会强制同步样式刷新。若先切 is-home 再读
    // getComputedStyle，grid 的 translate 过渡会在该 flush 时刻启动，而 wave
    // 的 transform 要到下一帧才提交——两条过渡起点错开一帧，缓动前段移动快，
    // 视觉上表现为 wave 先动、先到终点，与下部页面产生间隙。
    // 先读变量（此时样式干净，flush 无副作用）→ wave 与 is-home 同一脏批次
    // 提交，两条过渡同帧开始。
    const ext = getComputedStyle(document.documentElement)
      .getPropertyValue("--banner-height-extend")
      .trim();
    const offset = isHome ? ext : "0px";
    const value = "translateY(calc(-100% + 1px + " + offset + "))";
    // 标准 transform 已覆盖所有现代浏览器（含 Safari 9+），无需 -webkit- 前缀
    wave.style.transform = value;
  }
  document.body.classList.toggle("is-home", isHome);
}

// 缓存 DOM 引用，避免每次 scroll 帧重复 getElementById
// 使用 isConnected 自动检测 Swup 页面切换后的失效引用
let _backToTopBtn: HTMLElement | null = null;
let _toc: HTMLElement | null = null;
let _navbar: HTMLElement | null = null;

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

function scrollFunction() {
  const backToTopBtn = getBackToTopBtn();
  const toc = getToc();
  const navbar = getNavbar();
  const currentBannerHeight = document.body.classList.contains("is-home")
    ? BANNER_HEIGHT_HOME
    : BANNER_HEIGHT;
  const bannerHeightPx = window.innerHeight * (currentBannerHeight / 100);
  const tocRevealHeightPx = window.innerHeight * (BANNER_HEIGHT / 100);

  if (backToTopBtn) {
    backToTopBtn.classList.toggle(
      "hide",
      document.body.scrollTop <= bannerHeightPx &&
        document.documentElement.scrollTop <= bannerHeightPx,
    );
  }

  if (bannerEnabled && toc) {
    toc.classList.toggle(
      "toc-hide",
      document.body.scrollTop <= tocRevealHeightPx &&
        document.documentElement.scrollTop <= tocRevealHeightPx,
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
  navbar.classList.toggle(
    "navbar-hidden",
    document.body.scrollTop >= threshold ||
      document.documentElement.scrollTop >= threshold,
  );
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

window.addEventListener("resize", () => {
  const offset = calcBannerHeightExtend(window.innerHeight);
  document.documentElement.style.setProperty(
    "--banner-height-extend",
    `${offset}px`,
  );
  syncHomeClass();
});

export { scrollFunction, syncHomeClass };
