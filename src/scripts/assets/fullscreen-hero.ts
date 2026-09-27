// 全屏 hero 壁纸特效 —— 运动模型 1:1 移植 onlynn（Layout 内联脚本 le()，
// "标题纯淡出 + 壁纸模糊渐变"的柔和观感），模糊 max 改读主题设置（onlynn 原版
// 常量 12px/8px 提升为后台可配 heroBlurMax/heroInnerBlur）：
// - 首页：下滑 0.6 视口高内 壁纸模糊 0→heroBlurMax（2px 量化）+ 标题透明度 1→0（0.05 量化）；
//   标题不做位移（onlynn 无 translateY 视差，壁纸 fixed 钉屏、标题原地淡出）
// - 非首页：CSS 固定 --hero-inner-blur（onlynn 原版 8px，body th:style 注入）
// - 非全屏/非 hero：两变量移除复位
// 变量链：后台 settings → body th:style（--hero-wallpaper-blur-max / --hero-inner-blur）
// → 本脚本滚动写 html（--hero-wallpaper-blur / --hero-title-opacity）→ components.css 消费。
// 「背景模糊度」(wallpaperBlur) 仅作用于全屏透明模式，hero 不再消费它。
(() => {
  if (typeof window === "undefined" || window.__fullscreenHeroBound) return;
  window.__fullscreenHeroBound = true;

  const HERO_FADE_RATIO = 0.6; // onlynn te：下滑 0.6 视口高完成淡出/模糊到顶
  const BLUR_QUANTIZE_STEP = 2; // onlynn re：模糊 2px 量化，避免全屏 blur 逐帧重栅格化
  const OPACITY_QUANTIZE_STEP = 0.05; // onlynn ie：标题透明度 0.05 量化
  const html = document.documentElement;
  const body = document.body;

  let ticking = false;
  let lastBlur = -1; // 上次实际写入的 --hero-wallpaper-blur（px），-1=未设置
  let lastOpacity = -1; // 上次实际写入的 --hero-title-opacity，-1=未设置

  function isHeroFullscreen() {
    return (
      html.getAttribute("data-banner-display") === "fullscreen" &&
      html.getAttribute("data-fullscreen-layout") === "hero"
    );
  }

  // 首页模糊封顶：body 注入的设置值（onlynn 原版常量 12px → heroBlurMax 设置）
  function readHeroBlurMax(): number {
    const raw = getComputedStyle(body)
      .getPropertyValue("--hero-wallpaper-blur-max")
      .trim();
    const max = parseFloat(raw);
    return Number.isFinite(max) && max >= 0 ? max : 12;
  }

  function setHeroBlur(value: number) {
    if (value === lastBlur) return;
    lastBlur = value;
    if (value <= 0) html.style.removeProperty("--hero-wallpaper-blur");
    else html.style.setProperty("--hero-wallpaper-blur", `${value}px`);
  }
  function setTitleOpacity(value: number) {
    if (value === lastOpacity) return;
    lastOpacity = value;
    if (value >= 1) html.style.removeProperty("--hero-title-opacity");
    else html.style.setProperty("--hero-title-opacity", String(value));
  }

  // onlynn le() 1:1：滚动位置 → 模糊斜坡 + 标题纯淡出（不做位移）
  function syncHeroScroll(scrollY: number) {
    if (!isHeroFullscreen()) {
      setHeroBlur(0);
      setTitleOpacity(1);
      return;
    }
    const fade = window.innerHeight * HERO_FADE_RATIO;
    const ratio = fade > 0 ? Math.min(1, Math.max(0, scrollY / fade)) : 0;
    const max = readHeroBlurMax();
    // 模糊：0→max 连续渐变（量化 2px）
    setHeroBlur(
      Math.round((ratio * max) / BLUR_QUANTIZE_STEP) * BLUR_QUANTIZE_STEP,
    );
    // 标题：透明度 1→0 渐变（量化 0.05），位置不动
    setTitleOpacity(
      Math.round((1 - ratio) / OPACITY_QUANTIZE_STEP) * OPACITY_QUANTIZE_STEP,
    );
  }

  // 复位（onlynn setting-utils N() 同款：模式/布局切换时清掉两个变量，交回 CSS 默认）
  function resetHeroVars() {
    setHeroBlur(0);
    setTitleOpacity(1);
  }

  function frame() {
    ticking = false;
    const scrollY = window.pageYOffset || html.scrollTop;
    syncHeroScroll(scrollY);
  }
  function request() {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(frame);
    }
  }

  window.addEventListener("scroll", request, { passive: true });
  // 壁纸模式 / 全屏布局切换：复位变量（CSS 层按新状态生效）
  window.addEventListener("bannerModeChange", resetHeroVars);
  window.addEventListener("fullscreenLayoutChange", () => {
    resetHeroVars();
    request();
  });
  // 面板滑块变化（背景模糊度→hero 封顶值）实时重算斜坡
  window.addEventListener("wallpaperParamsChanged", request);
  // Swup v4 换页重算（首页↔非首页 body.is-home 变化后按当前滚动位置同步）
  document.addEventListener("swup:enable", () => {
    const swup = (
      window as unknown as {
        swup?: { hooks?: { on(hook: string, fn: () => void): void } };
      }
    ).swup;
    swup?.hooks?.on("content:replace", request);
  });

  frame(); // 初始（浏览器可能恢复滚动位置）
})();
