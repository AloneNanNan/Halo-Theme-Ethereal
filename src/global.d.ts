import type { AstroIntegration } from "@swup/astro";

declare global {
  interface Window {
    // type from '@swup/astro' is incorrect
    swup: AstroIntegration;
    __etherealOriginalHistory?: {
      pushState?: History["pushState"];
      replaceState?: History["replaceState"];
    };
    __etherealSwupHandlersBound?: boolean;
    SearchWidget?: {
      open: () => void;
    };
    // #theme-config JSON 解析缓存（scripts/assets/theme-config.ts 与 public 脚本共享契约）
    __themeConfig?: unknown;
    // 分享海报 qrcode.bundle.js 懒加载状态（scripts/assets/post-share.ts）
    __etherealQRState?: "loading" | "loaded" | "failed";
    __etherealQRCallbacks?: (() => void)[] | null;
    // 当前文章 URL 同步（scripts/assets/post-share.ts）
    __etherealSyncCurrentPostUrl?: () => void;
    __etherealSyncCurrentPostUrlBound?: boolean;
  }
}
