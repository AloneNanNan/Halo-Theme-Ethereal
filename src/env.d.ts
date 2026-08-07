// 构建期由 Vite define 注入（见 astro.config.mjs 的 ASSET_VERSION），此处仅补类型声明
declare const ASSET_VERSION: string;

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
    "th:inline"?: string;
    "th:replace"?: string;
    "th:alt"?: string;
    "th:style"?: string;
    "th:attr"?: string;
    "th:datetime"?: string;
    "th:title"?: string;
    "th:class"?: string;
    "th:switch"?: string;
    "th:case"?: string;
    "th:block"?: string;
    "th:remove"?: string;
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
