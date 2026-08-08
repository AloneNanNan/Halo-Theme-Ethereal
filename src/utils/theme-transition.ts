// src/utils/theme-transition.ts — 主题切换动画（View Transitions API + 注册表驱动）
//
// 架构：JS 负责「读配置 → 加 html.theme-anim-{style} 类 → 设 --theme-anim-duration/
// easing 变量 → buildKeyframes 生成数值化 @keyframes（具体 px，无 var/calc）并注入
// <style id="theme-anim-keyframes"> → startViewTransition」。CSS 只保留选择器、
// 时长/缓动与 UA 动画覆盖（见 theme-transition.css）。
//
// 数值化 keyframes 的动机：keyframes 中的 var()/calc() 在 VT 伪元素上下文解析
// 不可靠（曾导致 circle 圆心偏移、wipe 终点未达），由 JS 算好数值直接写入可根治；
// 每次点击都按当前视口/按钮位置重新生成（动态），非构建期写死。
//
// 新增动画样式 = 注册表加一项（registerThemeTransitionStyle）+ buildKeyframes。
//
// 降级链：无 startViewTransition（老浏览器）/ prefers-reduced-motion / none 样式 →
// 直调 apply()，行为与现状完全一致，无需 polyfill。

export type ThemeAnimStyleId = "fade" | "circle" | "wipe" | "none";

export type ThemeAnimEasingId =
  | "default"
  | "linear"
  | "ease-in"
  | "ease-out"
  | "ease-in-out"
  | "expo-out"
  | "back-out";

export interface ThemeAnimConfig {
  style: ThemeAnimStyleId;
  /** 速度曲线键名，经 EASING_MAP 映射为 timing-function */
  easing: ThemeAnimEasingId;
  /** 擦除角度（度），仅 wipe 使用：扫动方向，0° 从左到右，90° 从上到下 */
  angle: number;
}

/** 缓动键 → timing-function，注入 --theme-anim-easing 供 CSS 统一使用 */
const EASING_MAP: Record<ThemeAnimEasingId, string> = {
  default: "cubic-bezier(0.4, 0, 0.2, 1)",
  linear: "linear",
  "ease-in": "cubic-bezier(0.4, 0, 1, 1)",
  "ease-out": "cubic-bezier(0, 0, 0.2, 1)",
  "ease-in-out": "cubic-bezier(0.4, 0, 0.6, 1)",
  "expo-out": "cubic-bezier(0.16, 1, 0.3, 1)",
  "back-out": "cubic-bezier(0.34, 1.56, 0.64, 1)",
};

/**
 * 动画时长（毫秒）随曲线匹配，写死不开放配置：
 * 缓入/缓出用时较短避免拖沓，回弹需更长时间让过冲充分展现
 */
const EASING_DURATION: Record<ThemeAnimEasingId, number> = {
  default: 900,
  linear: 900,
  "ease-in": 700,
  "ease-out": 700,
  "ease-in-out": 850,
  "expo-out": 950,
  "back-out": 1100,
};

/**
 * 动画速度三档：按 <html data-speed> 逐缓动曲线覆盖时长（ms）。
 * 由 settings.yaml styleSwitches.speedTier 注入。
 * relaxed / balanced 不写 → 走 EASING_DURATION 原值（均衡=当前原值，零回归）；
 * snappy 最短但回弹（back-out）保留呼吸空间。
 */
const SPEED_TIER_DURATION: Record<
  string,
  Partial<Record<ThemeAnimEasingId, number>>
> = {
  snappy: {
    default: 250,
    linear: 250,
    "ease-in": 200,
    "ease-out": 200,
    "ease-in-out": 230,
    "expo-out": 280,
    "back-out": 350,
  },
};

/** 读取当前速度档位对应的缓动时长（缺省回退原值） */
function resolveEasingDuration(easing: ThemeAnimEasingId): number {
  const tier = document.documentElement.dataset.speed || "balanced";
  return SPEED_TIER_DURATION[tier]?.[easing] ?? EASING_DURATION[easing];
}

export interface ThemeTransitionContext {
  root: HTMLElement;
  viewport: { width: number; height: number };
  /** 切换按钮圆心（视口 px）；找不到按钮时为 null */
  buttonCenter: { x: number; y: number } | null;
  config: ThemeAnimConfig;
}

export interface ThemeTransitionStyle {
  id: Exclude<ThemeAnimStyleId, "none">;
  /** 加入 <html> 的类，如 "theme-anim-circle"，CSS 据此选择 keyframes */
  cssClass: string;
  /**
   * 生成数值化 keyframes CSS 文本（具体 px，不依赖 var()/calc()）。
   * 根治 keyframes 中 var/calc 解析不可靠导致的圆心偏移、终点未达等问题——
   * 几何由 JS 算好后直接写进 @keyframes，运行时注入 <style>。
   */
  buildKeyframes(ctx: ThemeTransitionContext): string;
}

const registry = new Map<string, ThemeTransitionStyle>();

export function registerThemeTransitionStyle(
  style: ThemeTransitionStyle,
): void {
  registry.set(style.id, style);
}

// keyframes 运行时注入：buildKeyframes 生成的数值化 @keyframes 写入该 <style>
let keyframesStyle: HTMLStyleElement | null = null;
function injectKeyframes(css: string): void {
  if (!keyframesStyle) {
    keyframesStyle = document.createElement("style");
    keyframesStyle.id = "theme-anim-keyframes";
    document.head.appendChild(keyframesStyle);
  }
  keyframesStyle.textContent = css;
}

const DEFAULT_CONFIG: ThemeAnimConfig = {
  style: "fade",
  easing: "default",
  angle: 90,
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** 点击时惰性读取 <html> 上的 th:data-* 注入（缺失时用默认值） */
export function getThemeAnimConfig(): ThemeAnimConfig {
  const dataset = document.documentElement.dataset;
  const cfg = { ...DEFAULT_CONFIG };

  const style = dataset.themeAnimStyle;
  if (
    style === "fade" ||
    style === "circle" ||
    style === "wipe" ||
    style === "none"
  ) {
    cfg.style = style;
  }
  if (dataset.themeAnimEasing !== undefined) {
    const easing = dataset.themeAnimEasing as ThemeAnimEasingId;
    if (easing in EASING_MAP) {
      cfg.easing = easing;
    }
  }
  if (dataset.themeAnimAngle !== undefined) {
    const n = Number(dataset.themeAnimAngle);
    if (Number.isFinite(n)) {
      cfg.angle = ((n % 360) + 360) % 360;
    }
  }
  return cfg;
}

/** JS 主闸：API 可用且用户未要求减少动态效果 */
export function isThemeAnimEligible(): boolean {
  return (
    typeof document.startViewTransition === "function" &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * 页面入场动画（fade-in-up）是否仍在播放。
 * 首次点击常落在页面未渲染完成窗口（banner 未加载、主内容不可见），此时 VT 快照
 * 几乎只有背景色，wipe 等动画会呈现"纯背景色条带"——命中时走瞬时切换。
 * getAnimations() 也会返回 VT 伪元素动画，但其 animationName 为 theme-*，不冲突。
 */
function isEntranceAnimationRunning(): boolean {
  return document
    .getAnimations()
    .some(
      (a) =>
        a instanceof CSSAnimation &&
        (a.animationName === "fade-in-up" ||
          a.animationName === "slide-in-up") &&
        a.playState === "running",
    );
}

interface InFlightTransition {
  vt: ViewTransition;
  token: object;
}

let inFlight: InFlightTransition | null = null;

/**
 * 播放主题切换动画。apply() 内同步翻转主题（如 setTheme）。
 * origin 为切换按钮圆心（视口 px，circle 样式用），由调用方（LightDarkSwitch）
 * 从组件内 bind:this 引用提供——不依赖 getElementById（macOS Chrome 下偶发
 * 查询不到按钮导致圆心回退视口中心的"中央最上方"问题）。
 * 仅显式用户操作（切换按钮点击）走此入口；页面加载同步、系统配色跟随保持瞬时。
 */
export function runThemeTransition(
  apply: () => void,
  origin?: { x: number; y: number },
): void {
  const cfg = getThemeAnimConfig();
  const style = cfg.style === "none" ? null : registry.get(cfg.style);
  if (!style || !isThemeAnimEligible() || isEntranceAnimationRunning()) {
    apply();
    return;
  }

  // 快速连点：跳过进行中的过渡并立即开启新过渡——
  // 新过渡的「旧快照」就是刚切换完的主题，视觉连续无闪烁
  if (inFlight) {
    inFlight.vt.skipTransition();
  }

  const root = document.documentElement;
  const viewport = { width: window.innerWidth, height: window.innerHeight };

  // 切换按钮圆心（视口坐标，与 root 快照 1:1 对齐）；
  // 优先用调用方提供的按钮中心，兜底再查 DOM；都找不到时 circle 退化为视口中心
  let buttonCenter: { x: number; y: number } | null = origin ?? null;
  if (!buttonCenter) {
    const button = document.getElementById("scheme-switch");
    if (button) {
      const rect = button.getBoundingClientRect();
      buttonCenter = {
        x: clamp(rect.left + rect.width / 2, 0, viewport.width),
        y: clamp(rect.top + rect.height / 2, 0, viewport.height),
      };
    }
  }

  const ctx: ThemeTransitionContext = {
    root,
    viewport,
    buttonCenter,
    config: cfg,
  };
  root.classList.add(style.cssClass);
  root.style.setProperty(
    "--theme-anim-duration",
    `${resolveEasingDuration(cfg.easing)}ms`,
  );
  root.style.setProperty("--theme-anim-easing", EASING_MAP[cfg.easing]);
  injectKeyframes(style.buildKeyframes(ctx));

  const token = {};
  // WebIDL 方法必须以 document 作为 this 调用（不能先取出再裸调用，否则抛 Illegal invocation）；
  // 走到这里时 isThemeAnimEligible 已确认该方法存在
  const vt = document.startViewTransition(() => {
    apply();
  });
  inFlight = { vt, token };

  // skip 时 finished 在浏览器间 resolve/reject 行为不一，双回调兜底
  vt.finished.then(
    () => cleanup(token),
    () => cleanup(token),
  );
}

function cleanup(token: object): void {
  // token 身份判断：旧过渡的 finished 不得清理新过渡的 class/变量
  if (!inFlight || inFlight.token !== token) {
    return;
  }
  inFlight = null;
  const root = document.documentElement;
  root.classList.remove(
    ...Array.from(registry.values()).map((s) => s.cssClass),
  );
  // 仅清 --theme-anim-* 前缀的内联变量（--hue/--page-width 等持久变量不受影响）
  for (let i = root.style.length - 1; i >= 0; i--) {
    const name = root.style[i];
    if (name.startsWith("--theme-anim-")) {
      root.style.removeProperty(name);
    }
  }
  // 清空已注入的 keyframes（下次点击会重新生成覆盖，清理保持 DOM 干净）
  if (keyframesStyle) {
    keyframesStyle.textContent = "";
  }
}

// ── 内建样式注册（纯数据副作用，无 DOM 访问，SSR 安全） ──

registerThemeTransitionStyle({
  id: "fade",
  cssClass: "theme-anim-fade",
  buildKeyframes: () => `
@keyframes theme-fade-out {
  to { opacity: 0; }
}
@keyframes theme-fade-in {
  from { opacity: 0; }
}
`,
});

registerThemeTransitionStyle({
  id: "circle",
  cssClass: "theme-anim-circle",
  buildKeyframes(ctx) {
    const { buttonCenter, viewport } = ctx;
    // 兜底圆心取右上角（导航栏切换按钮的典型位置），而非视口中心
    const x = Math.round(buttonCenter ? buttonCenter.x : viewport.width - 32);
    const y = Math.round(buttonCenter ? buttonCenter.y : 32);
    // 半径 = 到最远角的距离 × 1.25：终点圆边缘明确超出画面
    const r = Math.ceil(
      Math.hypot(
        Math.max(x, viewport.width - x),
        Math.max(y, viewport.height - y),
      ) * 1.25,
    );
    return `
@keyframes theme-circle-in {
  from { clip-path: circle(0 at ${x}px ${y}px); }
  to   { clip-path: circle(${r}px at ${x}px ${y}px); }
}
`;
  },
});

registerThemeTransitionStyle({
  id: "wipe",
  cssClass: "theme-anim-wipe",
  // 扫动方向 u（0° 左→右，90° 上→下），边界方向 v 垂直于 u。
  // 让覆盖视口的平行四边形条带沿 u 平移：起点/终点同为 4 顶点 polygon()，
  // 插值即纯平移。所有坐标由 JS 数值化后直接写进 keyframes（无 var/calc）。
  // 旧快照保持全屏静止（CSS animation: none），仅生成 theme-wipe-in
  // 揭示新主题条带——动画结束 new 盖满遮住 old，避免旧快照 clip-path
  // fill 失效回退显示旧主题（"闪回亮色一帧"）。
  //   E1/E2 起始边缘（s=0 贴在起始角 A，s=1 平移 d 到角 B）
  //   F1/F2 新主题条带后沿（始终在视口后方）
  buildKeyframes(ctx) {
    const { viewport, config } = ctx;
    const W = viewport.width;
    const H = viewport.height;
    const rad = (config.angle * Math.PI) / 180;
    const ux = Math.cos(rad);
    const uy = Math.sin(rad);
    const vx = -uy;
    const vy = ux;

    // 起始角 A = 视口四角中 u 向投影最小的角，B = 最大的角（并列取先出现的）
    const corners = [
      { x: 0, y: 0 },
      { x: W, y: 0 },
      { x: 0, y: H },
      { x: W, y: H },
    ];
    const dotU = (p: { x: number; y: number }) => p.x * ux + p.y * uy;
    let A = corners[0];
    let B = corners[0];
    for (const c of corners) {
      if (dotU(c) < dotU(A)) A = c;
      if (dotU(c) > dotU(B)) B = c;
    }

    const D = dotU(B) - dotU(A); // 视口在扫动方向的投影跨度（W·|cosθ| + H·|sinθ|）
    const m = W + H; // 安全裕量：任意视口点到 A 的 v 向投影 ≤ W+H，且 ≥ D
    // 分段关键帧（冗余不减，解决"页面内时间极短"）：
    //   0%→90%：条带扫过画面 + 小冗余（D×1.2，边缘已完全离屏），
    //            画面内扫过占满前 90% 进度——缓出曲线下页面内时间 ~75%
    //            （此前单一 to 帧 ×2 冗余时边缘 50% 进度即离屏，仅 ~20%）
    //  90%→100%：继续平移到大冗余（D×2），确保终点完全离屏（防不完全擦除）
    const d1x = ux * D * 1.2;
    const d1y = uy * D * 1.2;
    const d2x = ux * D * 2;
    const d2y = uy * D * 2;
    const R = (n: number) => Math.round(n);
    const P = (p: { x: number; y: number }) => `${R(p.x)}px ${R(p.y)}px`;

    // 起始边缘（s=0 贴在角 A）
    const e1 = { x: A.x + vx * m, y: A.y + vy * m };
    const e2 = { x: A.x - vx * m, y: A.y - vy * m };
    // 新主题条带后沿（始终在视口后方）
    const f1 = { x: A.x - ux * m - vx * m, y: A.y - uy * m - vy * m };
    const f2 = { x: A.x - ux * m + vx * m, y: A.y - uy * m + vy * m };
    const E1 = P(e1);
    const E2 = P(e2);
    const E1d1 = P({ x: e1.x + d1x, y: e1.y + d1y });
    const E2d1 = P({ x: e2.x + d1x, y: e2.y + d1y });
    const E1d2 = P({ x: e1.x + d2x, y: e1.y + d2y });
    const E2d2 = P({ x: e2.x + d2x, y: e2.y + d2y });
    const F1 = P(f1);
    const F2 = P(f2);

    return `
@keyframes theme-wipe-in {
  0%   { clip-path: polygon(${E1}, ${E2}, ${F1}, ${F2}); }
  90%  { clip-path: polygon(${E1d1}, ${E2d1}, ${F1}, ${F2}); }
  100% { clip-path: polygon(${E1d2}, ${E2d2}, ${F1}, ${F2}); }
}
`;
  },
});
