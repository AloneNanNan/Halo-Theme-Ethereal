// Banner 高度体系（权威定义，单一来源）：
//   --banner-height：banner 基础高度（非首页及首页顶部），恒定 35vh
//   --banner-height-home：首页 banner 总高 = 基础 + 延伸（横幅模式 65vh / 全屏 100vh）
//   --banner-height-extend：首页延伸量（横幅模式 30vh / 全屏 65vh），JS 换算成
//     像素后写入 CSS 变量（向下取整到 4px 倍数，见 BANNER_EXTEND_ROUNDING）
//   对应关系：BANNER_HEIGHT_HOME = BANNER_HEIGHT + BANNER_HEIGHT_EXTEND
// 注意同步点（改这里必须同步）：
//   - src/styles/variables.css 的 --banner-height / --banner-height-home /
//     --banner-height-extend 默认值（html[data-banner-display="fullscreen"]）
//   - src/layouts/Layout.astro head 内联脚本（延伸量 px 换算，注入本文件常量）
//   - src/utils/banner-sync.ts（波浪同步 / resize 重算，直接 import 本文件）
// 取整步长：banner 底边 = wrapper top(-extend) + 高度 的像素对齐依赖 JS 的
// 精确 px，CSS 默认 vh 值仅作首帧兜底；取 4px 倍数为避免 sub-pixel 缝隙
export const BANNER_EXTEND_ROUNDING = 4;

export const PAGE_SIZE = 8;

export const LIGHT_MODE = "light",
  DARK_MODE = "dark",
  AUTO_MODE = "auto";
export const DEFAULT_THEME = AUTO_MODE;

// Banner height unit: vh
export const BANNER_HEIGHT = 35;
export const BANNER_HEIGHT_EXTEND = 30;
export const BANNER_HEIGHT_HOME = BANNER_HEIGHT + BANNER_HEIGHT_EXTEND;

// 全屏模式（displayMode == 'fullscreen'）：首页 banner 延伸至整屏
export const BANNER_HEIGHT_EXTEND_FULLSCREEN = 65;
export const BANNER_HEIGHT_HOME_FULLSCREEN =
  BANNER_HEIGHT + BANNER_HEIGHT_EXTEND_FULLSCREEN;

/** 按展示模式返回首页 banner 高度（vh） */
export function bannerHomeVh(fullscreen: boolean): number {
  return fullscreen ? BANNER_HEIGHT_HOME_FULLSCREEN : BANNER_HEIGHT_HOME;
}

/** 按展示模式返回 banner 延伸高度（vh） */
export function bannerExtendVh(fullscreen: boolean): number {
  return fullscreen ? BANNER_HEIGHT_EXTEND_FULLSCREEN : BANNER_HEIGHT_EXTEND;
}

/** 计算 banner 延伸高度（像素），用于 CSS 变量 --banner-height-extend */
export function calcBannerHeightExtend(
  innerHeight: number,
  vh: number = BANNER_HEIGHT_EXTEND,
): number {
  let offset = Math.floor(innerHeight * (vh / 100));
  return offset - (offset % BANNER_EXTEND_ROUNDING);
}

// 全屏首页波浪下移量已内联进 components.css #wave-container 的全屏规则
// （transform: translateY(... + 20%)）：波浪整体下移、只露出波峰层。用百分比
// 使 h-28/h-32/h-36 各断点等比下移（translateY 的 % 即元素自身高度），固定
// 像素会在不同断点留下不同大小的残余实心带。仅全屏首页生效，横幅模式与
// 其他页面保持原样

// The height the main panel overlaps the banner, unit: rem
export const MAIN_PANEL_OVERLAPS_BANNER_HEIGHT = 3.5;

// Page width: rem
export const PAGE_WIDTH = 75;

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
