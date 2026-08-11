import type { AUTO_MODE, DARK_MODE, LIGHT_MODE } from "../constants/constants";

// ========== 顶层配置 ==========
export interface ThemeConfig {
  base: Base;
  style: Style;
  sidebar: Sidebar;
  friends: Friends;
  post: Post;
  footer: Footer;
  links: Links;
  external_link: ExternalLink;
}

// ========== 基础设置 ==========
export interface Base {
  banner: Banner;
  bannerText?: BannerText;
  welcome?: WelcomePopupConfig;
  menu: string;
}

/** 菜单栏设置 */
export interface MobileMenuConfig {
  /** 移动端菜单样式：accordion（手风琴）/ drawer（抽屉） */
  style?: "accordion" | "drawer";
  /** 固定导航栏：开启后桌面端导航栏始终固定在顶部，滚动时不自动收起（移动端默认始终固定） */
  navbarFixed?: boolean;
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
  fixed: boolean;
}

export interface Banner {
  enable: boolean;
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

// ========== 样式 ==========
export interface Style {
  themeColor: ThemeColor;
  colorScheme?: ColorScheme;
  color_scheme: string;
  enable_change_color_scheme: boolean;
  styleSwitches?: StyleSwitches;
  /** 菜单栏设置 */
  mobileMenu?: MobileMenuConfig;
  floatingButtons?: FloatingButtons;
  externalFont?: ExternalFont;
}

export interface ColorScheme {
  color_scheme: string;
  enable_change_color_scheme: boolean;
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

// ========== 侧边栏 ==========
export interface Sidebar {
  layout: SidebarLayout;
  widgetsConfig: WidgetsConfig;
  profile: SidebarProfile;
  announcement?: AnnouncementConfig;
}

export interface SidebarLayout {
  layoutMode: string;
}

export interface WidgetsConfig {
  widgets: Widget[];
  rightWidgets?: Widget[];
}

export interface AnnouncementConfig {
  enable?: boolean;
  position?: string;
  content?: string;
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
  enable_like?: boolean;
  summary?: PostSummary;
}

export interface License {
  enable: boolean;
  name: string;
  url: string;
}

export interface ContentDisplay {
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
