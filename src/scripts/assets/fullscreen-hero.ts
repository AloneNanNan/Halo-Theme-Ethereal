// 全屏沉浸（hero）布局：滚动模糊斜坡 + 首页标题上移淡出 + 箭头滚动隐藏 +
// 状态切换时的模糊过渡。
//   首页：下滑 300px 内模糊 0 → 最大值（--wallpaper-blur-max，即后台「背景模糊度」，
//         2px 量化避免逐帧重栅格化）；标题 translateY(-scrollY) 抵消滚动（视觉静止）
//         + opacity 淡出，半个视口高内完成；
//   非首页：模糊恒为最大值（CSS fallback 兜底首帧，脚本负责与滑块联动）；
//   箭头：hero 下壁纸钉视口，箭头不会随内容滚出，改滚动超过 100px 加 .hide；
//   过渡：只在状态切换（首页⇄非首页、进出 hero）瞬间挂 filter 过渡窗口，与内容
//         卡片下移同源同缓动；滚动斜坡期间绝不挂（否则模糊拖尾）。
// 变量链：body 的 --transparent-wallpaper-blur → variables.css 的 --wallpaper-blur-max
//   → 脚本读最大值写 --hero-wallpaper-blur 与标题内联样式（components.css 消费）。
// 边界：非首页标题隐藏由 banner-text-hidden 类负责（脚本不碰 display，清内联值让其
//   生效）；访客关闭标题的 opacity:0 !important 优先，无需判断。
import { readDurBannerMs } from "../../utils/dur-banner";

(() => {
  if (typeof window === "undefined" || window.__fullscreenHeroBound) return;
  window.__fullscreenHeroBound = true;

  const BLUR_RAMP_SCROLL = 300; // px：首页下滑该距离后模糊达到最大值
  const BLUR_QUANTIZE_STEP = 2; // px：模糊量化步长
  const TITLE_FADE_RATIO = 0.5; // 半个视口高内标题完全淡出
  const INDICATOR_HIDE_SCROLL = 100; // px：hero 首页滚动超过该距离隐藏向下箭头
  const SMOOTH_TAIL = 100; // ms：过渡窗口比 --dur-banner 多留的余量

  let ticking = false;
  let cachedMaxBlur: number | null = null;
  let lastWrittenBlur = "";
  let lastTitleTransform = "";
  let lastTitleOpacity = "";
  let indicatorHidden = false;
  let smoothTimer: number | null = null;
  let lastState = ""; // "" | "off" | "hero-home" | "hero-other"

  function isHeroFullscreen(): boolean {
    const html = document.documentElement;
    return (
      html.getAttribute("data-banner-display") === "fullscreen" &&
      html.getAttribute("data-fullscreen-layout") === "hero"
    );
  }

  /** 读当前生效的最大模糊（滑块改动后由 MutationObserver 作废缓存） */
  function readMaxBlur(el: HTMLElement): number {
    if (cachedMaxBlur !== null) return cachedMaxBlur;
    const raw = getComputedStyle(el)
      .getPropertyValue("--wallpaper-blur-max")
      .trim();
    const n = parseFloat(raw);
    cachedMaxBlur = Number.isFinite(n) && n > 0 ? n : 0;
    return cachedMaxBlur;
  }

  function writeBlur(el: HTMLElement, value: string): void {
    if (value === lastWrittenBlur) return;
    lastWrittenBlur = value;
    el.style.setProperty("--hero-wallpaper-blur", value);
  }

  function resetBlur(el: HTMLElement): void {
    if (lastWrittenBlur === "") return;
    lastWrittenBlur = "";
    el.style.removeProperty("--hero-wallpaper-blur");
  }

  function writeTitle(transform: string, opacity: string): void {
    const el = document.getElementById("banner-overlay");
    if (!el) return;
    if (transform !== lastTitleTransform) {
      lastTitleTransform = transform;
      el.style.transform = transform;
    }
    if (opacity !== lastTitleOpacity) {
      lastTitleOpacity = opacity;
      el.style.opacity = opacity;
    }
  }

  function resetTitle(): void {
    if (lastTitleTransform === "" && lastTitleOpacity === "") return;
    lastTitleTransform = "";
    lastTitleOpacity = "";
    const el = document.getElementById("banner-overlay");
    if (!el) return;
    el.style.removeProperty("transform");
    el.style.removeProperty("opacity");
  }

  function syncIndicator(shouldHide: boolean): void {
    if (shouldHide === indicatorHidden) return;
    indicatorHidden = shouldHide;
    document
      .getElementById("scroll-down-indicator")
      ?.classList.toggle("hide", shouldHide);
  }

  /** 开一次模糊过渡窗口（.hero-blur-transitioning，见 components.css）：
   *  时长从 --dur-banner 现读（随动画速度档位），与内容卡片下移同源同缓动，
   *  保证模糊散尽与卡片落位同时完成（毫秒换算的 CSSOM 陷阱见 dur-banner.ts） */
  function smoothTransition(): void {
    const root = document.documentElement;
    const window_ = readDurBannerMs(root) + SMOOTH_TAIL;
    root.classList.add("hero-blur-transitioning");
    if (smoothTimer !== null) window.clearTimeout(smoothTimer);
    smoothTimer = window.setTimeout(() => {
      smoothTimer = null;
      root.classList.remove("hero-blur-transitioning");
    }, window_);
  }

  /** 状态机：hero / home 变化（首页⇄非首页、进入/离开 hero 全屏）的那一帧开
   *  过渡窗口，首次同步不挂（首帧就是最终值，挂过渡反而多一次可见渐变）；
   *  返回本帧的 hero / home 供 sync 的分支复用。sync（滚动帧）与
   *  refresh（事件 / MutationObserver）两个入口共用同一份幂等判断 */
  function reconcileState(): { hero: boolean; home: boolean } {
    const hero = isHeroFullscreen();
    const home = document.body.classList.contains("is-home");
    const state = !hero ? "off" : home ? "hero-home" : "hero-other";
    if (state !== lastState) {
      if (lastState !== "") smoothTransition();
      lastState = state;
    }
    return { hero, home };
  }

  function sync(): void {
    const wrapper = document.getElementById("banner-wrapper");
    if (!wrapper) return;

    const { hero, home } = reconcileState();
    const scrollY = window.pageYOffset || document.documentElement.scrollTop;

    syncIndicator(hero && home && scrollY > INDICATOR_HIDE_SCROLL);

    if (!hero) {
      resetBlur(wrapper);
      resetTitle();
      return;
    }

    if (!home) {
      // 非首页：固定最大模糊（与 CSS fallback 同值），标题交回既有隐藏逻辑
      writeBlur(wrapper, `${readMaxBlur(wrapper)}px`);
      resetTitle();
      return;
    }

    // 首页：模糊斜坡 + 标题原地淡出
    const max = readMaxBlur(wrapper);
    const ratio = Math.min(scrollY / BLUR_RAMP_SCROLL, 1);
    writeBlur(
      wrapper,
      `${Math.floor((ratio * max) / BLUR_QUANTIZE_STEP) * BLUR_QUANTIZE_STEP}px`,
    );

    const fade = window.innerHeight * TITLE_FADE_RATIO;
    const titleRatio = fade > 0 ? Math.min(scrollY / fade, 1) : 0;
    writeTitle(`translateY(${-scrollY}px)`, String(1 - titleRatio));
  }

  function frame(): void {
    ticking = false;
    sync();
  }

  function request(): void {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(frame);
  }

  /** 只重算（供 body 的 style / class 变化与换页钩子使用） */
  const refresh = (): void => {
    cachedMaxBlur = null;
    // 状态变化立即开过渡窗口（不排 rAF）：与 app.ts 切 body.is-home / 挂
    // home-switch 处于同一个 task，模糊过渡与卡片下移同帧起跑、同 --dur-banner
    // 同缓动 → 模糊散尽的那一刻正是卡片落位的那一刻
    reconcileState();
    request();
  };

  window.addEventListener("scroll", request, { passive: true });
  // 壁纸模式 / 全屏布局切换（setting-utils 的 apply* 派发同名事件）
  window.addEventListener("bannerModeChange", refresh);
  window.addEventListener("fullscreenLayoutChange", refresh);

  // body 的 style（applyWallpaperParams 直接改内联变量、不派发事件）与 class
  // （is-home 切换等）变化都需要重算：前者作废最大模糊缓存，
  // 后者决定走首页斜坡还是非首页固定值
  const observer = new MutationObserver(refresh);
  observer.observe(document.body, {
    attributes: true,
    attributeFilter: ["style", "class"],
  });

  // Swup 换页：content:replace 时 is-home 未必已切换（横幅模式刻意延后到
  // page:view 才整体滑动），三个钩子都挂一遍，靠记忆化写入避免重复开销
  const hooks = window.swup?.hooks;
  hooks?.on("content:replace", refresh);
  hooks?.on("page:view", refresh);
  hooks?.on("animation:in:end", refresh);

  sync(); // 初始同步（浏览器可能恢复了上次的滚动位置）
})();
