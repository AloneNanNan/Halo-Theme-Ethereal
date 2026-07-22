/**
 * 从 DOM 中读取主题配置 JSON。
 * 多个模块共用，避免重复解析 #theme-config。
 * 注意：缓存永不清除——模块级单例，与原有 external-link-redirect.ts 行为一致。
 */
let cachedThemeConfig: Record<string, unknown> | null | undefined;

export function getThemeConfig(): Record<string, unknown> | null {
  if (cachedThemeConfig !== undefined) return cachedThemeConfig;
  try {
    const el = document.getElementById("theme-config");
    if (!el?.textContent) return (cachedThemeConfig = null);
    cachedThemeConfig = JSON.parse(el.textContent);
    return cachedThemeConfig;
  } catch {
    return (cachedThemeConfig = null);
  }
}
