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
  development: Development;
}

// ========== 基础设置 ==========
export interface Base {
  banner: Banner;
  bannerText?: BannerText;
  menu: string;
}

export interface ThemeColor {
  hue: number;
  fixed: boolean;
}

export interface Banner {
  enable: boolean;
  src: string;
  position: string;
  credit: Credit;
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
  color_scheme: string;
  enable_change_color_scheme: boolean;
  styleSwitches?: StyleSwitches;
  floatingButtons?: FloatingButtons;
  externalFont?: ExternalFont;
}

export interface ExternalFont {
  enable?: boolean;
  fontFile?: string;
  family?: string;
}

export interface StyleSwitches {
  banner_wave?: boolean;
  navbar_blur?: boolean;
  card_tilt?: boolean;
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
}

export interface SidebarLayout {
  layoutMode: string;
  enable_profile: boolean;
  display_position?: string;
}

export interface WidgetsConfig {
  widgets: Widget[];
  rightWidgets?: Widget[];
}

export interface SidebarProfile {
  name: string;
  bio: string;
  avatar: string;
  url: string;
  social_media: SocialMedum[];
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

// ========== 开发设置 ==========
export interface Development {
  enabled: boolean;
}

export type LIGHT_DARK_MODE =
  | typeof LIGHT_MODE
  | typeof DARK_MODE
  | typeof AUTO_MODE;
