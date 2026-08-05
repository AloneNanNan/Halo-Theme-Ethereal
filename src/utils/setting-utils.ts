import {
  AUTO_MODE,
  DARK_MODE,
  DEFAULT_THEME,
  LIGHT_MODE,
} from "../constants/constants.ts";
import type { LIGHT_DARK_MODE } from "../types/config";

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
