// 共享：#theme-config JSON 解析缓存。配置内联于 head 的 <script type="application/json"
// id="theme-config">，被 wave / banner-carousel / banner-src-switch / post-like /
// post-reward 等脚本消费：首个 parse 的写入 window.__themeConfig、后续复用（legacy 脚本同契约）。
// 本模块被各入口 import、esbuild 内联进各自 IIFE，无加载顺序依赖。
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
