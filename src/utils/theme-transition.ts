// src/utils/theme-transition.ts — 主题切换动画（View Transitions API + 注册表驱动）
//
// 职责划分：JS 只负责「读配置 → 加 html.theme-anim-{style} 类 → 设 --theme-anim-* 变量 →
// startViewTransition」，动画完全由 src/styles/theme-transition.css 的 keyframes 驱动。
// 新增动画样式 = 注册表加一项（registerThemeTransitionStyle）+ 一段 keyframes CSS，零散改动。
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
  /** 设 --theme-anim-* 变量；fade 为空实现 */
  prepare(ctx: ThemeTransitionContext): void;
}

const registry = new Map<string, ThemeTransitionStyle>();

export function registerThemeTransitionStyle(
  style: ThemeTransitionStyle,
): void {
  registry.set(style.id, style);
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
        a.animationName === "fade-in-up" &&
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
 * 仅显式用户操作（切换按钮点击）走此入口；页面加载同步、系统配色跟随保持瞬时。
 */
export function runThemeTransition(apply: () => void): void {
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

  // 切换按钮圆心（视口坐标，与 root 快照 1:1 对齐）；找不到时 circle 退化为视口中心
  let buttonCenter: { x: number; y: number } | null = null;
  const button = document.getElementById("scheme-switch");
  if (button) {
    const rect = button.getBoundingClientRect();
    buttonCenter = {
      x: clamp(rect.left + rect.width / 2, 0, viewport.width),
      y: clamp(rect.top + rect.height / 2, 0, viewport.height),
    };
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
    `${EASING_DURATION[cfg.easing]}ms`,
  );
  root.style.setProperty("--theme-anim-easing", EASING_MAP[cfg.easing]);
  style.prepare(ctx);

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
}

// ── 内建样式注册（纯数据副作用，无 DOM 访问，SSR 安全） ──

registerThemeTransitionStyle({
  id: "fade",
  cssClass: "theme-anim-fade",
  prepare: () => {},
});

registerThemeTransitionStyle({
  id: "circle",
  cssClass: "theme-anim-circle",
  prepare(ctx) {
    const { root, buttonCenter, viewport } = ctx;
    const x = buttonCenter ? buttonCenter.x : viewport.width / 2;
    const y = buttonCenter ? buttonCenter.y : viewport.height / 2;
    root.style.setProperty("--theme-anim-x", `${Math.round(x)}px`);
    root.style.setProperty("--theme-anim-y", `${Math.round(y)}px`);
    // 半径取视口对角线（px）：任意圆心（含角落附近）都能覆盖全视口。
    // 不依赖 circle() 的百分比半径语义（不同实现对参考基准理解不一致）
    root.style.setProperty(
      "--theme-anim-r",
      `${Math.ceil(Math.hypot(viewport.width, viewport.height))}px`,
    );
  },
});

registerThemeTransitionStyle({
  id: "wipe",
  cssClass: "theme-anim-wipe",
  // 扫动方向 u（0° 左→右，90° 上→下），边界方向 v 垂直于 u。
  // 让覆盖视口的平行四边形条带沿 u 平移：起点/终点同为 4 顶点 polygon()，
  // 插值即纯平移（顶点数一致、类型一致，可平滑插值）。
  //   E1/E2 起始边缘（s=0 贴在起始角 A，s=1 到对角 B）
  //   F1/F2 新主题条带后沿（始终在视口后方）
  //   G1/G2 旧主题条带前沿（始终在视口前方）
  prepare(ctx) {
    const { root, viewport, config } = ctx;
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
    const dx = ux * D;
    const dy = uy * D;

    const setPx = (name: string, value: number) => {
      root.style.setProperty(name, `${Math.round(value)}px`);
    };
    // 起始边缘（s=0 贴在角 A，s=1 平移 d 到角 B）
    const e1 = { x: A.x + vx * m, y: A.y + vy * m };
    const e2 = { x: A.x - vx * m, y: A.y - vy * m };
    // 新主题条带后沿（始终在视口后方）
    const f1 = { x: A.x - ux * m - vx * m, y: A.y - uy * m - vy * m };
    const f2 = { x: A.x - ux * m + vx * m, y: A.y - uy * m + vy * m };
    // 旧主题条带前沿（始终在视口前方）
    const g1 = { x: B.x + ux * m - vx * m, y: B.y + uy * m - vy * m };
    const g2 = { x: B.x + ux * m + vx * m, y: B.y + uy * m + vy * m };

    setPx("--theme-anim-e1x", e1.x);
    setPx("--theme-anim-e1y", e1.y);
    setPx("--theme-anim-e2x", e2.x);
    setPx("--theme-anim-e2y", e2.y);
    setPx("--theme-anim-f1x", f1.x);
    setPx("--theme-anim-f1y", f1.y);
    setPx("--theme-anim-f2x", f2.x);
    setPx("--theme-anim-f2y", f2.y);
    setPx("--theme-anim-g1x", g1.x);
    setPx("--theme-anim-g1y", g1.y);
    setPx("--theme-anim-g2x", g2.x);
    setPx("--theme-anim-g2y", g2.y);
    setPx("--theme-anim-dx", dx);
    setPx("--theme-anim-dy", dy);
  },
});
