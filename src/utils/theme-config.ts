/**
 * 从 DOM 中读取主题配置 JSON。
 * 多个模块共用，避免重复解析 #theme-config。
 * 注意：缓存永不清除——模块级单例，与原有 external-link-redirect.ts 行为一致。
 */
let cachedThemeConfig: Record<string, unknown> | null | undefined;

export function getThemeConfig(): Record<string, unknown> | null {
  if (cachedThemeConfig !== undefined) return cachedThemeConfig;
  let config: Record<string, unknown> | null = null;
  try {
    const el = document.getElementById("theme-config");
    if (el?.textContent) config = JSON.parse(el.textContent);
  } catch {
    config = null;
  }
  cachedThemeConfig = config;
  return config;
}

/**
 * 写入配置缓存。
 * 用于前端修改配置（如在线状态 PUT 写回）后同步缓存，
 * 使同会话内后续读取立即拿到最新值，实现无需刷新的"热更新"。
 */
export function setThemeConfig(config: Record<string, unknown>): void {
  cachedThemeConfig = config;
}
