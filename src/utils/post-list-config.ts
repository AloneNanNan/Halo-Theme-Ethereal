/**
 * 文章卡片布局的 Thymeleaf 表达式生成：读 settings.yaml 的 layout.postList，输出到
 * PostList.astro 容器（th:classappend 布局类 / th:attr data-masonry / th:style 的
 * --post-card-min-width 与 --post-desc-lines）。安全约定：Thymeleaf 表达式不能出现
 * Tailwind 括号类（rounded-(--radius-large)、w-[calc(...)] 等），否则解析器误判括号并抛
 * "Could not parse as expression"——含特殊字符的类放静态 class，拼接用 '文本' + ${expr}。
 */

export function postListContainerThWith(): string {
  return (
    "postList=${theme.config?.layout?.postList}, " +
    "defaultMode=${postList?.defaultMode ?: 'list'}, " +
    "coverPosition=${postList?.list?.coverPosition ?: 'right'}, " +
    "coverRatio=${postList?.list?.coverRatio ?: 'fill'}, " +
    "descLines=${postList?.descriptionLines ?: 2}, " +
    "masonry=${postList?.grid?.masonry == true}, " +
    "coverFullWidth=${postList?.grid?.coverFullWidth == true}, " +
    "coverAutoHeight=${postList?.grid?.coverAutoHeight != false}, " +
    "gridClass=${defaultMode == 'grid' ? ' post-grid-mode' : ' post-list-mode'}, " +
    "coverExtra=${defaultMode != 'grid' and coverPosition == 'left' ? ' cover-left' : ''}, " +
    "coverRatioExtra=${coverRatio == 'fixed16x9' ? ' cover-fixed' : ''}, " +
    "gridExtra=${defaultMode == 'grid' and coverFullWidth ? ' grid-cover-full' : ' grid-cover-inset'}, " +
    "gridFill=${defaultMode == 'grid' and !masonry and coverAutoHeight ? ' grid-cover-fill' : ''}"
  );
}

/** 追加的布局类：'文本' + ${变量} 交替拼接，避免 ${} 内复杂嵌套 */
export function postListContainerClass(): string {
  return (
    "' '" +
    " + ${gridClass}" +
    " + ${coverExtra}" +
    " + ${coverRatioExtra}" +
    " + ${gridExtra}" +
    " + ${gridFill}"
  );
}

/** 供瀑布流 JS 读取的数据属性（与 public/assets/post-list-layout.js 约定一致） */
export function postListDataAttrs(): string {
  return "data-masonry=${masonry ? 'true' : 'false'}";
}

/** 容器内联变量：网格最小列宽写死 320px，简介截断行数由配置控制。
 *  使用 Thymeleaf 字面量替换语法 |...| 拼接，避免手工 + 连接 */
export function postListContainerStyle(): string {
  return "|--post-card-min-width: 320px; --post-desc-lines: ${descLines};|";
}
