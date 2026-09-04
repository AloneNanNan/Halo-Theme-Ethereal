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

/** 扩展页面设置：朋友圈 / 时间轴 / 技能（后台未配置的子组可能缺失，均视为可选） */
export interface ExtendPages {
  friends?: Friends;
  timeline?: Timeline;
  skills?: Skills;
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
  /** 全屏透明模式：壁纸整体不透明度（0.3-1，默认 0.8，仅 transparent 模式生效） */
  wallpaperOpacity?: number;
  /** 全屏透明模式：壁纸背景模糊强度（px，0-24，仅 transparent 模式生效） */
  wallpaperBlur?: number;
  /** 全屏透明模式：卡片/导航栏/悬浮按钮的半透明程度（0.3-1，设为 1 即不透明，需开启高级材质，仅 transparent 模式生效） */
  cardOpacity?: number;
}

/** 菜单栏设置 */
export interface MobileMenuConfig {
  /** 菜单栏 Logo：自定义 Logo 图片地址，留空使用主题默认图标 */
  logo?: string;
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

/** 访客样式切换：控制显示设置面板中访客可自助切换的项，缺省视为开启 */
export interface VisitorStyleConfig {
  /** 总开关：关闭后不显示任何样式切换开关 */
  enable?: boolean;
  /** 主题色相切换 */
  hue?: boolean;
  /** 文章布局（列表/网格）切换 */
  postListLayout?: boolean;
  /** 卡片样式（悬浮效果/高级材质/瀑布流）切换 */
  cardStyle?: boolean;
  /** 壁纸模式（纯色背景/横幅/全屏/全屏透明）切换 */
  wallpaperMode?: boolean;
  /** 壁纸设置（横幅/全屏下的波浪开关）切换 */
  wallpaperSettings?: boolean;
  /** 透明设置（透明度/模糊度/卡片透明度）调节，仅全屏透明模式下显示 */
  transparent?: boolean;
}

/** 页面布局 */
export interface PageLayout {
  layoutMode: string;
  /** 分类导航栏 */
  categoryBar?: boolean;
}

/** 文章卡片布局 */
export interface PostList {
  /** 默认布局：list 列表（默认）/ grid 网格 */
  defaultMode?: "list" | "grid";
  /** 列表模式封面位置：right 右侧（默认）/ left 左侧 */
  coverPosition?: "right" | "left";
  /** 简介显示行数，设为 0 不截断 */
  descriptionLines?: number;
  /** 网格设置 */
  grid?: PostListGrid;
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
  card_hover_lift?: boolean;
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
  subtitle?: string;
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
  subtitle?: string;
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

// ========== 侧边栏 ==========
export interface Sidebar {
  widgetsConfig: WidgetsConfig;
  profile: SidebarProfile;
  announcement?: AnnouncementConfig;
}

export interface WidgetsConfig {
  widgets: Widget[];
  rightWidgets?: Widget[];
}

export interface AnnouncementConfig {
  enable?: boolean;
  position?: string;
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
  enable_profile?: boolean;
  display_position?: string;
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

export interface Widget {
  value: string;
  html?: string;
  title?: string;
  server?: string;
  type?: string;
  id?: string;
  play_mode?: string;
  volume?: number;
  api?: string;
  site_start_date?: string;
  tencent_key?: string;
  default_city?: string;
  fallback_text?: string;
  fallback_source?: string;
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
  toc_depth: number;
}

export interface PostSummary {
  enable_summary: boolean;
  summary_title: string;
  summaryEffect?: string;
}

// ========== 页脚 ==========
export interface Footer {
  beian: Beian;
  displayLinks: FooterDisplayLinks;
  customLinks?: FooterCustomLinks;
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
