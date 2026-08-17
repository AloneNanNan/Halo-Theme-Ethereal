/**
 * 图片 CDN 处理参数（尺寸后缀）生成。
 *
 * 主题中同一套 provider → 后缀规则存在两处执行环境：
 * 1. 服务端 Thymeleaf 渲染（Halo 后台）—— 见 CDN_SUFFIX_RAW / imageSuffixThWith；
 * 2. 浏览器端运行时（文章正文图片处理，is:inline 脚本）—— 见 CDN_SUFFIX_PATTERNS。
 *
 * 两套必须同步维护：新增 CDN 服务商时，同时更新 CDN_SUFFIX_RAW 与 CDN_SUFFIX_PATTERNS。
 *
 * 注意：Astro 构建器对含 Thymeleaf 表达式（${...}）的属性值不做插值解析，
 * 因此 th:with 必须整体由本函数生成，再通过 `th:with={imageSuffixThWith(...)}`
 * 这类纯表达式属性输出（参考各页面调用处）。
 */

/** Thymeleaf 后缀表达式主体（不含 ${} 包裹），引用局部变量 w/provider/fmt */
export const CDN_SUFFIX_RAW =
  "w == 0 || provider == 'none' ? '' : provider == 'halo' ? '?width=' + w : provider == 'aliyun_esa' ? '?image_process=resize,w_' + w : provider == 'aliyun_oss' ? '?x-oss-process=image/resize,w_' + w : provider == 'tencent_eo' ? '?eo-img.resize=w/' + w : provider == 'tencent_cos' ? '?imageMogr2/thumbnail/' + w + 'x' : provider == 'qiniu' ? '?imageView2/2/w/' + w : provider == 'upyun' ? '!/fw/' + w : provider == 'custom' ? #strings.replace(#strings.defaultString(fmt, ''), '{width}', '' + w) : ''";

/**
 * 生成图片尺寸后缀的完整 th:with 局部变量串。
 * @param widthDefault 宽度取值表达式（Thymeleaf），如 "p?.banner_width ?: 1920"
 */
export function imageSuffixThWith(widthDefault: string): string {
  return (
    "p=${theme.config?.performance?.imageProcessing}, " +
    "provider=${p?.provider ?: 'none'}, " +
    "w=${" +
    widthDefault +
    "}, " +
    "fmt=${p?.custom_format ?: ''}, " +
    "suffix=${" +
    CDN_SUFFIX_RAW +
    "}"
  );
}

/** 各 CDN 服务商的后缀模板（{width} 为占位符），与 CDN_SUFFIX_RAW 保持一致 */
export const CDN_SUFFIX_PATTERNS: Record<string, string> = {
  halo: "?width={width}",
  aliyun_esa: "?image_process=resize,w_{width}",
  aliyun_oss: "?x-oss-process=image/resize,w_{width}",
  tencent_eo: "?eo-img.resize=w/{width}",
  tencent_cos: "?imageMogr2/thumbnail/{width}x",
  qiniu: "?imageView2/2/w/{width}",
  upyun: "!/fw/{width}",
};

/** 按 provider/width 生成图片处理后缀（浏览器端运行时使用） */
export function makeImageSuffix(
  provider: string,
  width: number,
  customFormat = "",
): string {
  if (!width || provider === "none") return "";
  if (provider === "custom") {
    return customFormat ? customFormat.replace("{width}", String(width)) : "";
  }
  const pattern = CDN_SUFFIX_PATTERNS[provider];
  return pattern ? pattern.replace("{width}", String(width)) : "";
}

/**
 * Banner 显示模式相关 th:with 局部变量串，供 Layout.astro 的 <html> 使用：
 * - bannerMode  —— 有效显示模式（layout.bannerLayout 优先，兜底 'banner'）。
 *                  用嵌套 #strings.defaultString 而非链式 Elvis
 *                  （Thymeleaf 无法解析括号包裹的链式 ?:，会 500）。
 * - bannerHasMedia —— 当前是否为「横幅/全屏」（有横幅媒体）；
 *                  transparent 与 disabled 都视为无横幅。
 * 定义在 <html> 上后，整站模板直接引用这两个原子变量做条件判断。
 */
export function bannerModeThWith(): string {
  return (
    "bannerMode=${#strings.defaultString(theme.config?.layout?.bannerLayout?.displayMode, 'banner')}, " +
    "bannerHasMedia=${bannerMode == 'banner' or bannerMode == 'fullscreen'}"
  );
}

/**
 * Banner 渲染所需的 th:with 局部变量串：在图片处理后缀变量基础上追加
 * mode（single/carousel，缺省 single）、srcX（单图 URL + 可加后缀时的
 * 后缀，供 th:href/th:src 静态属性引用）与 isVideo（single 模式下 src
 * 以 .mp4/.webm 结尾）。mode/srcX/isVideo 依赖前面定义的局部变量
 * （Thymeleaf th:with 支持顺序引用）。桌面容器再追加移动端独立来源
 * 相关变量（useMobileSrc/mobileMode/mobileSrc/mobileImages/mobileActive），
 * 供移动端容器渲染条件与其内层 th:with 引用。
 */
export function bannerThWith(): string {
  const src =
    "#strings.defaultString(theme.config?.style?.bannerStyle?.src, '')";
  return (
    imageSuffixThWith("p?.banner_width ?: 1920") +
    ", " +
    bannerMediaVars(src, "theme.config?.style?.bannerStyle?.mode ?: 'single'") +
    ", " +
    bannerMobileVars()
  );
}

/**
 * 移动端容器内层 th:with：以同名变量 mode/srcX/isVideo 遮蔽外层值
 * （Thymeleaf 嵌套作用域，子元素可见内层），数据取外层的 mobile*
 * 局部变量；suffix 仍引用外层图片处理后缀。
 */
export function bannerMobileThWith(): string {
  return bannerMediaVars("mobileSrc", "mobileMode");
}

/** 生成 Banner 媒体块共用的 mode/srcX/isVideo 局部变量串（依赖外层 suffix）。 */
function bannerMediaVars(srcExpr: string, modeExpr: string): string {
  return (
    "mode=${" +
    modeExpr +
    "}, " +
    "srcX=${" +
    srcExpr +
    " + (" +
    cdnSuffixEligible(srcExpr) +
    " ? suffix : '')}, " +
    "isVideo=${mode == 'single' and " +
    "(" +
    urlEndsWith(srcExpr, ".mp4") +
    " or " +
    urlEndsWith(srcExpr, ".webm") +
    ")}"
  );
}

/**
 * 生成移动端独立来源局部变量串。mobileActive 是移动容器是否渲染的
 * 唯一条件源：开关开启且移动端文件非空（按移动端自身形态判定）；
 * 为 false 时移动容器不渲染，桌面容器在所有视口显示（空值回退）。
 * 与 public/assets/banner-src-switch.js 的 hasMobileSrc 判定保持同步
 * （双实现，改动需两处一致，同 CDN_SUFFIX_RAW 约定）。
 */
function bannerMobileVars(): string {
  const mobileSrc = "theme.config?.style?.bannerStyle?.mobile?.src";
  return (
    "useMobileSrc=${theme.config?.style?.bannerStyle?.useMobileSrc == true}, " +
    "mobileMode=${theme.config?.style?.bannerStyle?.mobile?.mode ?: 'single'}, " +
    "mobileSrc=${#strings.defaultString(" +
    mobileSrc +
    ", '')}, " +
    // th:each / #lists.isEmpty 对 null 均按空处理，无需 ?: {} 空 Map 兜底
    "mobileImages=${theme.config?.style?.bannerStyle?.mobile?.images}, " +
    // 移动端独立视频判定：供 MainGridLayout 的 banner-media.js 门控使用
    // （桌面/移动可独立配置：桌面单图 + 移动视频时 mobileActive 为 true 但桌面 isVideo 为 false）
    "mobileIsVideo=${mobileMode == 'single' and (" +
    urlEndsWith(mobileSrc, ".mp4") +
    " or " +
    urlEndsWith(mobileSrc, ".webm") +
    ")}, " +
    "mobileActive=${useMobileSrc and ((mobileMode == 'single' and !#strings.isEmpty(mobileSrc)) or (mobileMode == 'carousel' and !#lists.isEmpty(mobileImages)))}"
  );
}

/**
 * 生成轮播模式单张图片的完整 Thymeleaf src 表达式。
 * th:each 的循环变量 img 无法提升到 th:with，因此整个表达式由本函数
 * 生成，再经 `th:src={carouselImgSrcExpr()}` 属性表达式输出。
 */
export function carouselImgSrcExpr(): string {
  const img = "#strings.defaultString(img, '')";
  return "${" + img + " + (" + cdnSuffixEligible(img) + " ? suffix : '')}";
}

/**
 * 生成「URL 路径（去查询串后小写）以指定扩展名结尾」的 Thymeleaf 布尔表达式。
 *
 * 关键陷阱：Thymeleaf 的 #strings.substringBefore(url, '?') 在 URL 不含 '?'
 * 时返回 null（而非原字符串，与 Apache Commons Lang 行为不同）。一旦 null
 * 流入 endsWith 即抛 "Cannot apply endsWith on null"，服务端渲染直接中断。
 * 因此先经 #strings.contains 判断：仅当确实含查询串时才调用 substringBefore，
 * 否则沿用完整 URL。urlExpr 再以 defaultString 兜底 null（Thymeleaf Elvis
 * 操作符 ?: 对空字符串字面量 '' 存在求值为 null 的坑，故不用 ?: 而用方法调用）。
 */
function urlEndsWith(urlExpr: string, ext: string): string {
  const url = "#strings.defaultString(" + urlExpr + ", '')";
  const path =
    "#strings.contains(" +
    url +
    ", '?') ? #strings.substringBefore(" +
    url +
    ", '?') : " +
    url;
  return "#strings.endsWith(#strings.toLowerCase(" + path + "), '" + ext + "')";
}

/**
 * 生成「图片 URL 是否可追加 CDN 尺寸后缀」的 Thymeleaf 布尔表达式主体。
 * 仅静态 jpg/jpeg/png 追加，避免图片处理链路破坏 gif/webp/apng 动画。
 * 匹配路径末尾扩展名（先去掉查询串），避免 contains 对
 * "?src=x.mp4"/"/images/jpg/" 等子串误判。
 * @param urlExpr 图片 URL 的 Thymeleaf 表达式（需自带空值兜底，如 "img ?: ''"）
 */
export function cdnSuffixEligible(urlExpr: string): string {
  return (
    "(" +
    urlEndsWith(urlExpr, ".jpg") +
    " or " +
    urlEndsWith(urlExpr, ".jpeg") +
    " or " +
    urlEndsWith(urlExpr, ".png") +
    ")"
  );
}
