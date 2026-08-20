// 构建期由 Vite define 注入（见 astro.config.mjs 的 ASSET_VERSION），此处仅补类型声明
declare const ASSET_VERSION: string;

// 全局 i18n 助手（Layout.astro head 注入，供各内联脚本 / Svelte 组件共用）
interface Window {
  __etherealI18n?: (key: string, fallback: string) => string;
  __etherealLangTag?: (lang: string) => string;
  __etherealSetLanguage?: (lang: string) => void;
  __etherealBigNum?: (
    num: number,
    unitKey: string,
    unitFallback?: string,
  ) => string;
  __etherealLangSwitching?: boolean;
  // 悬浮目录弹窗桥接（BackToTop.astro 注入）：app.ts 换页/调窗后复位状态用
  __etherealTocPopup?: {
    open: () => void;
    close: () => void;
    toggle: () => void;
  };
  // 自定义悬浮按钮位置重算（BackToTop.astro 注入）：内置按钮显隐变化后调用
  __etherealFloatingControlsReposition?: () => void;
}

// 允许在模板元素上使用 Thymeleaf 属性（Halo 服务端渲染）
declare namespace astroHTML.JSX {
  interface HTMLAttributes {
    "th:each"?: string;
    "th:href"?: string;
    "th:text"?: string;
    "th:if"?: string;
    "th:unless"?: string;
    "th:utext"?: string;
    "th:src"?: string;
    "th:with"?: string;
    "th:target"?: string;
    "th:content"?: string;
    "th:lang"?: string;
    "th:classappend"?: string;
    "xmlns:th"?: string;
    "th:inline"?: string;
    "th:replace"?: string;
    "th:alt"?: string;
    "th:style"?: string;
    "th:attr"?: string;
    "th:datetime"?: string;
    "th:title"?: string;
    "th:placeholder"?: string;
    "th:maxlength"?: string;
    "th:class"?: string;
    "th:switch"?: string;
    "th:case"?: string;
    "th:block"?: string;
    "th:remove"?: string;
    "th:fragment"?: string;
    "th:name"?: string;
    "th:id"?: string;
    "th:onclick"?: string;
    "th:aria-label"?: string;
    "th:aria-current"?: string;
    "th:data-count"?: string;
    "th:data-hue"?: string;
    "th:data-hue-fixed"?: string;
    "th:data-text"?: string;
    "th:data-submenu-id"?: string;
    "th:data-empty-text"?: string;
    "th:data-theme-anim-style"?: string;
    "th:data-theme-anim-easing"?: string;
    "th:data-theme-anim-angle"?: string;
  }
}
