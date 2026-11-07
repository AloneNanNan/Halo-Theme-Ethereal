/**
 * 响应式图片与 Banner 媒体变量的 Thymeleaf 表达式生成。
 * 缩略图统一走 Halo 官方 thumbnail.gen(uri, size)（Halo 2.19+，档位 s/m/l/xl =
 * 400/800/1200/1600），主题不再自己拼图片 URL 参数；外部图床的图片由 Halo 重定向回原图。
 * Astro 不对含 ${...} 的属性值做插值，故表达式必须由本文件生成后以纯属性输出。
 */

/** 官方 ThumbnailSize 档位；改动需与 Halo 的枚举保持一致 */
type ThumbTier = readonly [size: string, width: number];

const THUMB_TIERS: readonly ThumbTier[] = [
  ["s", 400],
  ["m", 800],
  ["l", 1200],
  ["xl", 1600],
];

/** 卡片封面只要前两档：卡片宽约 348px，400 覆盖 1x、800 覆盖 2x */
const CARD_TIERS: readonly ThumbTier[] = THUMB_TIERS.slice(0, 2);

/** 原图兜底档的标称宽度：缩略图最高 1600，全宽 Banner 不纳入原图会在宽屏放大发虚 */
const ORIGINAL_SRCSET_WIDTH = 3840;

/**
 * 生成 srcset 的完整 Thymeleaf 表达式（含 ${...}）：逐档调用 thumbnail.gen 拼成候选串，
 * URL 为空时返回 null（Thymeleaf 会移除属性），避免对空地址调用缩略图接口。
 * 用 SpEL 拼接而不是 |...| 字面量替换：字面量替换无法在外层套空值三元。
 * @param urlToken 图片 URL 的 Thymeleaf token（"rawSrc" / "img" / "post.spec.cover"）
 * @param tiers 使用的档位（卡片传 CARD_TIERS）
 * @param withOriginal 末尾追加原图档（仅全宽 Banner 需要）
 */
function thumbSrcset(
  urlToken: string,
  tiers: readonly ThumbTier[] = THUMB_TIERS,
  withOriginal = false,
): string {
  const candidates = tiers.map(
    ([size, width]) =>
      "thumbnail.gen(" + urlToken + ", '" + size + "') + ' " + width + "w'",
  );
  if (withOriginal) {
    candidates.push(urlToken + " + ' " + ORIGINAL_SRCSET_WIDTH + "w'");
  }
  return (
    "${#strings.isEmpty(" +
    urlToken +
    ") ? null : " +
    candidates.join(" + ', ' + ") +
    "}"
  );
}

/** 全宽 Banner 的 srcset（四档 + 原图兜底）：Halo 注入的档位上限 1600，宽屏需要原图 */
export function bannerSrcsetExpr(): string {
  return thumbSrcset("rawSrc", THUMB_TIERS, true);
}

/** 轮播单张图的 srcset（引用 th:each 的 img） */
export function carouselSrcsetExpr(): string {
  return thumbSrcset("img");
}

/** 轮播单张图的 src（Astro 会解析裸 ${img}，故由函数输出纯表达式） */
export function carouselImgSrcExpr(): string {
  return "${img}";
}

/** 卡片封面 srcset（两档，见 CARD_TIERS） */
export function cardCoverSrcsetExpr(): string {
  return thumbSrcset("post.spec.cover", CARD_TIERS);
}

/** 卡片封面 src */
export function cardCoverSrcExpr(): string {
  return "${post.spec.cover}";
}

/** 文章封面 srcset：内容列全宽，四档 */
export function postCoverSrcsetExpr(): string {
  return thumbSrcset("post.spec.cover");
}

/** 文章封面 src */
export function postCoverSrcExpr(): string {
  return "${post.spec.cover}";
}

/**
 * Banner 显示模式相关 th:with 局部变量串，供 Layout.astro 的 <html> 使用：
 * bannerMode（有效模式，缺省 'banner'；用嵌套 #strings.defaultString 而非链式
 * Elvis——Thymeleaf 不能解析括号包裹的链式 ?:）、bannerHasMedia（是否为
 * 横幅/全屏；transparent 与 disabled 视为无横幅）。
 */
export function bannerModeThWith(): string {
  return (
    "bannerMode=${#strings.defaultString(theme.config?.layout?.bannerLayout?.displayMode, 'banner')}, " +
    "bannerHasMedia=${bannerMode == 'banner' or bannerMode == 'fullscreen'}"
  );
}

/**
 * Banner 渲染所需的 th:with 局部变量串：mode（single/carousel，缺省 single）、
 * rawSrc（原始图 URL，同时是 src 与 srcset 的基准）、isVideo（single 模式下
 * src 以 .mp4/.webm 结尾），变量按顺序引用（th:with 支持）。桌面容器再追加移动端
 * 独立来源变量（useMobileSrc / mobileMode / mobileSrc / mobileImages / mobileActive），
 * 供移动端容器渲染条件与其内层 th:with 引用。
 */
export function bannerThWith(): string {
  const src =
    "#strings.defaultString(theme.config?.style?.bannerStyle?.src, '')";
  return (
    bannerMediaVars(src, "theme.config?.style?.bannerStyle?.mode ?: 'single'") +
    ", " +
    bannerMobileVars()
  );
}

/**
 * 移动端容器内层 th:with：以同名变量 mode/rawSrc/isVideo 遮蔽外层值
 * （Thymeleaf 嵌套作用域，子元素可见内层），数据取外层的 mobile* 局部变量。
 */
export function bannerMobileThWith(): string {
  return bannerMediaVars("mobileSrc", "mobileMode");
}

/** 生成 Banner 媒体块共用的 mode/rawSrc/isVideo 局部变量串 */
function bannerMediaVars(srcExpr: string, modeExpr: string): string {
  return (
    "mode=${" +
    modeExpr +
    "}, " +
    "rawSrc=${" +
    srcExpr +
    "}, " +
    "isVideo=${mode == 'single' and " +
    "(" +
    urlEndsWith(srcExpr, ".mp4") +
    " or " +
    urlEndsWith(srcExpr, ".webm") +
    ")}"
  );
}

/**
 * 生成移动端独立来源局部变量串。mobileActive 是移动容器是否渲染的唯一条件源：开关开启且
 * 移动端文件非空（按移动端自身形态判定）；为 false 时移动容器不渲染、桌面容器全视口显示。
 * 与 public/assets/banner-src-switch.js 的 hasMobileSrc 判定双实现同步，改动需两处一致。
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
 * 生成「去掉 URL 查询串」的 Thymeleaf 表达式：判断视频扩展名要先清参数，
 * 否则带 ? 的地址判不出结尾。
 * 陷阱：`#strings.substringBefore(url, '?')` 对不含 '?' 的 URL 返回 null（会中断
 * 服务端渲染），必须先 contains 再调用。
 */
function withoutQuery(urlExpr: string): string {
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
