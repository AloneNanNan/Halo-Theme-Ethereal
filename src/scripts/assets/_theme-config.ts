// 共享：#theme-config JSON 解析缓存
// 后台配置 JSON 内联于 head 的 <script type="application/json" id="theme-config">，
// 被 wave / banner-carousel / banner-src-switch / post-like / post-reward 等
// 多个独立脚本消费。首个 parse 的脚本把结果写入 window.__themeConfig，
// 后续脚本直接复用（public/ 下的 legacy 脚本同样遵守该契约）。
// 本模块被各脚本入口 import，esbuild 内联进各自的 IIFE，无加载顺序依赖。
export function getThemeConfig(): any {
  const w = window as unknown as {
    __themeConfig?: unknown;
  };
  if (w.__themeConfig !== undefined) return w.__themeConfig;
  const el = document.getElementById("theme-config");
  let parsed: unknown = null;
  if (el && el.textContent) {
    try {
      parsed = JSON.parse(el.textContent);
    } catch {
      parsed = null;
    }
  }
  w.__themeConfig = parsed;
  return parsed;
}
