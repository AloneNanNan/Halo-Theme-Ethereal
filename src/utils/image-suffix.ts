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
 * 当前 provider 的后缀模板表达式（保留 `{width}` 占位符，如 `?image_process=resize,w_{width}`）。
 * srcset 要在同一张图上生成多档候选，逐个 `#strings.replace(pat, '{width}', '400')`
 * 比重写一遍「provider × 档位」的候选串省得多。与 CDN_SUFFIX_RAW 同源；
 * none/halo 映射到 `?width={width}`，未识别 provider 与 custom 未填格式时为空串。
 */
export const CDN_PATTERN_RAW =
  "provider == 'none' ? '?width={width}' : " +
  Object.entries(CDN_SUFFIX_PATTERNS)
    .map(([name, pattern]) => `provider == '${name}' ? '${pattern}'`)
    .join(" : ") +
  " : provider == 'custom' ? #strings.defaultString(fmt, '') : ''";

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
    // pat：srcset 分档用的后缀模板；wn：banner_width 的数值形态——FormKit
    // number 在配置里可能是字符串，比较前统一转 Integer（空值回退 0）
    "pat=${" +
    CDN_PATTERN_RAW +
    "}, " +
    "wn=${#strings.isEmpty('' + w) ? 0 : #conversions.convert(w, 'java.lang.Integer')}, " +
    bannerSrcsetTokens() +
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
    // rawBase：剥掉查询串的原始 URL（拼后缀的基准）；elig：能否加后缀
    // （两者都被 srcset 与 srcX 复用，提出来避免同一长表达式重复展开多次）
    "rawBase=${" +
    withoutQuery("rawSrc") +
    "}, " +
    "elig=${" +
    cdnSuffixEligible("rawSrc") +
    "}, " +
    // rawSrcset：<img> 的 th:srcset 与首页 preload 的 imagesrcset 复用同一表达式
    // （为 null 时不输出，条件见 bannerSrcsetInner）
    "rawSrcset=${" +
    bannerSrcsetInner("rawBase", "elig") +
    "}, " +
    // srcX：加后缀前先剥掉原 URL 自身的查询串，否则会拼出
    // `x.webp?v=2?image_process=...` 这种坏 URL（后缀静默失效）；不加后缀时
    // 原样保留 rawSrc，避免误删 URL 自身的参数
    "srcX=${elig and suffix != '' ? rawBase + suffix : rawSrc}, " +
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
 * 轮播单张图的 th:with 局部变量串（引用 th:each 循环变量 img）。
 *
 * 每张图的 URL 相关量（去查询串基准 cbase、准入判定 celig）逐张算一次，供该图的
 * th:src / th:srcset 引用；否则同一段长表达式要在两个属性里各展开一遍（多图时属性
 * 体积成倍膨胀）。th:each 优先级 200 先于 th:with 的 600 执行，故 img 在此已可用。
 */
export function carouselThWith(): string {
  // craw 先落一次空值兜底：否则 withoutQuery / urlEndsWith 各自再包一层
  // #strings.defaultString，同一段长表达式要重复展开多次
  return (
    "craw=${#strings.defaultString(img, '')}, " +
    "cbase=${" +
    withoutQuery("craw") +
    "}, " +
    "celig=${" +
    cdnSuffixEligible("craw") +
    "}"
  );
}

/** 生成轮播模式单张图片的完整 Thymeleaf src 表达式（引用 carouselThWith 的 cbase/celig） */
export function carouselImgSrcExpr(): string {
  return "${celig and suffix != '' ? cbase + suffix : craw}";
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

/** 固定档位中的最大宽度；Banner 宽度超过它时才会被追加为额外顶档 */
const BANNER_SRCSET_TOP_WIDTH =
  BANNER_THUMB_SRCSET_WIDTHS[BANNER_THUMB_SRCSET_WIDTHS.length - 1];

/**
 * srcset 候选片段变量串：`c400`~`c1600` 是「该档后缀 + 宽度描述符」，`ctop` 是
 * banner_width 顶档片段（同构）。它们只与 provider / banner_width 有关、与图片 URL
 * 无关，故整页只算一次、单图与轮播共用——否则每个候选都要重复展开一次
 * `#strings.replace(...)`，轮播多图时属性体积会成倍膨胀。
 *
 * 注意：片段**不含基准 URL 也不含分隔符**，拼接时由调用方补 `base + c<N>`，分隔符
 * 写在候选之间（末尾不留悬空逗号）。
 */
function bannerSrcsetTokens(): string {
  const tiers = BANNER_THUMB_SRCSET_WIDTHS.map(
    (width) =>
      "c" + width + "=${" + candidateBody(`'${width}'`, `'${width}'`) + "}",
  ).join(", ");
  return tiers + ", ctop=${" + candidateBody("'' + wn", "wn") + "}";
}

/**
 * 单个 srcset 候选片段主体：`<该档后缀> + ' <描述符>w'`。
 * @param widthExpr `{width}` 的替换值 token（固定档为字面量 `'400'`，顶档为 `'' + wn`）
 * @param labelExpr 描述符里的宽度 token（固定档为 `'400'`，顶档为 `wn`）
 */
function candidateBody(widthExpr: string, labelExpr: string): string {
  return (
    "#strings.replace(pat, '{width}', " +
    widthExpr +
    ") + ' ' + " +
    labelExpr +
    " + 'w'"
  );
}

/**
 * 固定档位候选串：`base + c400 + ', ' + base + c800 …`。分隔符写在候选之间，
 * 末尾不留悬空逗号（CDN 且 banner_width ≤ 1600 时会走到该分支）。
 */
function srcsetLadder(base: string): string {
  return BANNER_THUMB_SRCSET_WIDTHS.map((width) => base + " + c" + width).join(
    " + ', ' + ",
  );
}

/**
 * 全宽 Banner 单张图 srcset 的 Thymeleaf 表达式主体（不含 `${...}` 包裹）。
 *
 * 必须自带 srcset：Halo 2.22+ 会给「没有 srcset 的 <img>」注入按内容卡设计的默认
 * 档位（桌面上限 800px），全宽 Banner 会被误导选小图拉伸发虚。
 *
 * - 内部链路（provider none/halo）：固定四档 + **原图兜底档**（Halo 缩略图最高
 *   1600w，宽屏/HiDPI 不纳入原图会放大发虚，issue #71）。与引入 CDN 档位前一致。
 * - 外部 CDN/custom：同样四档，顶档改用 `banner_width` 而非原图（CDN 原图可能数 MB，
 *   宽屏会挑走它，比单档大图还费流量）；仅 > 1600 时追加，避免重复描述符。
 *   此分支在 provider 无模板、`banner_width == 0`（后台选了不压缩）、URL 扩展名不在
 *   SUFFIX_ELIGIBLE_EXTENSIONS 时返回 null → 不输出 srcset，回退 `src` 单档。
 *
 * 已知局限：内部链路未判扩展名，Halo 不支持的格式（如 webp）各档会退化为原图。
 *
 * @param base 已剥查询串的基准 URL token（单图传 "rawBase"，轮播传 "cbase"）
 * @param eligToken 准入判定 token（单图传 "elig"，轮播传 "celig"）
 */
function bannerSrcsetInner(base: string, eligToken: string): string {
  const ladder = srcsetLadder(base);
  return (
    "!#strings.isEmpty(" +
    base +
    ") ? (" +
    "((provider == 'none') or (provider == 'halo')) ? (" +
    ladder +
    " + ', ' + " +
    base +
    " + ' " +
    BANNER_ORIGINAL_SRCSET_WIDTH +
    "w') : ((pat == '' or w == 0 or !(" +
    eligToken +
    ")) ? null : (" +
    ladder +
    " + (wn > " +
    BANNER_SRCSET_TOP_WIDTH +
    " ? ', ' + " +
    base +
    " + ctop : '')" +
    "))" +
    ") : null"
  );
}

/** 生成全宽 Banner 单张图的 `th:srcset` 表达式文本（含 `${...}` 包裹） */
function bannerSrcsetExpr(base: string, eligToken: string): string {
  return "${" + bannerSrcsetInner(base, eligToken) + "}";
}

/** 轮播模式单张图的 th:srcset 表达式（引用 carouselThWith 的 cbase/celig） */
export function carouselSrcsetExpr(): string {
  return bannerSrcsetExpr("cbase", "celig");
}

/**
 * 生成「去掉 URL 查询串」的 Thymeleaf 表达式：判断扩展名（urlEndsWith）与拼后缀前
 * 清掉原 URL 参数（srcX / srcset 档位）都用它，否则会拼出
 * `x.webp?v=2?image_process=...` 这种 CDN 解析不了的坏 URL。
 *
 * 陷阱：`#strings.substringBefore(url, '?')` 在 URL 不含 '?' 时返回 null（非原串），
 * null 流入 endsWith/拼接会直接中断服务端渲染 —— 必须先 contains 再调用。
 */
function withoutQuery(urlExpr: string): string {
  // 必须整体加括号：?: 优先级低于拼接的 +，调用方写作 withoutQuery(x) + suffix，
  // 不加括号会被解析成 `cond ? a : b + suffix`（三元分支吞掉后续拼接）
  return (
    "(#strings.contains(" +
    urlExpr +
    ", '?') ? #strings.substringBefore(" +
    urlExpr +
    ", '?') : " +
    urlExpr +
    ")"
  );
}

/**
 * 生成「URL 路径（去查询串后小写）以指定扩展名结尾」的 Thymeleaf 布尔表达式。
 * urlExpr 先经 defaultString 兜底 null（?: 对空字符串字面量有求值为 null 的坑），
 * 再交给 withoutQuery 去掉查询串。
 */
function urlEndsWith(urlExpr: string, ext: string): string {
  const url = "#strings.defaultString(" + urlExpr + ", '')";
  return (
    "#strings.endsWith(#strings.toLowerCase(" +
    withoutQuery(url) +
    "), '" +
    ext +
    "')"
  );
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
