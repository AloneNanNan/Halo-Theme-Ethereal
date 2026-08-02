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
  "w == 0 || provider == 'none' ? '' : provider == 'halo' ? '?width=' + w : provider == 'aliyun_esa' ? '?image_process=resize,w_' + w : provider == 'aliyun_oss' ? '?x-oss-process=image/resize,w_' + w : provider == 'tencent_eo' ? '?eo-img.resize=w/' + w : provider == 'tencent_cos' ? '?imageMogr2/thumbnail/' + w + 'x' : provider == 'qiniu' ? '?imageView2/2/w/' + w : provider == 'upyun' ? '!/fw/' + w : provider == 'custom' ? #strings.replace(fmt, '{width}', '' + w) : ''";

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
