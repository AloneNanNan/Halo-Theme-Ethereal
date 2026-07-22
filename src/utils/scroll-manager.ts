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
const MOBILE_BREAKPOINT = 768;

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
  document.body.classList.toggle("is-home", isHome);
  const wave = document.getElementById("wave-container");
  if (wave) {
    const ext = getComputedStyle(document.documentElement)
      .getPropertyValue("--banner-height-extend")
      .trim();
    const offset = isHome ? ext : "0px";
    const value = "translateY(calc(-100% + 1px + " + offset + "))";
    wave.style.transform = value;
    wave.style.webkitTransform = value;
  }
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
