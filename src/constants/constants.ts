export const PAGE_SIZE = 8;

export const LIGHT_MODE = "light",
  DARK_MODE = "dark",
  AUTO_MODE = "auto";
export const DEFAULT_THEME = AUTO_MODE;

// Banner height unit: vh
export const BANNER_HEIGHT = 35;
export const BANNER_HEIGHT_EXTEND = 30;
export const BANNER_HEIGHT_HOME = BANNER_HEIGHT + BANNER_HEIGHT_EXTEND;

// The height the main panel overlaps the banner, unit: rem
export const MAIN_PANEL_OVERLAPS_BANNER_HEIGHT = 3.5;

// Page width: rem
export const PAGE_WIDTH = 75;

/** 计算 banner 延伸高度（像素），用于 CSS 变量 --banner-height-extend */
export function calcBannerHeightExtend(innerHeight: number): number {
  let offset = Math.floor(innerHeight * (BANNER_HEIGHT_EXTEND / 100));
  return offset - (offset % 4);
}

// Banner 响应式常量
export const BANNER_MIN_HEIGHT_PX = 180;
export const BANNER_TABLET_BREAKPOINT = 768;
export const BANNER_TITLE_MIN_SIZE_REM = 1.8;
export const BANNER_TITLE_MAX_SIZE_REM = 3.5;
export const BANNER_TITLE_VW_MULTIPLIER = 0.007;

// 移动端副标题字号阶梯（断点 → rem）
export const BANNER_SUBTITLE_480 = 1.0;
export const BANNER_SUBTITLE_640 = 1.125;
export const BANNER_SUBTITLE_767 = 1.25;
export const BANNER_SUBTITLE_DEFAULT = 1.5;

// Swup visit:end 恢复延迟（ms）
export const SWUP_VISIT_END_DELAY = 200;
