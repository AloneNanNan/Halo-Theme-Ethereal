import type { ThemeConfig } from "./types/config.ts";

let themeConfig: ThemeConfig | undefined = undefined;
let initialized = false;

function getThemeConfig(): ThemeConfig | undefined {
  if (!initialized) {
    initialized = true;
    const el = document.querySelector<HTMLScriptElement>("#theme-config");
    if (el?.textContent) {
      try {
        themeConfig = JSON.parse(el.textContent) as ThemeConfig;
      } catch (e) {
        console.error("解析 theme-config 失败:", e);
      }
    }
  }
  return themeConfig;
}

export { themeConfig, getThemeConfig };
