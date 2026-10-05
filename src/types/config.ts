import type { AUTO_MODE, DARK_MODE, LIGHT_MODE } from "../constants/constants";

// ========== 顶层配置 ==========
export interface ThemeConfig {
  layout: Layout;
  style: Style;
  sidebar: Sidebar;
  extendPages: ExtendPages;
  post: Post;
  footer: Footer;
  links: Links;
  external_link: ExternalLink;
}

/** 扩展页面设置：朋友圈 / 时间轴 / 技能 / 关于页面 / 打赏页面（后台未配置的子组可能缺失，均视为可选） */
export interface ExtendPages {
  friends?: Friends;
  timeline?: Timeline;
  skills?: Skills;
  about?: About;
  /** 打赏页面（extendPages.reward） */
  reward?: Reward;
}

/** 欢迎弹窗配置 */
export interface WelcomePopupConfig {
  /** 功能总开关 */
  enable?: boolean;
  /** 弹窗位置：top-left / top-right / bottom-left / bottom-right（移动端固定底部居中） */
  position?: string;
  /** 欢迎标题 */
  title?: string;
  /** 欢迎语模板，{location} 为访客 IP 定位占位符 */
  template?: string;
  /** 定位失败时的降级文案（替换 {location}） */
  fallbackLocation?: string;
}

export interface ThemeColor {
  hue: number;
}

/** Banner 样式：类型/图片来源/轮播/位置/版权等 */
export interface BannerStyle {
  /** 展示形态：single 单图/视频（默认）| carousel 多图轮播 */
  mode?: string;
  src: string;
  /** 是否显示右下角播放/暂停按钮（视频模式，默认显示；移动端沿用） */
  showPauseBtn?: boolean;
  /** 轮播配置（mode == 'carousel' 时生效） */
  carousel?: BannerCarousel;
  /** 是否启用移动端（<768px）独立来源 */
  useMobileSrc?: boolean;
  /** 移动端独立来源（useMobileSrc 开启时生效）；行为设置沿用电脑端 */
  mobile?: BannerMobile;
  position: string;
  credit: Credit;
}

/** 移动端独立来源配置（仅文件与形态，行为设置沿用电脑端） */
export interface BannerMobile {
  /** 移动端展示形态：single 单图/视频（默认）| carousel 多图轮播，可与电脑端不同 */
  mode?: string;
  /** 移动端单图/视频 URL（single 模式） */
  src?: string;
  /** 移动端轮播图片 URL 数组（carousel 模式） */
  images?: string[];
}

/** 多图轮播配置 */
export interface BannerCarousel {
  /** 轮播图片 URL 数组（attachment multiple） */
  images?: string[];
  /** 切换效果：fade 淡入淡出（默认）| slide 左右滑动 */
  effect?: string;
  /** 是否显示右下角指示点 */
  dots?: boolean;
  /** 预加载当前图之后的 N 张 */
  preloadCount?: number;
  /** 每张图片停留时长（ms），独立于动画速度档位 */
  dwellMs?: number;
}

export interface BannerText {
  enable?: boolean;
  title?: string;
  titleFontSize?: string;
  subtitles?: string;
  subtitleFontSize?: string;
  subtitleEffect?: string;
  /** Banner 链接（标题/副标题下方的链接图标行） */
  links?: BannerTextLinks;
}

/** Banner 链接设置组：theme.config.style.bannerText.links */
export interface BannerTextLinks {
  /** 链接条目列表；留空时不渲染链接行 */
  items?: BannerLinkItem[];
}

export interface BannerLinkItem {
  /** Iconify 图标（format: svg，取 value 内联输出 SVG）；留空则只渲染名称文字 */
  icon?: { value?: string };
  /** 名称：填写后按钮为「图标 + 名称」胶囊样式并作悬停提示；留空则仅圆形图标按钮 */
  name?: string;
  /** 跳转地址：网址 / mailto: / 站内路径 */
  url?: string;
}

export interface Credit {
  enable: boolean;
  text: string;
  url: string;
}

// ========== 布局设置 ==========
export interface Layout {
  /** Banner 布局：仅显示模式切换 + 全屏透明模式的透明度/模糊设置 */
  bannerLayout: BannerLayout;
  /** 菜单栏设置 */
  mobileMenu?: MobileMenuConfig;
  /** 页面布局 */
  pageLayout: PageLayout;
  /** 文章卡片布局 */
  postList?: PostList;
  /** 浮动导航按钮 */
  floatingButtons?: FloatingButtons;
  /** 欢迎弹窗 */
  welcome?: WelcomePopupConfig;
}

/** Banner 布局：仅显示模式切换 + 全屏透明模式的透明度/模糊设置 */
export interface BannerLayout {
  /** 显示模式：disabled 关闭 | banner 横幅模式（默认，首页延伸 65vh）| fullscreen 全屏模式（首页 100vh）| transparent 全屏透明（无横幅、整屏壁纸背景） */
  displayMode?: "disabled" | "banner" | "fullscreen" | "transparent";
  /** 全屏布局（仅 displayMode === "fullscreen" 生效）：classic 经典（壁纸在文档流、不模糊，默认）| hero 沉浸（壁纸钉视口 + 首页滚动模糊斜坡 + 标题淡出 + 非首页固定模糊） */
  fullscreenLayout?: "classic" | "hero";
  /** 全屏透明模式：壁纸整体不透明度（0.3-1，默认 0.8，仅 transparent 模式生效） */
  wallpaperOpacity?: number;
  /** 背景模糊强度（px，0-24）：transparent 模式为壁纸背景模糊；fullscreen + hero 布局下为「最大模糊」（首页滚动斜坡的封顶值、非首页的固定值） */
  wallpaperBlur?: number;
  /** 全屏透明模式：卡片/导航栏/悬浮按钮的半透明程度（0.3-1，设为 1 即不透明，需开启高级材质，仅 transparent 模式生效） */
  cardOpacity?: number;
}

/** 菜单栏设置 */
export interface MobileMenuConfig {
  /** 菜单栏 Logo：自定义 Logo 图片地址，留空使用主题默认图标 */
  logo?: string;
  /** 显示网站名：开启后在 Logo 右侧显示站点标题文字，关闭后菜单栏只显示 Logo（仅影响菜单栏处，缺省视为开启） */
  showTitle?: boolean;
  /** 导航菜单：选择导航栏展示的 Halo 菜单，留空使用主菜单 */
  menu?: string;
  /** 移动端菜单样式：accordion（手风琴）/ drawer（抽屉） */
  style?: "accordion" | "drawer";
  /** 固定菜单栏：开启后桌面端菜单栏始终固定在顶部，滚动时不自动收起（移动端默认始终固定） */
  navbarFixed?: boolean;
  /** 语言切换：开启后在菜单栏显示语言切换按钮（访客可切换站点显示语言） */
  enable_change_language?: boolean;
  /** 配色（深浅色）切换：开启后在菜单栏显示明暗配色切换按钮 */
  enable_change_color_scheme?: boolean;
  /** 访客样式切换 */
  visitorStyle?: VisitorStyleConfig;
}

/** 访客样式切换：控制显示设置面板中访客可自助切换的标签页，缺省视为开启；
 *  一个开关对应一个标签页（标签页内的模式相关细分显隐不在此层） */
export interface VisitorStyleConfig {
  /** 总开关：关闭后不显示任何样式切换开关 */
  enable?: boolean;
  /** 外观标签页（主题色相 / 文章布局 / 卡片样式）切换 */
  appearance?: boolean;
  /** 壁纸标签页（壁纸模式 / 壁纸设置 / 全屏布局 / 透明设置）切换 */
  wallpaper?: boolean;
  /** 特效标签页（樱花特效）切换 */
  effects?: boolean;
}

/** 页面布局 */
export interface PageLayout {
  layoutMode: string;
  /**
   * 两栏布局「右栏模式」（默认关）：把侧栏放到右侧（正文在左），
   * 并把两栏的悬浮目录镜像到左侧空白槽。仅 layoutMode === 'two-column' 时生效。
   */
  rightSidebarMode?: boolean;
  /** 分类导航栏（设置组，见 CategoryNav。旧布尔字段 categoryBar 已废弃：
   *  换名 categoryNav 避免旧布尔值在 SpEL 取 .enable 时报错） */
  categoryNav?: CategoryNav;
  /** 瞬间预览条（全站内容区顶部，仅大屏端显示） */
  momentsBar?: MomentsBar;
}

/** 分类导航栏：内容区上方的首页 / 归档 / 分类入口条（设置组，默认关闭） */
export interface CategoryNav {
  /** 总开关，默认关闭 */
  enable?: boolean;
}

/** 瞬间预览条：内容区顶部的「瞬间」横向滚动预览条（需安装瞬间插件；
 *  仅大屏端 ≥768px 显示，移动端在 HomeMoments 根元素上 hidden md:block 隐藏） */
export interface MomentsBar {
  /** 总开关，默认关闭 */
  enable?: boolean;
  /** 最多展示条数（1~50，默认 10） */
  count?: number;
}

/** 文章卡片布局 */
export interface PostList {
  /** 默认布局：list 列表（默认）/ grid 网格 */
  defaultMode?: "list" | "grid";
  /** 列表设置（仅列表布局生效） */
  list?: PostListList;
  /** 简介显示行数，设为 0 不截断 */
  descriptionLines?: number;
  /** 网格设置 */
  grid?: PostListGrid;
}

/** 列表设置：列表模式封面位置与比例（数据路径 layout.postList.list） */
export interface PostListList {
  /** 列表模式封面位置：right 右侧（默认）/ left 左侧 */
  coverPosition?: "right" | "left";
  /** 列表封面比例：fill 撑满卡片高度（默认）/ fixed16x9 满宽撑满、内容列被压缩后按 16:9 居中（防裁） */
  coverRatio?: "fill" | "fixed16x9";
}

export interface PostListGrid {
  /** 瀑布流：开启后网格卡片高度参差不齐、错落排列 */
  masonry?: boolean;
  /** 封面贴边：开启后封面撑满卡片顶部贴边 */
  coverFullWidth?: boolean;
  /** 封面高度自适应（仅等高网格生效，瀑布流下自动隐藏） */
  coverAutoHeight?: boolean;
}

// ========== 样式 ==========
export interface Style {
  /** Banner 样式：类型/图片来源/轮播/位置/版权等 */
  bannerStyle: BannerStyle;
  /** 标题与副标题 */
  bannerText?: BannerText;
  themeColor: ThemeColor;
  colorScheme?: ColorScheme;
  /** 主题语言 */
  language?: ThemeLanguage;
  styleSwitches?: StyleSwitches;
  /** 动画速度 */
  animationSpeed?: AnimationSpeed;
  externalFont?: ExternalFont;
}

/** 主题语言 */
export interface ThemeLanguage {
  /** 默认语言：auto 跟随系统（浏览器）/ zh-CN 简体中文 / zh-TW 繁體中文 / en English */
  defaultLanguage?: "auto" | "zh-CN" | "zh-TW" | "en";
}

/** 动画速度 */
export interface AnimationSpeed {
  /** 速度档位：relaxed 舒缓 / balanced 均衡 / snappy 疾速 / custom 自定义 */
  speedTier?: "relaxed" | "balanced" | "snappy" | "custom";
  /** 自定义档时长（ms），仅 speedTier == 'custom' 时生效 */
  speedCustom?: {
    swup?: number;
    entry?: number;
    entryStep?: number;
    entryMax?: number;
    contentDelay?: number;
    scroll?: number;
    float?: number;
    banner?: number;
    carouselTransition?: number;
  };
}

export interface ColorScheme {
  color_scheme: string;
  colorSchemeAnimation?: ColorSchemeAnimation;
}

export interface ColorSchemeAnimation {
  // 切换动画样式：fade 淡入淡出（默认）/ circle 圆形扩散 / wipe 角度擦除 / none 无动画
  style?: "fade" | "circle" | "wipe" | "none";
  // 速度曲线：default 默认 / linear 线性 / ease-in 缓入 / ease-out 缓出 /
  // ease-in-out 缓入缓出 / expo-out 指数缓出 / back-out 回弹
  // 动画时长写死并随曲线自动匹配（EASING_DURATION），不可单独配置
  easing?:
    | "default"
    | "linear"
    | "ease-in"
    | "ease-out"
    | "ease-in-out"
    | "expo-out"
    | "back-out";
  // 仅擦除样式生效：扫动方向（度），0° 从左到右，90° 从上到下
  angle?: number;
}

export interface ExternalFont {
  enable?: boolean;
  fontFile?: string;
  family?: string;
}

export interface StyleSwitches {
  // banner_wave 三选：disabled 关闭 / enabled 开启 / desktop_only 移动端关闭；
  // 保留 boolean 兼容旧版布尔配置（后台存量 true/false）
  banner_wave?: boolean | "enabled" | "disabled" | "desktop_only";
  navbar_blur?: boolean;
  /** 卡片悬浮效果：全站默认值（不对访客开放、仅后台控制） */
  card_hover_lift?: boolean;
  /** 卡片边框和阴影：全站默认值（默认关闭），访客可在显示设置面板中覆盖 */
  card_border?: boolean;
  /** 卡片跟随主题色：全站默认值（默认关闭），访客可在显示设置面板中覆盖；
   *  仅浅色模式有视觉变化（浅色卡片从纯白变为带主题色色调的白，暗色卡片本就跟随色调） */
  card_follow_theme?: boolean;
  /** 全局樱花特效：全站默认值（默认关闭），访客可在显示设置面板中覆盖 */
  sakura?: boolean;
}

export interface FloatingButtons {
  enable_back_to_top?: boolean;
  enable_back_to_home?: boolean;
  enable_back_to_comment?: boolean;
  enable_toc?: boolean;
  customButtons?: FloatingCustomButton[];
}

export interface FloatingCustomButton {
  name: string;
  icon?: { value?: string };
  url: string;
}

// ========== 朋友圈设置 ==========
export interface Friends {
  pageSize: number;
  fetchLimit: number;
  enable_random_fish?: boolean;
}

// ========== 时间轴设置 ==========
export interface Timeline {
  /** 每页条目数量，0 或不设置则不分页 */
  pageSize?: number;
  entries?: TimelineEntries;
}

export interface TimelineEntries {
  items?: TimelineItem[];
}

export interface TimelineItem {
  title: string;
  type?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  location?: string;
  organization?: string;
  position?: string;
  skills?: string;
  achievements?: string;
  links?: string;
  icon?: { value?: string };
  color?: string;
  featured?: boolean;
}

// ========== 技能设置 ==========
export interface Skills {
  /** 每页卡片数量，0 或不设置则不分页 */
  pageSize?: number;
  entries?: SkillEntries;
}

export interface SkillEntries {
  items?: SkillItem[];
}

export interface SkillItem {
  name: string;
  description?: string;
  icon?: { value?: string };
  category?: string;
  level?: string;
  years?: number;
  months?: number;
  color?: string;
}

// ========== 「关于页面」设置 ==========
/** 「关于页面」设置（对应 settings.yaml 的 extendPages.about 组，未配置的子组均视为可选） */
export interface About {
  /** 身份卡片 */
  identity?: AboutIdentity;
  /** 顶部导航胶囊 */
  nav?: AboutNav;
  /** 个人简介卡片（引语 + 正文） */
  intro?: AboutIntro;
  /** 本人项目 */
  projects?: AboutProjects;
  /** 最近的提交 */
  activity?: AboutActivity;
  /** 我的技能（卡片数据来自技能页面设置，此处只管右上角「全部技能 →」） */
  skills?: AboutSkills;
  /** 我的朋友 */
  friends?: AboutFriends;
  /** 保持联系 */
  contact?: AboutContact;
  /** 订阅更新卡片（邮箱订阅推送） */
  subscribe?: AboutSubscribe;
  /** 页脚卡 */
  footer?: AboutFooter;
}

/** 身份卡片 */
export interface AboutIdentity {
  /** 卡片显隐开关（后台未配置时视为显示） */
  enable?: boolean;
  /** 头像；留空回落到侧栏「个人简介小组件」的头像（该字段默认即内置头像） */
  avatar?: string;
  /** 页面大标题，留空用站点标题 */
  name?: string;
  /** 身份行，如「独立开发者 / 博客作者」 */
  roles?: string;
  /** 一句话简介 */
  tagline?: string;
  /** 状态行（启用侧栏「在线状态」后由状态胶囊取代，本字段退为兜底） */
  status?: string;
  /**
   * 卡片按钮（字段结构同 AboutNavItem）：模板最多渲染 3 个，
   * 第 1 个为主按钮（主题色高亮），其余为次按钮；文字与链接都填了才算有效条目。
   */
  actions?: AboutIdentityAction[];
}

/** 个人简介卡片（引语 + 正文；正文每行一段，由 extend-pages.js 按段落渲染） */
export interface AboutIntro {
  /** 卡片显隐开关（后台未配置时视为显示） */
  enable?: boolean;
  /** 卡片开头的引语，留空则不显示 */
  quote?: string;
  /** 正文（textarea，每行一段） */
  intro?: string;
}

/**
 * 身份卡按钮条目（字段结构同 AboutNavItem）：后台「文字 + 链接」均为必填、图标可选；
 * 模板侧仍按「文字与链接都非空」过滤，兼容历史配置里链接留空的条目。
 */
export interface AboutIdentityAction {
  /** 按钮文字（后台必填）；与 url 都非空才渲染 */
  label?: string;
  /** 图标：iconify + format: svg ⇒ 值形如 { value: '<svg …>' }；留空则只显示文字 */
  icon?: { value?: string };
  /** 按钮链接（后台必填）：支持站内路径与完整网址；留空视为未配置，整个按钮不渲染 */
  url?: string;
}

/** 顶部导航胶囊（条目完全自定义；未配置条目时整个导航不渲染） */
export interface AboutNav {
  /** 卡片显隐开关（后台未配置时视为显示） */
  enable?: boolean;
  items?: AboutNavItem[];
}

export interface AboutNavItem {
  /** 导航文字（后台标了 required；为空则该条目不显示文字） */
  label?: string;
  /**
   * 图标：$formkit: iconify + format: svg ⇒ 值形如 { value: '<svg …>' }。
   * 后台不预置默认图标；留空则该项只显示文字。
   */
  icon?: { value?: string };
  /**
   * 导航链接：支持站内路径与完整网址；
   * 留空表示指向当前页面（用于「个人资料」这类表示当前所在页的条目）。
   */
  url?: string;
}

/**
 * 本人项目：卡片数据取自「项目集」插件（plugin metadata.name = portfolio）的
 * projectFinder.list(page, size)，本组只保留卡片右上角「全部项目 →」的链接地址
 * （链接文字固定、走 i18n，不再做成设置项）。
 */
export interface AboutProjects {
  /** 卡片显隐开关（后台未配置时视为显示） */
  enable?: boolean;
  /**
   * 显示几个项目（默认 4）。
   * 注意：Halo FormKit 的 number 字段实际存出来的可能是字符串，模板侧取数前
   * 必须先经 #conversions.convert(..., 'java.lang.Integer') 再传给 Finder。
   */
  count?: number | string;
  /** 是否显示右上角「全部项目 →」（地址固定 /portfolio，文字固定走 i18n） */
  showMore?: boolean;
}

/** 最近的提交（文章 + 瞬间各取 count 条后归并） */
export interface AboutActivity {
  enable?: boolean;
  /**
   * 卡片上总共显示几条（文章、瞬间各取这么多条作候选 → 客户端归并排序后截断）。
   * 模板侧做算术前会经 #conversions.convert 转类型。
   */
  count?: number | string;
}

/**
 * 我的技能（关于页面侧栏卡片）。
 * 卡片数据（分组 + 图标 + 名称）取自「技能页面」设置，本组只管卡片右上角的「全部技能 →」。
 */
export interface AboutSkills {
  /** 卡片显隐开关（后台未配置时视为显示） */
  enable?: boolean;
  /** 是否显示右上角「全部技能 →」 */
  showMore?: boolean;
  /** 链接地址：技能页是非固定路由的自定义页面，故需配置；留空则不显示该链接 */
  url?: string;
}

/** 我的朋友 / 保持联系 */
export interface AboutFriends {
  enable?: boolean;
  /**
   * 显示数量：每次请求由服务端随机取 N 条友链渲染（linkFinder.random(N)，零 JS）。
   * 模板侧取数前会经 #conversions.convert 转类型并夹到 [1, 12]。
   */
  count?: number | string;
}

/** 保持联系（数据取自侧栏「个人简介小组件 → 社交媒体」，此处只有显隐开关） */
export interface AboutContact {
  /** 是否显示「保持联系」卡片 */
  enable?: boolean;
}

/**
 * 订阅更新卡片（extendPages.about.subscribe）：邮箱订阅 = 自建主题表单直连
 * flow-post 插件的公开接口（见 about.astro 与 extend-pages.ts）；
 * 插件缺失时整卡不渲染。
 */
export interface AboutSubscribe {
  /** 卡片显隐开关（后台未配置时视为显示） */
  enable?: boolean;
}

/** 页脚卡 */
export interface AboutFooter {
  /** 卡片显隐开关（后台未配置时视为显示） */
  enable?: boolean;
  eyebrow?: string;
  motto?: string;
  linkItems?: AboutFooterLinkItem[];
}

/** 页脚链接条目（后台「名称 + 链接」必填、图标可选、最多 5 条） */
export interface AboutFooterLinkItem {
  /** 名称（后台必填），留空时回退显示链接 */
  label?: string;
  /** 图标：iconify + format: svg ⇒ 值形如 { value: '<svg …>' }；留空则只显示名称 */
  icon?: { value?: string };
  url?: string;
}

// ========== 「打赏页面」设置 ==========
/**
 * 「打赏页面」设置（对应 settings.yaml 的 extendPages.reward 组）。
 * 收款二维码不在此组：与文章打赏模态框同源（post.actionBar.rewardSetting.wechat_qr / alipay_qr）。
 */
export interface Reward {
  /** 打赏用途说明（textarea，多行）；留空则不显示说明框 */
  usage?: string;
  /** 打赏者名单（留空则整卡不渲染） */
  sponsors?: RewardSponsor[];
}

/**
 * 打赏者条目（后台昵称、金额、日期必填〔validation: required〕，头像可选）。
 * 前台对空值仍分别兜底：头像缺失显示昵称首字，金额 / 日期为空则不渲染。
 */
export interface RewardSponsor {
  /** 昵称；头像缺失时以首字兜底 */
  name?: string;
  /** 头像（attachment，URL 字符串）；留空显示昵称首字 */
  avatar?: string;
  /** 金额（自由文本，如 50 或 ¥50，前台自动补全 ¥） */
  amount?: string;
  /** 日期（$formkit: date，形如 2026-01-01） */
  date?: string;
}

// ========== 侧边栏 ==========
export interface Sidebar {
  widgetsConfig: WidgetsConfig;
  profile: SidebarProfile;
  announcement?: AnnouncementConfig;
  /** 站点统计小组件配置（sidebar.siteStats） */
  siteStats?: SidebarSiteStats;
  /** 天气小组件配置（sidebar.weather） */
  weather?: SidebarWeather;
  /** 一言小组件配置（sidebar.hitokoto） */
  hitokoto?: SidebarHitokoto;
  /** 音乐播放器小组件配置（sidebar.music） */
  music?: SidebarMusic;
  /** 最近日程小组件配置（sidebar.schedule） */
  schedule?: SidebarSchedule;
  /** 站点日历小组件配置（sidebar.calendar） */
  calendar?: SidebarCalendar;
}

// 以下五个分组是各小组件的「唯一配置源」：条目列表里只放「小组件 + 吸顶」，
// 详细配置外提到这里，左右侧边栏共用同一份（原先是每个条目各存一份）
export interface SidebarSiteStats {
  /**
   * 展示的统计项，**数组顺序即展示顺序**（后台多选，顺序 = 勾选顺序）。
   * 取值：posts / categories / tags / total_words / last_activity /
   *      running_days / visits / upvotes / comments
   */
  items?: string[];
  /** 网站上线日期，用于计算运行天数 */
  site_start_date?: string;
}

export interface SidebarWeather {
  tencent_key?: string;
  default_city?: string;
}

export interface SidebarHitokoto {
  hitokoto_api?: string;
  fallback_text?: string;
  fallback_source?: string;
}

export interface SidebarMusic {
  server?: string;
  type?: string;
  id?: string;
  play_mode?: string;
  volume?: number;
  music_api?: string;
}

export interface SidebarSchedule {
  limit?: number;
}

export interface SidebarCalendar {
  /** 是否在日历下方显示年度文章热力图，缺省 true（后台未配置时视为开启） */
  showHeatmap?: boolean;
}

export interface WidgetsConfig {
  widgets: Widget[];
  rightWidgets?: Widget[];
  /**
   * 移动端（<768px）专用条目列表。
   * 留空 = 移动端沿用 `widgets` + `rightWidgets` 的条目与顺序；
   * 非空 = 移动端只渲染本列表（按顺序排列，无吸顶概念），左右两栏在移动端整体隐藏。
   */
  mobileWidgets?: Widget[];
}

export interface AnnouncementConfig {
  content?: string;
  enable_html?: boolean;
  content_height?: number;
  closable?: boolean;
  link?: AnnouncementLink;
}

export interface AnnouncementLink {
  enable?: boolean;
  text?: string;
  url?: string;
  external?: boolean;
}

export interface SidebarProfile {
  name: string;
  bio: string;
  avatar: string;
  url: string;
  /** 在线状态设置（后台「在线状态」子配置组） */
  statusSettings?: SidebarProfileStatusSettings;
  social_media: SocialMedum[];
}

export interface SidebarProfileStatusSettings {
  /** 功能总开关：关闭后隐藏状态表情与相关设置 */
  enable?: boolean;
  /** 当前状态：online 在线 / busy 忙碌 / dnd 勿扰 / sleep 睡觉 / away 离开 */
  status?: string;
  /** 各状态自定义文案，留空使用默认 */
  statusText?: SidebarProfileStatusText;
}

export interface SidebarProfileStatusText {
  online?: string;
  energetic?: string;
  emo?: string;
  study?: string;
  busy?: string;
  dnd?: string;
  sleep?: string;
  away?: string;
}

/**
 * 侧边栏条目。除「自定义HTML」外，条目只承载「小组件 + 吸顶」两项，
 * 各小组件的详细配置见 SidebarSiteStats / SidebarWeather / SidebarHitokoto /
 * SidebarMusic / SidebarSchedule。
 */
export interface Widget {
  /** 小组件标识：profile / announcement / popular-posts / categories / tag / music / hitokoto / site-stats / weather / schedule / html */
  value: string;
  /**
   * 是否吸顶（默认 true）。
   * 注意：勾选与否只是「可能」，实际还要满足前缀规则——未勾选的条目只有在
   * 它前面所有条目都未勾选时才真的不吸顶，否则回退为吸顶。
   */
  sticky?: boolean;
  /** 自定义HTML条目的名称，仅用于后台条目列表辨识 */
  name?: string;
  /** 自定义HTML条目的内容（唯一仍随条目走的配置） */
  html?: string;
}

// ========== 社交媒体 ==========
export interface SocialMedum {
  social_icon?: { value?: string };
  icon?: string;
  url: string;
  text?: string;
  url_type?: string;
  name?: string;
  custom_icon?: string;
}

// ========== 文章 ==========
export interface Post {
  license: License;
  contentDisplay: ContentDisplay;
  toc: Toc;
  summary?: PostSummary;
  /** 文章操作栏：点赞/分享/打赏 */
  actionBar?: PostActionBar;
}

export interface PostActionBar {
  /** 总开关 */
  enable?: boolean;
  /** 点赞 */
  like?: boolean;
  /** 分享 */
  share?: boolean;
  /** 打赏 */
  reward?: boolean;
  /** 打赏设置 */
  rewardSetting?: {
    title?: string;
    wechat_qr?: string;
    alipay_qr?: string;
    /** 是否在打赏弹窗底部显示「打赏页面」跳转按钮（后台默认关） */
    page_enable?: boolean;
    /** 打赏页面路径（默认 /reward） */
    page_url?: string;
  };
}

export interface License {
  enable: boolean;
  name: string;
  url: string;
}

export interface ContentDisplay {
  showCover?: boolean;
  content_size: string;
  content_theme: string;
}

export interface Toc {
  enable_toc: boolean;
  /** 目录所在侧栏（三栏布局）：left = 左侧栏，缺省/right = 右侧栏 */
  position?: "left" | "right";
  toc_depth: number;
}

export interface PostSummary {
  enable_summary: boolean;
  summary_title: string;
  summaryEffect?: string;
}

// ========== 页脚 ==========
export interface Footer {
  /** 页脚样式（页脚样式类型 + 分割带样式类型，未配置时按经典款渲染） */
  styleConfig?: FooterStyleConfig;
  beian: Beian;
  displayLinks: FooterDisplayLinks;
  customLinks?: FooterCustomLinks;
  friendLinks?: FooterFriendLinks;
}

/**
 * 页脚样式配置（settings.yaml 的 footer.styleConfig 组）。
 *
 * 说明：Halo 实际存的是任意字符串，这里的字面量联合只是「约定的合法值」。
 * 模板侧用否定式判断（`!= 'card'` / `!= 'star'` 走经典分支），所以
 * null（升级前没有该字段）、空串、未知值都会静默回落到经典款，不会出现
 * 两个互斥分支都不渲染的情况。
 */
export interface FooterStyleConfig {
  /** 页脚样式类型：classic 经典页脚（默认）/ card 卡片页脚 */
  style?: "classic" | "card";
  /** 分割带样式（页脚上方的分隔元素，与页脚样式相互独立，可任意组合） */
  divider?: FooterDividerConfig;
}

/** 页脚分割带样式配置 */
export interface FooterDividerConfig {
  /** 分割带样式类型：classic 经典虚线（默认）/ star 星芒装饰 */
  style?: "classic" | "star";
}

/** 页脚友情链接卡片墙（数据来自 Links 插件，插件未安装时不渲染） */
export interface FooterFriendLinks {
  /** 总开关，默认关闭 */
  enable_friend_links?: boolean;
  /**
   * 是否仅在首页页脚显示（默认关闭，即所有页面显示）。
   * 判定依据是 `<body class="is-home">`：该 class 服务端（Astro 的 isHomePage）
   * 输出首帧初值，运行期由 utils/banner-sync.ts 的 syncHomeClass 在每次
   * Swup page:view / 首屏初始化时按路径重算，因此 Swup 无刷新换页也准确。
   */
  is_home_only?: boolean;
  /** 是否显示「申请友链」按钮（默认开启），固定跳转 /links */
  show_apply_btn?: boolean;
  /**
   * 最多显示条数，0 表示全部显示。
   * 注意：Halo FormKit 的 number 字段实际存出来的可能是字符串，模板侧必须
   * 先做类型转换（见 FooterFriendLinks.astro 的 hbfMaxItems）再参与比较，
   * 所以这里放宽为 number | string，避免写出看似安全的数值比较。
   */
  max_items?: number | string;
}

export interface FooterCustomLinks {
  items?: FooterCustomLink[];
}

export interface Beian {
  gongan_link: string;
  icp_link: string;
  gongan_text: string;
  icp_text: string;
}

export interface FooterDisplayLinks {
  enable_privacy: boolean;
  privacy_url: string;
  enable_rss: boolean;
  enable_sitemap: boolean;
}

export interface FooterCustomLink {
  name: string;
  url: string;
  html?: string;
}

// ========== 友链设置 ==========
export interface Links {
  features: LinksFeatures;
  ownerInfo: LinksOwnerInfo;
  applyFlow?: LinksApplyFlow;
  accordionPanel?: LinksAccordionPanel;
}

export interface LinksApplyFlow {
  applySteps?: ApplyStep[];
}

export interface ApplyStep {
  title: string;
  desc: string;
}

export interface LinksAccordionPanel {
  accordions?: AccordionItem[];
}

export interface AccordionItem {
  title: string;
  icon?: { value?: string };
  content: string;
}

export interface LinksFeatures {
  enable_comment: boolean;
  enable_apply_btn: boolean;
  enable_random_visit: boolean;
  random_visit_groups: string;
  enable_search: boolean;
}

export interface LinksOwnerInfo {
  owner_avatar: string;
  owner_name: string;
  owner_description: string;
  owner_url: string;
  owner_rss: string;
}

// ========== 外链跳转 ==========
export interface ExternalLink {
  enable_redirect?: boolean;
  redirect_delay?: number;
  redirect_prompt?: string;
  avatar?: string;
  open_new_window?: boolean;
  whitelist?: string;
}

export type LIGHT_DARK_MODE =
  typeof LIGHT_MODE | typeof DARK_MODE | typeof AUTO_MODE;
