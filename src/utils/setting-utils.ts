import {
  AUTO_MODE,
  DARK_MODE,
  DEFAULT_THEME,
  LIGHT_MODE,
  bannerExtendVh,
  calcBannerHeightExtend,
} from "../constants/constants.ts";
import type { LIGHT_DARK_MODE } from "../types/config";
import { readDurBannerMs } from "./dur-banner";

let restoreTransitionFrame = 0;

function withoutThemeTransition(applyTheme: () => void) {
  const root = document.documentElement;
  root.classList.add("theme-switching");
  if (restoreTransitionFrame) {
    cancelAnimationFrame(restoreTransitionFrame);
  }

  applyTheme();

  // Force style recalculation while transitions are disabled, then restore
  // transitions after the final theme colors are already committed.
  root.getBoundingClientRect();
  restoreTransitionFrame = requestAnimationFrame(() => {
    restoreTransitionFrame = requestAnimationFrame(() => {
      root.classList.remove("theme-switching");
      restoreTransitionFrame = 0;
    });
  });
}

export function getDefaultHue(): number {
  const fallback = "250";
  const configCarrier = document.getElementById("config-carrier");
  return Number.parseInt(configCarrier?.dataset.hue || fallback, 10);
}

export function isHueFixed(): boolean {
  const configCarrier = document.getElementById("config-carrier");
  return (
    configCarrier?.dataset.hueFixed === "true" ||
    document.documentElement.dataset.hueFixed === "true"
  );
}

export function getHue(): number {
  if (isHueFixed()) {
    return getDefaultHue();
  }
  const stored = localStorage.getItem("hue");
  return stored ? Number.parseInt(stored, 10) : getDefaultHue();
}

export function setHue(hue: number): void {
  const nextHue = isHueFixed() ? getDefaultHue() : hue;
  if (!isHueFixed()) {
    localStorage.setItem("hue", String(nextHue));
  }
  const r = document.querySelector(":root") as HTMLElement;
  if (!r) {
    return;
  }
  r.style.setProperty("--hue", String(nextHue));
}

/** 解析模式的最终明暗：AUTO 跟随系统偏好 */
export function resolveSchemeDark(theme: LIGHT_DARK_MODE): boolean {
  if (theme === DARK_MODE) {
    return true;
  }
  if (
    theme === AUTO_MODE &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  ) {
    return true;
  }
  return false;
}

export function applyThemeToDocument(theme: LIGHT_DARK_MODE) {
  const root = document.documentElement;
  const wantDark = resolveSchemeDark(theme);
  // 始终同步 colorScheme（幂等赋值，开销可忽略），提示浏览器原生控件配色
  root.style.colorScheme = wantDark ? "dark" : "light";
  // 实际渲染主题未变化时直接返回：跳过强制 reflow 与过渡禁用，
  // 避免固定模式与系统主题间切换时（如系统为暗色时在"暗色"与"系统"间切换）
  // 的无效重载卡顿
  if (root.classList.contains("dark") === wantDark) {
    return;
  }
  withoutThemeTransition(() => {
    root.classList.toggle("dark", wantDark);
  });
}

// 当前配色模式（用于系统变化监听）
let currentColorScheme: LIGHT_DARK_MODE = DEFAULT_THEME;

export function setTheme(theme: LIGHT_DARK_MODE, store = false): void {
  currentColorScheme = theme;
  if (store) {
    localStorage.setItem("theme", theme);
    localStorage.setItem("__user_chose_theme", "1");
  }
  applyThemeToDocument(theme);
}

// 系统配色变化时自动响应（参考 earth 主题）
window
  .matchMedia("(prefers-color-scheme: dark)")
  .addEventListener("change", () => {
    if (currentColorScheme === AUTO_MODE) {
      applyThemeToDocument(AUTO_MODE);
    }
  });

export function getStoredTheme(): LIGHT_DARK_MODE {
  // 读取并校验 Thymeleaf 注入的后台配置
  var rawEcs = (window as any).__ecs;
  var rawEecs = (window as any).__eecs;

  var defaultScheme =
    rawEcs != null &&
    (rawEcs === LIGHT_MODE || rawEcs === DARK_MODE || rawEcs === AUTO_MODE)
      ? (rawEcs as LIGHT_DARK_MODE)
      : DEFAULT_THEME;

  var enableChange = rawEecs != null ? rawEecs : true;

  // 不允许切换时忽略 localStorage，始终用后台默认
  if (!enableChange) {
    return defaultScheme;
  }

  // 允许切换时：仅当用户手动选择过才读取 localStorage，否则始终用后台默认
  if (localStorage.getItem("__user_chose_theme")) {
    return (localStorage.getItem("theme") as LIGHT_DARK_MODE) || defaultScheme;
  }
  return defaultScheme;
}

/* ── 访客样式切换（显示设置面板） ─────────────────────────────
 * localStorage 键：postListLayout / cardBorder / cardFollowTheme / navbarBlur /
 *   postListMasonry / wallpaperOpacity / wallpaperBlur / wallpaperCardAlpha /
 *   bannerDisplay / bannerWave / sakuraEnabled
 * 默认值链路：后台 theme.config → ConfigCarrier data 属性 → 本模块读取；
 * 开关为标签页级（外观/壁纸/特效），关闭时忽略并清理该标签页相关的 localStorage
 * （与 fixed 色调、__eecs 语义一致）。
 * public/assets/visitor-post-layout.js、public/assets/sakura.js 与 Layout.astro
 * 的 body 启动脚本也读这些键做首帧应用，改键名时需多处同步。
 */

export type PostListLayoutMode = "list" | "grid";

export interface VisitorSwitches {
  enable: boolean;
  appearance: boolean;
  wallpaper: boolean;
  effects: boolean;
}

function getCarrier(): HTMLElement | null {
  return document.getElementById("config-carrier");
}

/** ConfigCarrier 布尔属性缺省视为 true（与模板 `!= false` 语义一致） */
function carrierBool(name: string, fallback: boolean): boolean {
  const raw = getCarrier()?.dataset?.[name];
  if (raw == null || raw === "") return fallback;
  return raw === "true";
}

let cachedVisitorSwitches: VisitorSwitches | null = null;

function readVisitorSwitches(): VisitorSwitches {
  const enable = carrierBool("visitorEnable", true);
  return {
    enable,
    appearance: enable && carrierBool("visitorAppearance", true),
    wallpaper: enable && carrierBool("visitorWallpaper", true),
    effects: enable && carrierBool("visitorEffects", true),
  };
}

/** 访客开关结果缓存：ConfigCarrier 的 data 属性是服务端静态值、运行期不变，
 *  避免每个 getStored* 各自重复读取（每次都要 getElementById + 逐字段判断） */
export function getVisitorSwitches(): VisitorSwitches {
  if (!cachedVisitorSwitches) cachedVisitorSwitches = readVisitorSwitches();
  return cachedVisitorSwitches;
}

/* ── 文章布局（列表/网格） ── */

// 出场动画期间暂存的待应用动作：快速连点布局/瀑布流时不再丢弃，
// 出场结束后按序一并应用（同一操作的多次切换以最后一次为准）
let pendingLayoutActions: Array<() => void> = [];

/** 完整的内容区出场→入场过渡：切换列表/网格或瀑布流时，
 *  1) 给 #content-wrapper 挂 content-exit-animating 播旧内容淡出下滑动画；
 *  2) 出场结束后按序应用所有待执行动作（首个动作入队在前、出场期间新到达的
 *     追加在后，保证后点的最后一次切换生效）；
 *  3) 再挂 content-entrance-animating 重放与页面入场同款的 fade-in-up 动画
 *     （含 --content-delay 错峰），入场结束摘除类。
 *  入场用独立类而非 onload-animation：后者会被 app.ts 的 animationend 委托
 *  在同一事件里立即移除（出场动画结束的事件冒泡到 document 时新类已挂上），
 *  导致入场无法播放。 */
function triggerContentTransition(afterExit: () => void): void {
  const content = document.getElementById("content-wrapper");
  if (!content) return;
  // 出场动画进行中：追加待执行动作，出场结束后一并应用（不丢操作）
  if (content.classList.contains("content-exit-animating")) {
    pendingLayoutActions.push(afterExit);
    return;
  }
  // 新一段过渡开始：清掉可能因中途换页残留的旧动作（旧元素的 animationend
  // 不会触发，避免把上一次的布局动作误应用到新页面），并把首个动作入队——
  // 这样出场期间新到的动作追加在后，出场结束时按序执行、最后一次切换生效
  pendingLayoutActions = [];
  pendingLayoutActions.push(afterExit);
  content.classList.remove("content-entrance-animating");
  void content.offsetWidth;
  content.classList.add("content-exit-animating");
  content.addEventListener(
    "animationend",
    () => {
      content.classList.remove("content-exit-animating");
      const actions = pendingLayoutActions;
      pendingLayoutActions = [];
      actions.forEach((a) => a());
      void content.offsetWidth;
      content.classList.add("content-entrance-animating");
      content.addEventListener(
        "animationend",
        () => content.classList.remove("content-entrance-animating"),
        { once: true },
      );
    },
    { once: true },
  );
}

export function getStoredPostListLayout(): PostListLayoutMode | null {
  if (!getVisitorSwitches().appearance) return null;
  const stored = localStorage.getItem("postListLayout");
  return stored === "list" || stored === "grid" ? stored : null;
}

export function applyPostListLayout(mode: PostListLayoutMode): void {
  const container = document.getElementById("post-list-container");
  if (!container) return;
  // 过渡进行中：交给队列按序应用（此时容器仍是旧态，不能按容器判断「已相同」，
  // 否则快速连点回旧布局会被误判为无需切换而丢操作）
  const transitioning = document
    .getElementById("content-wrapper")
    ?.classList.contains("content-exit-animating");
  if (!transitioning) {
    const isGridNow = container.classList.contains("post-grid-mode");
    if ((mode === "grid") === isGridNow) return; // 已是目标布局，无需切换
  }
  triggerContentTransition(() => {
    container.classList.toggle("post-grid-mode", mode === "grid");
    container.classList.toggle("post-list-mode", mode === "list");
    // 布局类变化后触发瀑布流重排/复位（post-list-layout.js 暴露的入口）
    (window as any).__postListRelayout?.();
  });
}

export function setPostListLayout(mode: PostListLayoutMode): void {
  localStorage.setItem("postListLayout", mode);
  applyPostListLayout(mode);
}

/* ── 卡片样式（边框和阴影 / 跟随主题色 / 高级材质） ── */

export function getDefaultNavbarBlur(): boolean {
  return carrierBool("navbarBlur", false);
}

/** 卡片边框和阴影默认值（后台「样式开关」下发） */
export function getDefaultCardBorder(): boolean {
  return carrierBool("cardBorder", false);
}

/** 卡片跟随主题色默认值（后台「样式开关」下发）；仅浅色模式有视觉变化 */
export function getDefaultCardFollowTheme(): boolean {
  return carrierBool("cardFollowTheme", false);
}

export function getStoredNavbarBlur(): boolean {
  if (!getVisitorSwitches().appearance) return getDefaultNavbarBlur();
  const stored = localStorage.getItem("navbarBlur");
  return stored == null ? getDefaultNavbarBlur() : stored === "true";
}

export function getStoredCardBorder(): boolean {
  if (!getVisitorSwitches().appearance) return getDefaultCardBorder();
  const stored = localStorage.getItem("cardBorder");
  return stored == null ? getDefaultCardBorder() : stored === "true";
}

export function getStoredCardFollowTheme(): boolean {
  if (!getVisitorSwitches().appearance) return getDefaultCardFollowTheme();
  const stored = localStorage.getItem("cardFollowTheme");
  return stored == null ? getDefaultCardFollowTheme() : stored === "true";
}

export function setNavbarBlur(enabled: boolean): void {
  localStorage.setItem("navbarBlur", String(enabled));
  document.body.classList.toggle("navbar-blur-enabled", enabled);
}

export function setCardBorder(enabled: boolean): void {
  localStorage.setItem("cardBorder", String(enabled));
  document.body.classList.toggle("card-border-enabled", enabled);
}

export function setCardFollowTheme(enabled: boolean): void {
  localStorage.setItem("cardFollowTheme", String(enabled));
  document.body.classList.toggle("card-follow-theme-enabled", enabled);
}

/* ── 瀑布流（仅网格布局下生效） ── */

export function getDefaultPostListMasonry(): boolean {
  return carrierBool("masonryDefault", false);
}

export function getStoredPostListMasonry(): boolean {
  if (!getVisitorSwitches().appearance) return getDefaultPostListMasonry();
  const stored = localStorage.getItem("postListMasonry");
  return stored == null ? getDefaultPostListMasonry() : stored === "true";
}

/** 应用瀑布流：data-masonry 是瀑布流脚本的启用依据，换值后触发重排/复位 */
export function applyPostListMasonry(enabled: boolean): void {
  const container = document.getElementById("post-list-container");
  if (!container) return;
  // 过渡进行中：交给队列按序应用（同理，容器仍是旧态，不能按容器短路）
  const transitioning = document
    .getElementById("content-wrapper")
    ?.classList.contains("content-exit-animating");
  if (!transitioning) {
    const masonryNow = container.getAttribute("data-masonry") !== "false";
    if (masonryNow === enabled) return; // 已是目标状态，无需切换
  }
  triggerContentTransition(() => {
    container.setAttribute("data-masonry", enabled ? "true" : "false");
    // 瀑布流启用/关闭后触发重排/复位（post-list-layout.js 暴露的入口）
    (window as any).__postListRelayout?.();
  });
}

export function setPostListMasonry(enabled: boolean): void {
  localStorage.setItem("postListMasonry", String(enabled));
  applyPostListMasonry(enabled);
}

/* ── 壁纸参数（全屏透明模式） ── */

export interface WallpaperParams {
  opacity: number;
  blur: number;
  cardAlpha: number;
}

/** 解析数值配置：空值/非法值回退到 fallback */
function parseNum(raw: string | undefined, fallback: number): number {
  const n = Number.parseFloat(raw ?? "");
  return Number.isFinite(n) ? n : fallback;
}

export function getDefaultWallpaperParams(): WallpaperParams {
  const d = getCarrier()?.dataset ?? {};
  return {
    opacity: parseNum(d.wallpaperOpacity, 0.8),
    blur: parseNum(d.wallpaperBlur, 10),
    cardAlpha: parseNum(d.wallpaperCardAlpha, 0.6),
  };
}

export function getStoredWallpaperParams(): WallpaperParams {
  const defaults = getDefaultWallpaperParams();
  if (!getVisitorSwitches().wallpaper) return defaults;
  return {
    opacity: parseNum(
      localStorage.getItem("wallpaperOpacity") ?? undefined,
      defaults.opacity,
    ),
    blur: parseNum(
      localStorage.getItem("wallpaperBlur") ?? undefined,
      defaults.blur,
    ),
    cardAlpha: parseNum(
      localStorage.getItem("wallpaperCardAlpha") ?? undefined,
      defaults.cardAlpha,
    ),
  };
}

export function applyWallpaperParams(params: WallpaperParams): void {
  const body = document.body;
  if (!body) return;
  body.style.setProperty(
    "--transparent-wallpaper-opacity",
    String(params.opacity),
  );
  body.style.setProperty("--transparent-wallpaper-blur", `${params.blur}px`);
  body.style.setProperty("--transparent-card-alpha", String(params.cardAlpha));
}

export function setWallpaperParam(
  key: "wallpaperOpacity" | "wallpaperBlur" | "wallpaperCardAlpha",
  value: number,
): void {
  localStorage.setItem(key, String(value));
  applyWallpaperParams(getStoredWallpaperParams());
}

/* ── 壁纸模式（关闭/横幅/全屏/全屏透明） ── */

export type BannerDisplayMode =
  "disabled" | "banner" | "fullscreen" | "transparent";

const BANNER_DISPLAY_MODES: BannerDisplayMode[] = [
  "disabled",
  "banner",
  "fullscreen",
  "transparent",
];

function isBannerDisplayMode(value: unknown): value is BannerDisplayMode {
  return (
    typeof value === "string" &&
    (BANNER_DISPLAY_MODES as string[]).includes(value)
  );
}

export function getDefaultBannerDisplay(): BannerDisplayMode {
  const raw = getCarrier()?.dataset?.bannerDisplayDefault;
  return isBannerDisplayMode(raw) ? raw : "banner";
}

export function getStoredBannerDisplay(): BannerDisplayMode {
  if (!getVisitorSwitches().wallpaper) return getDefaultBannerDisplay();
  const stored = localStorage.getItem("bannerDisplay");
  return isBannerDisplayMode(stored) ? stored : getDefaultBannerDisplay();
}

/** 按目标模式重算 --banner-height-extend px（全屏 65vh / 横幅 30vh），与
 *  constants.ts 的 calcBannerHeightExtend 同式（head 内联脚本亦如此，数值
 *  来源 constants.ts，勿硬编码）。disabled/transparent 模式不使用延伸量
 *  （横幅隐藏 / 固定定位覆写），按横幅值写入即可 */
function applyBannerExtend(mode: BannerDisplayMode): void {
  const offset = calcBannerHeightExtend(
    window.innerHeight,
    bannerExtendVh(mode === "fullscreen"),
  );
  document.documentElement.style.setProperty(
    "--banner-height-extend",
    `${offset}px`,
  );
}

/** 应用壁纸模式：写 html[data-banner-display] + 切 body.enable-banner +
 *  重算延伸像素；切换时临时加 html.banner-mode-transitioning 启用平滑过渡
 *  （components.css 中同名规则），并派发 bannerModeChange 事件供外部监听 */
/** 过渡窗口的收尾定时器（全局唯一）。快速连点 / 连续切换时若不清掉上一个定时器，
 *  它会在新一轮过渡的中途把 banner-mode-transitioning 摘掉，过渡被打断、元素瞬跳
 *  到终点 —— 即「壁纸闪一下、没有过渡」 */
let bannerTransitionTimer: number | undefined;

/** 开启模式切换过渡窗口：加类 → 强制重排（建立「from」态：旧值 + 已启用的过渡，
 *  由调用方随后改属性值触发过渡）→ 到时摘类恢复元素原本的过渡声明 */
function openBannerTransitionWindow(root: HTMLElement): void {
  if (bannerTransitionTimer !== undefined) {
    window.clearTimeout(bannerTransitionTimer);
  }
  root.classList.add("banner-mode-transitioning");
  void root.offsetWidth;
  bannerTransitionTimer = window.setTimeout(
    () => {
      root.classList.remove("banner-mode-transitioning");
      bannerTransitionTimer = undefined;
    },
    readDurBannerMs(root) + 100,
  );
}

export function applyBannerDisplay(mode: BannerDisplayMode): void {
  const root = document.documentElement;
  const body = document.body;
  const enableBanner = mode === "banner" || mode === "fullscreen";

  // 过渡：先加类并强制重排建立「from」态（旧值 + 已启用的过渡），再改值
  openBannerTransitionWindow(root);
  root.setAttribute("data-banner-display", mode);
  applyBannerExtend(mode);
  body.classList.toggle("enable-banner", enableBanner);

  window.dispatchEvent(new CustomEvent("bannerModeChange", { detail: mode }));
}

export function setBannerDisplay(mode: BannerDisplayMode): void {
  localStorage.setItem("bannerDisplay", mode);
  applyBannerDisplay(mode);
}

/* ── 全屏布局（全屏模式下的 classic 经典 / hero 沉浸） ── */

/** 全屏布局：classic 经典（壁纸在文档流内、不模糊）| hero 沉浸（壁纸钉视口 + 首页滚动模糊斜坡 + 标题淡出） */
export type FullscreenLayoutMode = "classic" | "hero";

const FULLSCREEN_LAYOUT_MODES: FullscreenLayoutMode[] = ["classic", "hero"];

function isFullscreenLayoutMode(value: unknown): value is FullscreenLayoutMode {
  return (
    typeof value === "string" &&
    (FULLSCREEN_LAYOUT_MODES as string[]).includes(value)
  );
}

/** 后台默认（theme.config.layout.bannerLayout.fullscreenLayout，经 ConfigCarrier
 *  的 data-fullscreen-layout-default 传递）；未设回退 classic */
export function getDefaultFullscreenLayout(): FullscreenLayoutMode {
  const raw = getCarrier()?.dataset?.fullscreenLayoutDefault;
  return raw === "hero" ? "hero" : "classic";
}

export function getStoredFullscreenLayout(): FullscreenLayoutMode {
  if (!getVisitorSwitches().wallpaper) return getDefaultFullscreenLayout();
  const stored = localStorage.getItem("fullscreenLayout");
  return isFullscreenLayoutMode(stored) ? stored : getDefaultFullscreenLayout();
}

/** 应用全屏布局：写 html[data-fullscreen-layout]（CSS 全部带 fullscreen 前缀门控，
 *  非全屏模式下无视觉效果但保留值），并派发 fullscreenLayoutChange 供 hero 滚动
 *  斜坡等脚本监听。
 *  必须与 applyBannerDisplay 一样先挂过渡窗口：classic 与 hero 的视觉位置由
 *  「top + translate」一负一正相抵拼出（净位置都是 0），窗口内只放 height/opacity
 *  过渡、位置类属性保持瞬时，两项同帧到位即零位移；缺窗口时 translate 的过渡会
 *  单独跑而 top 是瞬时的 —— 一上来就错开整段延伸高度再慢慢归位（即 classic ↔
 *  hero 切换时「壁纸上下摆动」的成因） */
export function applyFullscreenLayout(mode: FullscreenLayoutMode): void {
  const root = document.documentElement;
  openBannerTransitionWindow(root);
  root.setAttribute("data-fullscreen-layout", mode);
  window.dispatchEvent(
    new CustomEvent("fullscreenLayoutChange", { detail: mode }),
  );
}

export function setFullscreenLayout(mode: FullscreenLayoutMode): void {
  localStorage.setItem("fullscreenLayout", mode);
  applyFullscreenLayout(mode);
}

/** 恢复后台默认布局（面板 Reset；与现有 reset* 系列一致：清 localStorage 后应用默认值） */
export function resetFullscreenLayout(): void {
  localStorage.removeItem("fullscreenLayout");
  applyFullscreenLayout(getDefaultFullscreenLayout());
}

/* ── 波浪（横幅底部动效） ── */

export function getDefaultWave(): boolean {
  return carrierBool("waveDefault", true);
}

export function getStoredWave(): boolean {
  if (!getVisitorSwitches().wallpaper) return getDefaultWave();
  const stored = localStorage.getItem("bannerWave");
  return stored == null ? getDefaultWave() : stored === "true";
}

/** 应用波浪开关：关闭时给 body 加 wave-disabled（CSS 隐藏容器）；
 *  开启时移除，由后台默认（wave.js 的 desktop_only 守卫等）决定显示 */
export function applyWave(enabled: boolean): void {
  document.body.classList.toggle("wave-disabled", !enabled);
}

export function setWave(enabled: boolean): void {
  localStorage.setItem("bannerWave", String(enabled));
  applyWave(enabled);
}

/* ── 首页壁纸标题（banner 标题层显隐，随壁纸设置区开关联动） ── */

export function getDefaultBannerTitle(): boolean {
  return carrierBool("bannerTitleDefault", true);
}

export function getStoredBannerTitle(): boolean {
  if (!getVisitorSwitches().wallpaper) return getDefaultBannerTitle();
  const stored = localStorage.getItem("bannerTitle");
  return stored == null ? getDefaultBannerTitle() : stored === "true";
}

/** 应用首页壁纸标题：关闭时 opacity 渐隐，开启时 fade-in-up 入场动画 */
export function applyBannerTitle(enabled: boolean): void {
  document.body.classList.toggle("banner-title-disabled", !enabled);
  if (enabled) {
    // 清除 app.ts MutationObserver 固化的内联 opacity/animation，
    // 否则 CSS 入场动画无法重新触发
    const title = document.getElementById("banner-title");
    const sub = document.getElementById("banner-subtitle-wrapper");
    const links = document.getElementById("banner-links");
    for (const el of [title, sub, links]) {
      if (el) {
        el.style.opacity = "";
        el.style.animation = "";
      }
    }
    // 添加入场动画 class，动画结束后移除
    const overlay = document.getElementById("banner-overlay");
    if (overlay) {
      overlay.classList.add("banner-title-enter");
      overlay.addEventListener(
        "animationend",
        () => overlay.classList.remove("banner-title-enter"),
        { once: true },
      );
    }
  }
}

export function setBannerTitle(enabled: boolean): void {
  localStorage.setItem("bannerTitle", String(enabled));
  applyBannerTitle(enabled);
}

/* ── 特效（樱花） ── */

/** 全局樱花特效（后台「样式开关」）作为访客默认值；经 ConfigCarrier data 下发 */
export function getDefaultSakuraEnabled(): boolean {
  return carrierBool("sakuraDefault", false);
}

/** 访客当前樱花开关：特效切换关闭时忽略 localStorage，跟随全局默认 */
export function getStoredSakuraEnabled(): boolean {
  if (!getVisitorSwitches().effects) return getDefaultSakuraEnabled();
  const stored = localStorage.getItem("sakuraEnabled");
  return stored == null ? getDefaultSakuraEnabled() : stored === "true";
}

/** 应用樱花开关：派发 sakuraToggle 事件，由 public/assets/sakura.js 实时启停 */
export function applySakura(enabled: boolean): void {
  window.dispatchEvent(
    new CustomEvent("sakuraToggle", { detail: { enabled } }),
  );
}

export function setSakuraEnabled(enabled: boolean): void {
  localStorage.setItem("sakuraEnabled", String(enabled));
  applySakura(enabled);
}

/* ── 分区恢复默认 ── */

/** 布局默认值是服务端渲染的初始类，由 visitor-post-layout.js 记到 data-server-layout。
 *  已是默认布局时 applyPostListLayout 内部会跳过，无需在此重复判断 */
export function resetPostListLayout(): void {
  localStorage.removeItem("postListLayout");
  const container = document.getElementById("post-list-container");
  const server = container?.dataset.serverLayout;
  if (server === "grid" || server === "list") {
    applyPostListLayout(server);
  }
}

export function resetCardStyle(): void {
  localStorage.removeItem("cardBorder");
  localStorage.removeItem("cardFollowTheme");
  localStorage.removeItem("navbarBlur");
  localStorage.removeItem("postListMasonry");
  document.body.classList.toggle("card-border-enabled", getDefaultCardBorder());
  document.body.classList.toggle(
    "card-follow-theme-enabled",
    getDefaultCardFollowTheme(),
  );
  document.body.classList.toggle("navbar-blur-enabled", getDefaultNavbarBlur());
  // 瀑布流默认值已生效时 applyPostListMasonry 内部会跳过
  applyPostListMasonry(getDefaultPostListMasonry());
}

export function resetWallpaperParams(): void {
  localStorage.removeItem("wallpaperOpacity");
  localStorage.removeItem("wallpaperBlur");
  localStorage.removeItem("wallpaperCardAlpha");
  applyWallpaperParams(getDefaultWallpaperParams());
}

export function resetWallpaperMode(): void {
  localStorage.removeItem("bannerDisplay");
  applyBannerDisplay(getDefaultBannerDisplay());
}

export function resetWave(): void {
  localStorage.removeItem("bannerWave");
  applyWave(getDefaultWave());
}

export function resetBannerTitle(): void {
  localStorage.removeItem("bannerTitle");
  applyBannerTitle(getDefaultBannerTitle());
}

export function resetSakura(): void {
  localStorage.removeItem("sakuraEnabled");
  applySakura(getDefaultSakuraEnabled());
}
