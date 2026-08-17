/**
 * 动画速度「自定义档」时长变量生成的 Thymeleaf 表达式。
 *
 * 将 Layout.astro 中原本超长的一行 th:style 三元表达式拆分为：
 *  - SPEED_CUSTOM_DEFAULTS：9 项默认时长（ms）的唯一来源；
 *  - speedCustomStyleThWith()：生成 th:with 局部变量（sc / isCustom）；
 *  - speedCustomStyleThExpr()：生成 th:style 表达式主体。
 *
 * ⚠️ 默认值同步须知：修改某时长默认值请只改 SPEED_CUSTOM_DEFAULTS，
 * 但需同步三处保持渲染一致——
 * ① speed.css 的 :root（均衡档）同名变量
 * ② settings.yaml 动画速度组 value 与各 number 的 value
 * ③ 本文件的 SPEED_CUSTOM_DEFAULTS
 */

/** 自定义档各动画时长默认值（ms），唯一来源 */
export const SPEED_CUSTOM_DEFAULTS = {
  swup: 200,
  entry: 300,
  entryStep: 50,
  entryMax: 400,
  contentDelay: 150,
  scroll: 700,
  float: 350,
  banner: 700,
  carouselTransition: 700,
} as const;

/**
 * 生成 Layout.astro th:with 的局部变量串：
 * sc —— 自定义时长配置对象（缺省空对象，配合 Elvis 兜底）
 * isCustom —— 当前是否自定义档
 */
export function speedCustomStyleThWith(): string {
  return (
    "sc=${theme.config?.style?.animationSpeed?.speedCustom ?: {}}, " +
    "isCustom=${theme.config?.style?.animationSpeed?.speedTier == 'custom'}"
  );
}

/**
 * 生成 Layout.astro th:style 的 Thymeleaf 表达式主体：
 * 自定义档拼接 9 个时长变量（轮播停留 dwellMs 为独立配置，不走档位），否则空串。
 * 轮播切换动画时长 --dur-banner-transition 仍随档位。
 */
export function speedCustomStyleThExpr(): string {
  const {
    swup,
    entry,
    entryStep,
    entryMax,
    contentDelay,
    scroll,
    float,
    banner,
    carouselTransition,
  } = SPEED_CUSTOM_DEFAULTS;
  return (
    "${isCustom ? " +
    "'--dur-swup:' + (sc.swup ?: " +
    swup +
    ") + 'ms;' + " +
    "'--dur-entry:' + (sc.entry ?: " +
    entry +
    ") + 'ms;' + " +
    "'--dur-entry-step:' + (sc.entryStep ?: " +
    entryStep +
    ") + 'ms;' + " +
    "'--dur-entry-max:' + (sc.entryMax ?: " +
    entryMax +
    ") + 'ms;' + " +
    "'--content-delay:' + (sc.contentDelay ?: " +
    contentDelay +
    ") + 'ms;' + " +
    "'--dur-scroll:' + (sc.scroll ?: " +
    scroll +
    ") + 'ms;' + " +
    "'--dur-float:' + (sc.float ?: " +
    float +
    ") + 'ms;' + " +
    "'--dur-banner:' + (sc.banner ?: " +
    banner +
    ") + 'ms;' + " +
    "'--dur-banner-transition:' + (sc.carouselTransition ?: " +
    carouselTransition +
    ") + 'ms' " +
    ": ''}"
  );
}
