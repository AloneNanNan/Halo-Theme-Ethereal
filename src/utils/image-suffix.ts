/**
 * 图片 CDN 处理参数（尺寸后缀）生成。
 *
 * 主题中同一套 provider → 后缀规则存在两处执行环境：
 * 1. 服务端 Thymeleaf 渲染（Halo 后台）—— 见 CDN_SUFFIX_RAW / imageSuffixThWith；
 * 2. 浏览器端运行时（文章正文图片处理，is:inline 脚本）—— 见 CDN_SUFFIX_PATTERNS。
 *
 * 单一数据源约定（新增/调整规则只改本文件）：
 * - 服务端 CDN_SUFFIX_RAW 由 CDN_SUFFIX_PATTERNS 构建期生成；
 * - 扩展名白名单 SUFFIX_ELIGIBLE_EXTENSIONS 同时供服务端 cdnSuffixEligible 与
 *   客户端 isSuffixEligible（经 post.astro 的 define:vars 注入）使用。
 *
 * 注意：Astro 构建器对含 Thymeleaf 表达式（${...}）的属性值不做插值解析，
 * 因此 th:with 必须整体由本函数生成，再通过 `th:with={imageSuffixThWith(...)}`
 * 这类纯表达式属性输出（参考各页面调用处）。
 */

/** 可追加 CDN 尺寸后缀的图片扩展名白名单（服务端 / 浏览器端共用同一来源） */
export const SUFFIX_ELIGIBLE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];

/** 各 CDN 服务商的后缀模板（{width} 为占位符），服务端/浏览器端共用的单一数据源 */
export const CDN_SUFFIX_PATTERNS: Record<string, string> = {
  halo: "?width={width}",
  aliyun_esa: "?image_process=resize,w_{width}",
  aliyun_oss: "?x-oss-process=image/resize,w_{width}",
  tencent_eo: "?eo-img.resize=w/{width}",
  tencent_cos: "?imageMogr2/thumbnail/{width}x",
  qiniu: "?imageView2/2/w/{width}",
  upyun: "!/fw/{width}",
};

/** 把 {width} 模板转成 Thymeleaf 文本拼接表达式，如 "?width={width}" → "'?width=' + w" */
function patternToThymeleafExpr(pattern: string): string {
  const [prefix, suffix = ""] = pattern.split("{width}");
  const parts: string[] = [];
  if (prefix) parts.push(`'${prefix}'`);
  parts.push("w");
  if (suffix) parts.push(`'${suffix}'`);
  return parts.join(" + ");
}

/**
 * Thymeleaf 后缀表达式主体（不含 ${} 包裹），引用局部变量 w/provider/fmt。
 * 由 CDN_SUFFIX_PATTERNS 构建期生成，避免手写第二份映射造成漂移。
 */
export const CDN_SUFFIX_RAW =
  "w == 0 || provider == 'none' ? '' : " +
  Object.entries(CDN_SUFFIX_PATTERNS)
    .map(
      ([name, pattern]) =>
        `provider == '${name}' ? ${patternToThymeleafExpr(pattern)}`,
    )
    .join(" : ") +
  " : provider == 'custom' ? #strings.replace(#strings.defaultString(fmt, ''), '{width}', '' + w) : ''";

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
 * mode（single/carousel，缺省 single）、rawSrc（未拼后缀的原始图 URL，
 * 供 Banner 显式 srcset 基于原图生成档位）、srcX（rawSrc + 可加后缀时的
 * 后缀，供 th:href/th:src 静态属性引用）与 isVideo（single 模式下 src
 * 以 .mp4/.webm 结尾）。以上变量依赖前面定义的局部变量（Thymeleaf th:with
 * 支持顺序引用）。桌面容器再追加移动端独立来源相关变量
 * （useMobileSrc/mobileMode/mobileSrc/mobileImages/mobileActive），
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

/** 生成 Banner 媒体块共用的 mode/rawSrc/rawSrcset/srcX/isVideo 局部变量串（依赖外层 suffix）。 */
function bannerMediaVars(srcExpr: string, modeExpr: string): string {
  return (
    "mode=${" +
    modeExpr +
    "}, " +
    // rawSrc：未拼 CDN/缩略图后缀的原始图 URL。srcset 各档必须基于它生成
    // （见 bannerSrcsetInner），不得拿带后缀的 srcX 继续追加 ?width 参数
    "rawSrc=${" +
    srcExpr +
    "}, " +
    // rawSrcset：单图 srcset 候选串，供 <img> 的 th:srcset 与首页 preload 的
    // imagesrcset 复用同一表达式（provider 非 none/halo 时为 null，属性不输出）
    "rawSrcset=${" +
    bannerSrcsetInner("rawSrc") +
    "}, " +
    "srcX=${rawSrc + (" +
    cdnSuffixEligible("rawSrc") +
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
 * 全宽 Banner 显式 srcset 的「原图兜底档」标称宽度。
 *
 * 渲染期无法得知原图真实像素宽，而 Halo 缩略图最高只到 xl=1600w：若不把原图
 * 纳入 srcset，宽屏（>1600css 视口）或 HiDPI 屏上浏览器会止步于 1600w，放大后
 * 仍发虚（issue #71）。此标称值只需 >= 常规 Banner 原图宽度，即可让浏览器在该
 * 场景优先选原图档。真实下载的是不带 ?width 参数的原图 URL，标称值仅影响候选
 * 挑选，不会造成图片 upscale 失真（原图不足该宽时下载的仍是原图本身）。
 */
const BANNER_ORIGINAL_SRCSET_WIDTH = 3840;

/** Halo 官方缩略图档位（s/m/l/xl），即 ThumbnailSize 预设宽度 */
const BANNER_THUMB_SRCSET_WIDTHS = [400, 800, 1200, 1600];

/**
 * 全宽 Banner 单张图 srcset 的 Thymeleaf 表达式主体（不含 `${...}` 包裹）。
 *
 * 背景：Halo 2.22+ 的 ThumbnailImgTagPostProcessor 会给「没有 srcset 属性的
 * <img>」注入一套按内容卡模型设计的默认 srcset/sizes（桌面上限 800px），全宽
 * Banner 被误导选 400~800w 小图后拉伸发虚。只要 <img> 自带 srcset，核心即跳过
 * 注入。此处输出官方四档（400/800/1200/1600）+ 原图兜底，由浏览器按视口挑档。
 *
 * 仅当图片处理为 Halo 内部语义（provider none/halo，URL 走 Halo ?width 缩略图
 * 链路）时输出档位；其余 CDN 场景返回 null——src 已是 CDN 处理大图，CDN URL 上
 * 拼 ?width 无意义；Thymeleaf 对 null 会移除属性，即完全不输出 srcset，与改动前
 * 行为一致（也不会被核心注入 ?width）。
 *
 * 已知局限：此处的档位 URL 统一按 Halo ?width 链路拼装，未做扩展名判断。对 Halo
 * 不支持的格式（如 webp）?width 不生效，各档会退化为原图（不会糊，也无额外带宽）；
 * 与 WebP 相关的一致性问题详见 SUFFIX_ELIGIBLE_EXTENSIONS 处的说明。
 *
 * @param urlVar 图片原始 URL（无 CDN/缩略图后缀）的 Thymeleaf 变量或表达式
 *   token，如 "rawSrc" 或 "#strings.defaultString(img, '')"，须为外层
 *   th:with / th:each 作用域内可引用
 */
function bannerSrcsetInner(urlVar: string): string {
  return (
    "((provider == 'none') or (provider == 'halo')) and !#strings.isEmpty(" +
    urlVar +
    ") ? " +
    BANNER_THUMB_SRCSET_WIDTHS.map((w) => {
      return `${urlVar} + '?width=${w} ${w}w, ' + `;
    }).join("") +
    `${urlVar} + ' ${BANNER_ORIGINAL_SRCSET_WIDTH}w' : null`
  );
}

/** 生成全宽 Banner 单张图的 `th:srcset` 表达式文本（含 `${...}` 包裹） */
function bannerSrcsetExpr(urlVar: string): string {
  return "${" + bannerSrcsetInner(urlVar) + "}";
}

/** 轮播模式（th:each 循环变量 img）版本的 bannerSrcsetExpr */
export function carouselSrcsetExpr(): string {
  return bannerSrcsetExpr("#strings.defaultString(img, '')");
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
 *
 * 处理 SUFFIX_ELIGIBLE_EXTENSIONS（jpg/jpeg/png/webp）：webp 虽可能为动图
 * （animated WebP），但静态 webp 占绝大多数，排除它会让主流静态图白白损失优化
 * （Halo 官方缩略图亦不支持 webp）；gif 是唯一能靠扩展名可靠识别的动图格式，故
 * 排除。已知局限：APNG 扩展名同为 .png，无法靠扩展名区分，只能一并处理。
 *
 * 白名单来自共享常量 SUFFIX_ELIGIBLE_EXTENSIONS，与 post.astro 正文图脚本
 * （浏览器端 isSuffixEligible）同源，避免两边规则漂移。
 *
 * 匹配路径末尾扩展名（先去掉查询串），避免 contains 对
 * "?src=x.mp4"/"/images/jpg/" 等子串误判。
 * @param urlExpr 图片 URL 的 Thymeleaf 表达式（需自带空值兜底，如 "img ?: ''"）
 */
export function cdnSuffixEligible(urlExpr: string): string {
  return (
    "(" +
    SUFFIX_ELIGIBLE_EXTENSIONS.map((ext) => urlEndsWith(urlExpr, ext)).join(
      " or ",
    ) +
    ")"
  );
}
