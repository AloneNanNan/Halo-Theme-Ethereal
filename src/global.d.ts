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
  }
}
