// src/scripts/app.ts — 应用入口：协调所有初始化逻辑

// ── 全局样式 ──
import "../styles/global.css";
import "../styles/utilities.css";
import "../styles/variables.css";
import "../styles/comment-widget.css";
import "../styles/base.css";
import "../styles/theme-transition.css";
import "../styles/components.css";
import "../styles/markdown.css";
import "../styles/transition.css";
import "../styles/speed.css";
import "../styles/scrollbar.css";
import "../styles/external-link-modal.css";
import "../styles/link-apply-modal.css";
import "../styles/profile-status.css";
// 音乐播放器样式：原先是「页面存在 .firefly-music-player 才动态 import」，
// 但该样式表只有 1.2KB，会被 Astro 的 inlineStylesheets: 'auto' 内联进 HTML，
// 而 Vite 生成的预加载清单里仍保留独立文件名 → 每次打开页面都产生一个
// music-player.<hash>.css 的 404 请求（样式本身没丢，只是多一次无用请求）。
// 改为静态导入：并入主样式包（+1.2KB，可忽略），彻底消除该请求
import "../styles/music-player.css";

// ── 第三方 ──
import "overlayscrollbars/styles/overlayscrollbars.css";

// ── 工具模块 ──
import { SWUP_VISIT_END_DELAY } from "../constants/constants";
import {
  setTheme,
  getStoredTheme,
  getHue,
  setHue,
} from "../utils/setting-utils";
import { scrollDownToContent, scrollFunction } from "../utils/scroll-manager";
import { syncHomeClass, isHomePath } from "../utils/banner-sync";
import { initLegacyAdmonitions } from "../utils/legacy-admonitions";
import { initExternalLinkRedirect } from "../utils/external-link-redirect";
import { initProfileStatus } from "../utils/profile-status";
import {
  initContentLightbox,
  initPhotosGallery,
  destroyAll,
} from "../utils/content-media";

// ── 自定义滚动条（懒加载，等入场动画结束后初始化） ──
let scrollbarInitialized = false;
function initCustomScrollbar() {
  if (scrollbarInitialized) return;
  scrollbarInitialized = true;
  const bodyElement = document.querySelector("body");
  if (!bodyElement) return;
  import("overlayscrollbars").then(({ OverlayScrollbars }) => {
    let mounted = false;
    const mount = () => {
      if (mounted) return; // 防重入：Promise.all 与 setTimeout 兜底可能双调
      mounted = true;
      OverlayScrollbars(
        { target: bodyElement, cancel: { nativeScrollbarsOverlaid: true } },
        {
          scrollbars: {
            theme: "scrollbar-base scrollbar-auto py-1",
            autoHide: "scroll",
            autoHideDelay: 500,
            autoHideSuspend: false,
          },
          // 降低滚动/事件驱动的同步测量频率（默认 event: [33, 99]：滚动中 33ms
          // 内即触发 update，OS 内部对 target 读尺寸 → 每帧强制重排）。放大首
          // 延迟与间隔后，滚动时测量节流到 100ms/250ms 档，显著减少 layout
          // thrash；其余字段保持库默认值
          update: {
            debounce: {
              mutation: [0, 33],
              resize: null,
              event: [100, 250],
              env: [222, 666, true],
            },
          },
        },
      );
    };
    // OverlayScrollbars 初始化会把 body 内容包裹进滚动容器（appendChild 移动全部
    // 元素），Chrome 对被移动且动画未结束的元素会重建 CSS 动画对象，导致入场动画
    // "播放完成后再重放一次"（复现时间点即 overlayscrollbars 下载完成瞬间）。
    // 等 fade-in-up 全部结束再初始化——此时动画已被下方的一次性保护清理，
    // 移动不再触发重放；2s 兜底防动画异常卡住。等待期间原生滚动条正常工作。
    // 挂载本身会触发一次全量重排（移动全部 body 子元素 + 尺寸测量，数百 ms），
    // 用 requestIdleCallback 错峰到主线程空闲时执行；空闲回调不可用（Safari）
    // 时退化为立即执行，行为与旧版一致
    const runWhenIdle = (task: () => void): void => {
      if ("requestIdleCallback" in window) {
        window.requestIdleCallback(task, { timeout: 1500 });
      } else {
        task();
      }
    };
    const running = document
      .getAnimations()
      .filter(
        (a) =>
          a instanceof CSSAnimation &&
          (a.animationName === "fade-in-up" ||
            a.animationName === "slide-in-up"),
      );
    if (running.length > 0) {
      void Promise.all(
        running.map((a) => a.finished.catch(() => undefined)),
      ).then(() => runWhenIdle(mount));
      setTimeout(() => runWhenIdle(mount), 2000);
    } else {
      runWhenIdle(mount);
    }
  });
}

// ── 入场动画一次性保护 ──
// 浏览器会因元素移动（滚动容器包裹等）/样式重算重建 CSS 动画对象，使入场动画
// 从头重放。用 document 级事件委托在动画结束/取消后清理：
//  - .onload-animation 类元素：移除类（回到静态可见状态，重放无动画可播）
//  - banner 标题/副标题（动画由 CSS 选择器定义，无类可移除）：内联固化终态
//    （opacity: 1 + animation: none）
function removeOnloadAnimation(e: AnimationEvent) {
  const el = e.target as Element | null;
  if (!el) return;
  if (el.classList.contains("onload-animation")) {
    el.classList.remove("onload-animation");
  }
  if (el.id === "banner-title" || el.id === "banner-subtitle-wrapper") {
    const style = (el as HTMLElement).style;
    style.opacity = "1";
    style.animation = "none";
  }
}
document.addEventListener("animationend", removeOnloadAnimation);
document.addEventListener("animationcancel", removeOnloadAnimation);

// ── Banner 显示 ──
// 揭示逻辑（媒体就绪判定 + 首帧门槛 + 摘 opacity-0/scale-105）统一放在
// MainGridLayout 的内联脚本里，经 window.__etherealRevealBanners 暴露：首屏由它
// 在解析期直接调用（不等本模块，避免主 bundle 拖慢 LCP），Swup 换页后重建的 banner
// 由这里再调一次。保持单一实现——双容器/多媒体的就绪判定不再各写一份。
function showBanner() {
  const revealBanners = (window as any).__etherealRevealBanners;
  if (typeof revealBanners === "function") {
    revealBanners();
    return;
  }
  // 内联脚本缺失（异常构建）时的兜底：直接显示，宁可丢动画也不能让 banner 永久隐藏
  document.querySelectorAll(".banner-reveal").forEach((banner) => {
    banner.classList.remove("opacity-0", "scale-105");
  });
}

// ── Banner overlay 显隐同步 ──
// SSR 在非首页给 #banner-overlay 设置 display:none 内联样式，
// 该元素在 Swup 容器外，跨页切换时不被替换，需手动同步。
// 首次加载由 banner-responsive.ts initOverlay() 处理，
// 此处仅覆盖 Swup 导航场景（banner-responsive.ts 不会重新执行）
function syncBannerOverlay() {
  const overlay = document.getElementById("banner-overlay");
  if (!overlay) return;
  if (overlay.style.display === "none") {
    overlay.style.display = "";
  }
  const wasHidden = overlay.classList.contains("banner-text-hidden");
  overlay.classList.toggle("banner-text-hidden", !isHomePath());
  if (isHomePath() && wasHidden) {
    document.dispatchEvent(new CustomEvent("banner:visible"));
  }
}

// ── 点击外部关闭面板 ──
function setClickOutsideToClose(panel: string, ignores: string[]) {
  document.addEventListener("click", (event) => {
    const panelDom = document.getElementById(panel);
    const target = event.target;
    if (!panelDom || !(target instanceof Node)) return;
    for (const ignored of ignores) {
      const ignoredEl = document.getElementById(ignored);
      if (ignoredEl === target || ignoredEl?.contains(target)) return;
    }
    panelDom.classList.add("float-panel-closed");
  });
}

// ── 恢复 history 原始方法 ──
function restoreOriginalHistoryStateHandlers() {
  const originalHistory = (window as any).__etherealOriginalHistory;
  if (!originalHistory) return;
  if (originalHistory.pushState)
    window.history.pushState = originalHistory.pushState;
  if (originalHistory.replaceState)
    window.history.replaceState = originalHistory.replaceState;
}

// ── widget-layout 自定义元素（小组件折叠"更多"按钮）──
// 必须在全局无条件注册，不能依赖任何具体小组件的渲染位置，
// 否则公告等组件被 th:if 隐藏时，分类/标签等按钮会全部失效。
class WidgetLayoutElement extends HTMLElement {
  connectedCallback() {
    if (this.dataset.isCollapsed !== "true") return;
    const id = this.dataset.id;
    const btn = this.querySelector(".expand-btn");
    const wrapper = this.querySelector(`#${id}`);
    btn?.addEventListener("click", () => {
      wrapper?.classList.remove("collapsed");
      btn.classList.add("hidden");
    });
  }
}

if (!customElements.get("widget-layout")) {
  customElements.define("widget-layout", WidgetLayoutElement);
}

// ── table-of-contents 自定义元素（目录组件）──
// 与 widget-layout 同理：必须在全局无条件注册，不能依赖任何具体实例的渲染位置。
// TOC 在页面里有多个实例（左右侧栏目录槽位、两栏悬浮目录、移动端目录弹窗），
// 而侧栏实例会被 th:if 按 post.toc.position 配置移除；Astro 对组件脚本全页只输出
// 一次且落在第一个实例处，注册脚本随该实例被移除时，另一栏的 <table-of-contents>
// 永远不会 upgrade —— 表现为目录卡片整体空白（条目、"此文章无目录"占位都没有）。
class TableOfContents extends HTMLElement {
  tocEl: HTMLElement | null = null;
  visibleClass = "visible";
  mutationObserver?: MutationObserver;
  scrollHandler?: () => void;
  resizeHandler?: () => void;
  anchorNavTarget: HTMLElement | null = null;
  headings: HTMLElement[] = [];
  tocEntries: HTMLAnchorElement[] = [];
  active: boolean[] = [];
  activeIndicator: HTMLElement | null = null;

  connectedCallback() {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", this.refresh);
    } else {
      this.refresh();
    }

    // 换页后刷新由 app.ts 中 swup.hooks.on("content:replace") 的真实钩子
    // 承担；原 swup:contentReplaced 监听删除（v3 事件名从未触发）。
  }

  disconnectedCallback() {
    this.mutationObserver?.disconnect();
    this.removeWindowListeners();
    this.tocEl?.removeEventListener("click", this.handleAnchorClick);
    document.removeEventListener("DOMContentLoaded", this.refresh);
  }

  refresh = () => {
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        if (!this.isConnected) return;
        if (!this.init()) {
          window.setTimeout(() => this.isConnected && this.init(), 80);
        }
      }),
    );
  };

  reset() {
    this.mutationObserver?.disconnect();
    this.removeWindowListeners();
    this.tocEl?.removeEventListener("click", this.handleAnchorClick);
    this.querySelectorAll("[data-toc-entry]").forEach((entry) =>
      entry.remove(),
    );
    this.headings = [];
    this.tocEntries = [];
    this.active = [];
    this.anchorNavTarget = null;
    this.activeIndicator = this.querySelector("[data-toc-indicator]");
    this.activeIndicator?.setAttribute("style", "opacity: 0");
    this.querySelector("[data-toc-empty]")?.classList.add("hidden");
  }

  removeWindowListeners() {
    if (this.scrollHandler) {
      window.removeEventListener("scroll", this.scrollHandler);
      this.scrollHandler = undefined;
    }
    if (this.resizeHandler) {
      window.removeEventListener("resize", this.resizeHandler);
      this.resizeHandler = undefined;
    }
  }

  init() {
    this.reset();
    const content = document.querySelector<HTMLElement>("#content, .custom-md");
    const scrollParent = this.closest("[data-toc-scroll]");
    this.tocEl =
      scrollParent instanceof HTMLElement
        ? scrollParent
        : document.getElementById("toc-inner-wrapper");
    if (!content || !this.tocEl) {
      return false;
    }

    this.mutationObserver = new MutationObserver(() => {
      if (!this.headings.length) this.refresh();
    });
    this.mutationObserver.observe(content, {
      childList: true,
      subtree: true,
    });

    const allHeadings = Array.from(
      content.querySelectorAll<HTMLElement>("h1, h2, h3, h4, h5, h6"),
    ).filter((heading) => heading.textContent?.trim());
    const maxDepth = Math.max(1, Number(this.dataset.maxDepth || "4"));
    const minDepth = allHeadings.length
      ? Math.min(
          ...allHeadings.map((heading) => Number(heading.tagName.substring(1))),
        )
      : 1;
    this.headings = allHeadings.filter(
      (heading) => Number(heading.tagName.substring(1)) < minDepth + maxDepth,
    );
    this.active = this.headings.map(() => false);

    if (!this.headings.length) {
      const emptyEl = this.querySelector<HTMLElement>("[data-toc-empty]");
      if (emptyEl) {
        emptyEl.textContent = this.dataset.emptyText || "此文章无目录";
        emptyEl.classList.remove("hidden");
      }
      return true;
    }
    this.querySelector("[data-toc-empty]")?.classList.add("hidden");

    this.tocEl.addEventListener("click", this.handleAnchorClick, {
      capture: true,
    });
    // 条目先追加到 DocumentFragment，最后一次性 insertBefore：避免逐条
    // 插入（每次 childList 变化都会使布局失效，长文换页后 TOC 初始化时
    // 反复触发整页重排——实测 visit:end 后 300ms 级卡顿来源）
    const fragment = document.createDocumentFragment();
    this.headings.forEach((heading, index) => {
      if (!heading.id) {
        heading.id = `heading-${index}`;
      }

      const depth = Number(heading.tagName.substring(1));
      const title = heading.textContent?.trim() || "";
      const link = document.createElement("a");
      link.dataset.tocEntry = "true";
      link.href = `#${heading.id}`;
      link.className =
        "px-2 flex gap-2 relative transition-all duration-(--toc-transition-duration) w-full min-h-9 rounded-xl hover:bg-(--toc-btn-hover) hover:pl-3 active:bg-(--toc-btn-active) py-2";
      // 三栏布局：调整条目边距以适配更窄的 TOC 宽度
      if (this.closest(".layout-three-column")) {
        link.style.marginLeft = "0.75rem";
        link.style.marginRight = "0.75rem";
        link.style.width = "calc(100% - 1.5rem)";
      }
      link.innerHTML = `
        <div class="transition w-5 h-5 shrink-0 rounded-lg text-xs flex items-center justify-center font-bold ${
          depth === minDepth ? "bg-(--toc-badge-bg) text-(--btn-content)" : ""
        } ${depth === minDepth + 1 ? "ml-4" : ""} ${depth >= minDepth + 2 ? "ml-8" : ""}">
          ${depth === minDepth ? String(index + 1) : ""}
          ${depth === minDepth + 1 ? '<div class="transition w-2 h-2 rounded-[0.1875rem] bg-(--toc-badge-bg)"></div>' : ""}
          ${depth >= minDepth + 2 ? '<div class="transition w-1.5 h-1.5 rounded-sm bg-black/5 dark:bg-white/10"></div>' : ""}
        </div>
        <div class="toc-title transition duration-(--toc-transition-duration) text-sm ${depth >= minDepth + 2 ? "text-30" : "text-50"}"></div>
      `;
      const titleEl = link.querySelector(".toc-title");
      if (titleEl) {
        titleEl.textContent = title;
      }
      fragment.appendChild(link);
      this.tocEntries.push(link);
    });
    this.insertBefore(fragment, this.activeIndicator);

    // 高亮更新由 scroll/resize 的 rAF 节流驱动；读 rect 与写 class 的顺序由
    // toggleActiveHeading 保证（先读后写，避免 layout thrash）。勿改用
    // IntersectionObserver：isIntersecting 是「与视口相交」而非「顶边越过 96px 线」，
    // 集合取 max 会指向视口底部标题，与原 currentHeadingIndex 语义不等价（I23 曾引入已回退）
    let scrollTicking = false;
    this.scrollHandler = () => {
      if (scrollTicking) return;
      scrollTicking = true;
      requestAnimationFrame(() => {
        scrollTicking = false;
        // 换页期间（html.toc-not-ready）目录被 CSS 隐藏，跳过高亮计算：
        // 平滑回顶滚动时每帧读 rect + 写 class 纯属浪费（不可见），
        // 显示后（类移除）自动恢复
        if (document.documentElement.classList.contains("toc-not-ready")) {
          return;
        }
        this.updateActiveByScroll();
      });
    };
    this.resizeHandler = () => {
      if (document.documentElement.classList.contains("toc-not-ready")) {
        return;
      }
      this.updateActiveByScroll();
    };
    window.addEventListener("scroll", this.scrollHandler, { passive: true });
    window.addEventListener("resize", this.resizeHandler);
    this.updateActiveByScroll();
    return true;
  }

  update() {
    requestAnimationFrame(() => {
      this.toggleActiveHeading();
      this.scrollToActiveHeading();
    });
  }

  toggleActiveHeading() {
    let min = this.active.length;
    let max = -1;
    // 先只遍历 active 数组计算 min/max（不碰 DOM），再统一读一次布局、
    // 最后写入 class/style：避免「写 class → 读 rect → 写 style」的
    // 写-读交错强制重排（单帧内仅一次布局计算）
    for (let i = 0; i < this.active.length; i++) {
      if (this.active[i]) {
        min = Math.min(min, i);
        max = Math.max(max, i);
      }
    }

    if (min > max || !this.tocEl || !this.activeIndicator) {
      this.activeIndicator?.setAttribute("style", "opacity: 0");
      for (let i = 0; i < this.active.length; i++) {
        this.tocEntries[i]?.classList.remove(this.visibleClass);
      }
      return;
    }

    const parentOffset = this.getBoundingClientRect().top;
    const top = this.tocEntries[min].getBoundingClientRect().top - parentOffset;
    const bottom =
      this.tocEntries[max].getBoundingClientRect().bottom - parentOffset;
    this.activeIndicator.setAttribute(
      "style",
      `top: ${top}px; height: ${bottom - top}px`,
    );
    for (let i = 0; i < this.active.length; i++) {
      this.tocEntries[i]?.classList.toggle(this.visibleClass, this.active[i]);
    }
  }

  scrollToActiveHeading() {
    if (this.anchorNavTarget || !this.tocEl) return;
    const activeHeading = this.querySelectorAll<HTMLElement>(
      `.${this.visibleClass}`,
    );
    if (!activeHeading.length) return;

    const topmost = activeHeading[0];
    const bottommost = activeHeading[activeHeading.length - 1];
    const tocHeight = this.tocEl.clientHeight;
    const scrollTop = this.tocEl.scrollTop;
    // 统一坐标系：以滚动容器 tocEl 为基准（rect 差值），不再混用 offsetTop
    // （相对最近 positioned 祖先，即 table-of-contents）与 scrollTop（相对
    // tocEl）——两者隔着 h-8 spacer 等元素，混用依赖巧合的 32px 才成立
    const tocTop = this.tocEl.getBoundingClientRect().top;
    const topOffset = topmost.getBoundingClientRect().top - tocTop + scrollTop;
    const bottomOffset =
      bottommost.getBoundingClientRect().bottom - tocTop + scrollTop;
    // 高亮变化即跟随滚动（update 仅在 active 变化时调用，dirty 检查已在
    // updateActiveByScroll 承担）：恢复 v1.1.1 的平滑跟随行为。目录小容器的
    // smooth 滚动不触发 window 级 scrollHandler，无放大重排问题
    const top =
      bottomOffset - topOffset < 0.9 * tocHeight
        ? topOffset - 32
        : bottomOffset - tocHeight * 0.8;
    this.tocEl.scrollTo({
      top,
      left: 0,
      behavior: "smooth",
    });
  }

  handleAnchorClick = (event: Event) => {
    const anchor = event
      .composedPath()
      .find((element) => element instanceof HTMLAnchorElement);
    if (!(anchor instanceof HTMLAnchorElement)) return;

    const id = decodeURIComponent(anchor.hash?.substring(1));
    this.anchorNavTarget =
      this.headings.find((heading) => heading.id === id) || null;
    const activeIndex = this.headings.findIndex((heading) => heading.id === id);
    if (activeIndex >= 0) {
      this.active = this.tocEntries.map((_, index) => index === activeIndex);
      this.update();
    }
  };

  currentHeadingIndex() {
    if (!this.headings.length) return -1;

    const offset = 96;
    let activeIndex = 0;
    for (let index = 0; index < this.headings.length; index++) {
      if (this.headings[index].getBoundingClientRect().top <= offset) {
        activeIndex = index;
      } else {
        break;
      }
    }

    return activeIndex;
  }

  updateActiveByScroll = () => {
    const activeIndex = this.currentHeadingIndex();
    if (activeIndex < 0) return;

    const active = this.tocEntries.map((_, index) => index === activeIndex);
    // dirty 检查：高亮未变化时跳过 indicator 定位/滚动，消除每 tick 布局读取
    if (active.every((value, index) => value === this.active[index])) {
      return;
    }
    if (
      this.anchorNavTarget &&
      this.anchorNavTarget.getBoundingClientRect().top <= 100
    ) {
      this.anchorNavTarget = null;
    }
    this.active = active;
    this.update();
  };
}

if (!customElements.get("table-of-contents")) {
  customElements.define("table-of-contents", TableOfContents);
}

// ── 非主题页判定（#82）──
// 主题页都由 MainGridLayout 外壳渲染，必然带 astro.config.mjs 声明的全部 Swup 容器
// （清单由调用方从 swup.options.containers 取，改配置无需同步）；插件自带前台页
// （独立模板，或经契约外壳 templates/layout.html 渲染的页面）都没有 —— 缺任一项即交还浏览器。
// 选择器非常规或取不到清单时返回 false（不交还）：宁可漏判、退化为原行为，不误判主题页。
function shouldHandoffToBrowser(html: string, containers: unknown): boolean {
  if (!Array.isArray(containers) || containers.length === 0) return false;
  const ids = containers.map((selector) =>
    typeof selector === "string" && /^#[A-Za-z][\w-]*$/.test(selector)
      ? selector.slice(1)
      : "",
  );
  if (ids.some((id) => !id)) return false;
  return ids.some((id) => !html.includes(id));
}

// ── Swup hooks ──
// 侧栏目录（左右两栏的目录槽位各可能有一个）：换页刷新与浮动按钮可见性判定共用
const SIDEBAR_TOC_SELECTOR =
  "#sidebar table-of-contents, #right-sidebar table-of-contents";

function setupSwup() {
  if ((window as any).__etherealSwupHandlersBound) return;
  (window as any).__etherealSwupHandlersBound = true;

  // ── 非主题页不接管（#82）──
  // 目标页没有主题容器时，SwupHeadPlugin 会摘掉整套主题 CSS（换页期间可见的导航栏/
  // 侧栏/页脚当场无样式），随后 replaceContent 容器不匹配报错并整页刷新。挂 page:load
  // （响应 HTML 到手时）：abort() 置 done 后 renderPage / animatePageIn 都在入口
  // `if (e.done) return` 直接返回，head 合并与内容替换绝不发生，等价于「这次点击不走
  // Swup」，代价只有一次已发出的 HTML 请求。
  // 下场动画不等 fetch，此时必然已开始/播完，而 abort 跳过了 visit:end 的收尾 ——
  // 故下方撤回换页态，避免页面定格在"主内容已淡出"。
  window.swup.hooks.on(
    "page:load",
    (
      visit: {
        abort?: () => void;
        to?: { url?: string; hash?: string };
        history?: { popstate?: boolean };
      },
      args: { page?: { html?: string } },
    ) => {
      // @swup/astro 的类型声明不含运行时字段；本钩子只用到下面这几个
      const swup = window.swup as {
        options?: { containers?: unknown; skipPopStateHandling?: unknown };
        navigating?: boolean;
        onVisitEnd?: unknown;
      };
      const options = swup.options;
      const html = args?.page?.html;
      if (
        typeof html !== "string" ||
        !shouldHandoffToBrowser(html, options?.containers)
      ) {
        return;
      }
      const target = `${visit.to?.url ?? ""}${visit.to?.hash ?? ""}`;
      if (!target) return;
      visit.abort?.();
      // abort 跳过了 swup 成功流程末尾的复位，这里补齐：navigating 不复位会让本文档
      // 后续 popstate 访问挂到永不触发的 onVisitEnd 队列上静默失效（地址变了内容不变），
      // 复位前的同一 URL 点击也会被 preventDefault 吞掉
      swup.navigating = false;
      swup.onVisitEnd = undefined;
      // abort 跳过 visit:end / animation:in:end，补上它们的收尾清理
      document.documentElement.classList.remove(
        "is-changing",
        "is-animating",
        "is-leaving",
        "is-rendering",
        "home-switch",
        "toc-not-ready",
      );
      document.getElementById("page-height-extend")?.classList.add("hidden");
      // popstate（前进/后退）场景：浏览器已经走完这次遍历，直接真实加载目标即可
      if (visit.history?.popstate) {
        window.location.replace(target);
        return;
      }
      // 点击场景：swup 已为本轮 visit pushState 了一条属于本文档的目标占位条目，直接
      // 真实跳转会串错条目链 —— 回退只回退地址、不恢复文档（Chrome 实测）。必须先
      // history.back() 撤掉它再跳；这步的 popstate 要临时屏蔽 swup 接管，免得它白拉一次。
      const originalSkip = options?.skipPopStateHandling;
      const restoreSkip = () => {
        if (options) options.skipPopStateHandling = originalSkip;
      };
      if (options) options.skipPopStateHandling = () => true;
      // 兜底：极端情况下没有可回退的条目（不应发生）时也别把点击吞掉
      const fallback = window.setTimeout(() => {
        restoreSkip();
        window.location.assign(target);
      }, 200);
      window.addEventListener(
        "popstate",
        () => {
          window.clearTimeout(fallback);
          restoreSkip();
          window.location.assign(target);
        },
        { once: true },
      );
      window.history.back();
    },
  );

  // 注：曾在此把 --content-delay 改为 0ms（让换页后内容立即浮现），但该变量被全部
  // 入场动画的 animation-delay: calc(var(--content-delay) + Xms) 消费，点击时修改
  // 会重算已完成动画的 delay（方向依赖的重启风险，且单向永不恢复）——已移除，
  // 保持 150ms 默认错落延迟。
  window.swup.hooks.on("content:replace", initCustomScrollbar);
  window.swup.hooks.on("content:replace", destroyAll, { before: true });
  // 首页↔其他页换页（is-home 变化时）挂 home-switch：仅全屏模式启用——
  // 让新内容淡入与横幅/网格 700ms 位移同速，换入即最终布局，消除"内容先显示、
  // 再位移"的闪烁（全屏下位移大 100vh↔35vh，且波浪下移出视口、缝隙不可见）。
  // 横幅模式回归 1.1.0 行为：不在 content:replace 提前切 is-home，换入后内容
  // 与波浪/横幅同速滑动（page:view 同步），避免"波浪滑过内容顶边露 1px 背景缝"
  // （Edge 75% 缩放可复现）。URL 在 animation:out:start 前已由 Swup pushState
  // 更新，可预判新页。
  // 当前是否全屏模式：运行时读取 <html data-banner-display>（访客可在面板切换
  // 壁纸模式，默认非全屏时手动切到全屏也应生效），不能按初始化时的值缓存
  function isFullscreenMode(): boolean {
    return document.documentElement.dataset.bannerDisplay === "fullscreen";
  }
  window.swup.hooks.on("animation:out:start", () => {
    if (
      !document.body.classList.contains("enable-banner") ||
      !isFullscreenMode()
    ) {
      document.documentElement.classList.remove("home-switch");
      return;
    }
    const nextIsHome = isHomePath();
    const currentIsHome = document.body.classList.contains("is-home");
    document.documentElement.classList.toggle(
      "home-switch",
      nextIsHome !== currentIsHome,
    );
  });
  // 旧内容已淡出、新内容未换入的空档切换 is-home（仅全屏模式：横幅/网格/波浪
  // 的 700ms 位移发生在不可见阶段，跳过动画的换页维持原 page:view 同步）。
  // 横幅模式不提前切换——新内容以旧 is-home 定位换入，page:view 后再整体滑动，
  // 内容与波浪/横幅同速联动，不产生波浪越过内容顶边时的 1px 缝隙
  window.swup.hooks.on(
    "content:replace",
    () => {
      if (
        document.documentElement.classList.contains("is-changing") &&
        isFullscreenMode()
      ) {
        syncHomeClass();
      }
    },
    { before: true },
  );
  // 换入动画结束（含被 home-switch 拉长的 700ms 淡入）后移除，两侧组件淡回
  window.swup.hooks.on("animation:in:end", () => {
    document.documentElement.classList.remove("home-switch");
  });
  // 注：此处原有「换页保留右栏音乐播放器」的寄存逻辑，因 #right-sidebar 曾是 Swup 容器。
  // 侧栏现已全部改为普通节点（容器只剩目录槽位），播放器不再被替换，寄存逻辑删除；留着
  // 反而危险（暂存后原位置查不到，归还分支会走 remove()）。副作用：被吸顶额度挤出可视区
  // 的播放器现在是「CSS 隐藏但继续播放」，旧实现是整块丢弃。
  window.swup.hooks.on("content:replace", () => {
    // 侧栏目录：左栏 #sidebar-toc、右栏 #right-sidebar-toc 两个槽位都是 Swup 容器，
    // 换页整块替换后自定义元素随新节点升级重建，这里再刷一次，兜住首帧的深度/高亮状态
    document
      .querySelectorAll(SIDEBAR_TOC_SELECTOR)
      .forEach((toc) =>
        (toc as HTMLElement & { refresh?: () => void }).refresh?.(),
      );
    // 换页兜底：弹窗是 swup 容器已整容器替换（自动关闭），但目录按钮在 Swup
    // 容器外不刷新，需复位「目录」图标与 aria 状态，避免残留 X 态。
    // （下方 updateTocBtnVisibility 的 close 只在按钮隐藏时收弹窗，两者分工不同）
    window.__etherealTocPopup?.close?.();
    updateTocBtnVisibility();
  });
  window.swup.hooks.on("page:view", () => {
    syncHomeClass();
    syncBannerOverlay();
    void initContentLightbox();
    void initPhotosGallery();
    showBanner();
    scrollFunction();
    initLegacyAdmonitions();
    initExternalLinkRedirect();
  });
  // 跨页回顶滚动统一走浏览器原生平滑（behavior:"smooth"，合成器驱动不占
  // 主线程，无 scrl 引擎的每帧 JS 测量卡顿）。同页锚点（目录点击）平滑由
  // samePageWithHash 独立控制，不受影响。
  // TOC 恢复显示绑定「滚动真正结束」：长文从底部回顶的原生平滑可持续数百
  // ms，晚于 visit:end + 200ms——若按 visit:end 移除 toc-not-ready，后半段
  // 滚动中目录就已显示。滚动结束信号双通道：原生平滑派发 scrollend 事件、
  // scrl 引擎派发 swup scroll:end（两者都监听，幂等 release）。
  // needsScrollWait 仅对「从非顶部换页回顶」的场景置真；从顶部换页（零距离
  // 短路无滚动结束信号）与 popstate 由 visit:end 直接移除
  let needsScrollWait = false;
  const releaseTocNotReady = () => {
    document.documentElement.classList.remove("toc-not-ready");
  };
  window.swup.hooks.on("scroll:end", () => {
    if (needsScrollWait) releaseTocNotReady();
  });
  window.addEventListener("scrollend", () => {
    if (needsScrollWait) releaseTocNotReady();
  });

  window.swup.hooks.on(
    "visit:start",
    (visit: {
      scroll?: { animate?: boolean };
      to?: { hash?: string };
      history?: { popstate?: boolean };
    }) => {
      restoreOriginalHistoryStateHandlers();
      // 标记会话内已发生换页（<html> 不被 Swup 替换，标记永久有效）：
      // 触发换页的容器会换入带静态 onload-animation 类的节点（两侧栏目录槽位、
      // #toc-container 等），transition.css 据此标记永久抑制其入场动画
      // （首刷动画不受影响）。
      document.documentElement.classList.add("swup-visited");
      // 换页进行中：目录隐藏（CSS 门控 html.toc-not-ready，覆盖两栏/三栏）。
      // 挂在 <html> 上而非容器类：Swup 换页会替换 #toc-container 与两侧栏的目录
      // 槽位 #sidebar-toc / #right-sidebar-toc，旧节点上的类随销毁，新节点无类会
      // 导致目录提前显示
      document.documentElement.classList.add("toc-not-ready");
      needsScrollWait =
        !visit?.history?.popstate && !visit?.to?.hash && window.scrollY > 0;
      // SwupScrollPlugin 在 before("visit:start")（priority -1）设置
      // visit.scroll.animate，此处（默认 priority 0）在接管回顶滚动时覆盖为
      // false，早于其 content:scroll 的 doScrollingBetweenPages 消费点。
      // popstate / 带 hash 场景仍交由插件默认处理，不覆盖
      if (!visit?.history?.popstate && !visit?.to?.hash && visit?.scroll) {
        visit.scroll.animate = false;
        // 原生滚动目标恒为 0，300vh 撑高防跳动无意义；且 visit:end
        // 隐藏撑高时文档高度骤降 300vh 会触发整页大重排（换页完成后卡顿
        // 来源）。跳过显示，visit:end 的隐藏随之变为无害 no-op
        document.getElementById("page-height-extend")?.classList.add("hidden");
      } else {
        document
          .getElementById("page-height-extend")
          ?.classList.remove("hidden");
      }
    },
  );
  // 跨页回顶滚动接管 content:scroll，统一改用浏览器原生平滑滚动（behavior:
  // "smooth"，合成器驱动不占主线程，无 scrl 引擎的每帧 JS 测量卡顿）：
  // content:replace 换入新内容后布局仍 dirty，立即滚动会派发 scroll 事件
  // → OverlayScrollbars 同步测量 → 强制整页重排（实测单帧 900ms）。延迟
  // 双 rAF 让浏览器先完成新内容首次布局，滚动时测量命中缓存不触发重排。
  // popstate / 带 hash 场景走插件默认逻辑（默认锚点滚动）。后注册的
  // replace 生效（Swup 按注册顺序取最后者）
  window.swup.hooks.replace(
    "content:scroll",
    (
      visit: {
        scroll?: { animate?: boolean };
        to?: { hash?: string };
        history?: { popstate?: boolean };
      },
      _args: unknown,
      defaultHandler?: (visit: unknown, args: unknown) => void,
    ) => {
      if (!visit?.history?.popstate && !visit?.to?.hash) {
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            window.scrollTo({ top: 0, behavior: "smooth" });
          }),
        );
        return;
      }
      defaultHandler?.(visit, _args);
    },
  );
  window.swup.hooks.on("visit:end", () => {
    setTimeout(() => {
      document.getElementById("page-height-extend")?.classList.add("hidden");
      // 未接管回顶滚动（hash/popstate/从顶部换页）直接移除；
      // 原生平滑长文回顶由 scrollend 驱动（见上），此处跳过
      if (!needsScrollWait) releaseTocNotReady();
    }, SWUP_VISIT_END_DELAY);
    // 兜底：滚动结束信号异常缺失（极端场景）时 2s 后强制恢复目录，
    // 避免永久隐藏（幂等，正常路径 scrollend/scroll:end 已先行移除）
    if (needsScrollWait) {
      setTimeout(releaseTocNotReady, 2000);
    }
  });
}

// 目录悬浮按钮显隐（I29）：只要页面没有可见目录（两栏悬浮目录 #toc-wrapper /
// 三栏侧栏目录 #sidebar table-of-contents、#right-sidebar table-of-contents），就显示目录悬浮按钮——
// 面向移动端/平板端无目录场景；空目录文章仍显示按钮，点开弹窗展示"此文章无目录"
// 占位（与目录小组件一致）。.floating-controls 位于 Swup 容器外、换页不刷新，
// 故换页（content:replace）与窗口 resize 都要重算：offsetParent 对 display:none
// 祖先返回 null，可准确反映两栏/三栏 TOC 在各断点下的实际可见性。
function updateTocBtnVisibility() {
  const btn = document.getElementById("back-to-toc-btn");
  if (!btn) return;
  const hasTocWidget = !!document.querySelector("#toc-popup table-of-contents");
  const floatingToc = document.getElementById("toc-wrapper");
  // 侧栏目录可能在左栏（#sidebar-toc 容器，目录位置配置为左）或右栏，两处都算
  const sideTocs = document.querySelectorAll(SIDEBAR_TOC_SELECTOR);
  const hasVisibleToc = !!(
    (floatingToc && floatingToc.offsetParent) ||
    Array.from(sideTocs).some((toc) => (toc as HTMLElement).offsetParent)
  );
  const show = hasTocWidget && !hasVisibleToc;
  btn.classList.toggle("hide", !show);
  if (!show) {
    // 按钮隐藏（换页到无目录页 / 拉宽到有目录的断点）时同步收起弹窗
    window.__etherealTocPopup?.close?.();
  }
  // 目录按钮参与自定义按钮的位置计数，显隐变化后重新计算
  window.__etherealFloatingControlsReposition?.();
}

// ── 初始化 ──
function init() {
  syncHomeClass();
  // 首次同步完成：恢复 wave 平滑过渡（加载早期被 html:not(.page-ready) 抑制，
  // 避免 syncHomeClass 首次设置 transform 时产生 700ms 条带位移）。必须双 rAF
  // 延迟：同帧加 page-ready 会让渲染时过渡仍生效（transform 与 class 同帧提交）。
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      document.documentElement.classList.add("page-ready");
    });
  });
  setTheme(getStoredTheme());
  setHue(getHue());
  initCustomScrollbar();
  showBanner();
  initLegacyAdmonitions();
  updateTocBtnVisibility();
}

setClickOutsideToClose("display-setting", [
  "display-setting",
  "display-settings-switch",
]);
// 注：nav-menu-panel 已改为右侧抽屉（body.nav-menu-open 驱动），关闭逻辑由
// navbar.js 统一处理（遮罩点击/关闭按钮/链接点击/ESC），不再作为 float-panel 处理
setClickOutsideToClose("search-panel", [
  "search-panel",
  "search-bar",
  "search-switch",
]);

// 向下箭头滚动目标：暴露给 MainGridLayout 内联事件委托脚本调用（按钮与委托
// 位于 Swup 容器外，模块本体仅执行一次，无需额外防重绑定守卫）
if (!(window as any).__etherealScrollDown) {
  (window as any).__etherealScrollDown = scrollDownToContent;
}

init();
void initContentLightbox();
void initPhotosGallery();

if (window?.swup?.hooks) {
  setupSwup();
} else {
  document.addEventListener("swup:enable", setupSwup);
}

scrollFunction();
initExternalLinkRedirect();
initProfileStatus();
// 窗口尺寸变化（横竖屏切换/拉宽拉窄）后重算目录按钮显隐与弹窗锚定
window.addEventListener("resize", updateTocBtnVisibility);
