<script lang="ts">
  import { onMount } from "svelte";
  import type { Hit, SearchResult } from "../types/searchResult";
  import { t } from "../utils/i18n";

  let keywordDesktop = $state("");
  let keywordMobile = $state("");
  let result = $state<Hit[]>([]);
  let isSearching = $state(false);
  let initialized = $state(false);
  let desktopTimer: number | undefined;
  let mobileTimer: number | undefined;
  let searchId = 0;
  let abortController: AbortController | null = null;

  const escapeHtml = (value: string) =>
    value
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  const renderHighlighted = (value?: string) =>
    escapeHtml(value || "")
      .replaceAll("&lt;mark&gt;", "<mark>")
      .replaceAll("&lt;/mark&gt;", "</mark>");

  const excerptOf = (hit: Hit) => renderHighlighted(hit.description || hit.content || "");

  const togglePanel = () => {
    const panel = document.getElementById("search-panel");
    panel?.classList.toggle("float-panel-closed");
  };

  const setPanelVisibility = (show: boolean, isDesktop: boolean): void => {
    const panel = document.getElementById("search-panel");
    if (!panel || !isDesktop) return;

    if (show) {
      panel.classList.remove("float-panel-closed");
    } else {
      panel.classList.add("float-panel-closed");
    }
  };

  const search = async (keyword: string, isDesktop: boolean): Promise<void> => {
    const normalizedKeyword = keyword.trim();
    const currentSearchId = ++searchId;

    // 取消上一次未完成的请求
    if (abortController) {
      abortController.abort();
    }
    abortController = new AbortController();

    if (!normalizedKeyword) {
      result = [];
      setPanelVisibility(false, isDesktop);
      return;
    }

    isSearching = true;

    try {
      const response = await fetch("/apis/api.halo.run/v1alpha1/indices/-/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          keyword: normalizedKeyword,
          highlightPreTag: "<mark>",
          highlightPostTag: "</mark>",
          limit: 20,
        }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        throw new Error(`Search request failed: ${response.status}`);
      }

      const data = (await response.json()) as SearchResult;
      if (currentSearchId !== searchId) return;
      result = data.hits || [];
      setPanelVisibility(result.length > 0, isDesktop);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        // 请求被主动取消，无需处理
        return;
      }
      console.error("Search error:", error);
      if (currentSearchId !== searchId) return;
      result = [];
      setPanelVisibility(false, isDesktop);
    } finally {
      if (currentSearchId === searchId) {
        isSearching = false;
      }
    }
  };

  const scheduleSearch = (keyword: string, isDesktop: boolean) => {
    const timer = isDesktop ? desktopTimer : mobileTimer;
    if (timer) {
      window.clearTimeout(timer);
    }

    const nextTimer = window.setTimeout(() => {
      search(keyword, isDesktop);
    }, 250);

    if (isDesktop) {
      desktopTimer = nextTimer;
    } else {
      mobileTimer = nextTimer;
    }
  };

  onMount(() => {
    initialized = true;
    return () => {
      if (desktopTimer) window.clearTimeout(desktopTimer);
      if (mobileTimer) window.clearTimeout(mobileTimer);
    };
  });

  $effect(() => {
    if (initialized) {
      scheduleSearch(keywordDesktop, true);
    }
  });

  $effect(() => {
    if (initialized) {
      scheduleSearch(keywordMobile, false);
    }
  });
</script>

<!-- search bar for desktop view -->
<div
  id="search-bar"
  class="mr-2 hidden h-11 items-center rounded-lg bg-black/[0.04] transition-all hover:bg-black/[0.06] focus-within:bg-black/[0.06] dark:bg-white/5 dark:hover:bg-white/10 dark:focus-within:bg-white/10 lg:flex"
>
  <!-- 搜索图标：text-black/30 对比度不足，升为 /50 提升可见性（与 PostCard 元信息处理一致） -->
  <span class="icon-[material-symbols--search] pointer-events-none absolute ml-3 text-[1.25rem] text-black/50 transition dark:text-white/50"></span>
  <!-- placeholder 不能作为可靠的可访问名称（输入后消失），补 aria-label；
       id/name：表单字段可访问性（浏览器自动填充） -->
  <input
    id="search-input-desktop"
    name="search"
    placeholder={t("search.placeholder", "搜索")}
    aria-label={t("search.placeholder", "搜索")}
    bind:value={keywordDesktop}
    onfocus={() => search(keywordDesktop, true)}
    class="h-full w-40 bg-transparent pl-10 text-sm text-black/50 outline-0 transition-all active:w-60 focus:w-60 dark:text-white/50"
  />
</div>

<!-- toggle btn for phone/tablet view -->
<button
  onclick={togglePanel}
  aria-label={t("search.panel", "Search Panel")}
  id="search-switch"
  class="btn-plain scale-animation h-11 w-11 rounded-lg active:scale-90 lg:!hidden"
  type="button"
>
  <span class="icon-[material-symbols--search] text-[1.25rem]"></span>
</button>

<!-- search panel -->
<div
  id="search-panel"
  class="float-panel search-panel float-panel-closed absolute left-4 right-4 top-20 rounded-2xl p-2 shadow-2xl md:left-[unset] md:w-[30rem]"
>
  <!-- search bar inside panel for phone/tablet -->
  <div
    id="search-bar-inside"
    class="relative flex h-11 items-center rounded-xl bg-black/[0.04] transition-all hover:bg-black/[0.06] focus-within:bg-black/[0.06] dark:bg-white/5 dark:hover:bg-white/10 dark:focus-within:bg-white/10 lg:hidden"
  >
    <!-- 搜索图标：同桌面端，升为 /50 提升可见性 -->
    <span class="icon-[material-symbols--search] pointer-events-none absolute ml-3 text-[1.25rem] text-black/50 transition dark:text-white/50"></span>
    <!-- placeholder 不能作为可靠的可访问名称（输入后消失），补 aria-label；
         id/name：表单字段可访问性（浏览器自动填充） -->
    <!-- mobile 输入框：absolute inset-0 铺满搜索条；聚焦只需边框环提示，
         不能套用桌面端 focus:w-60 定宽（会破坏占满宽度，即 #58） -->
    <input
      id="search-input-mobile"
      name="search"
      placeholder={t("search.placeholder", "搜索")}
      aria-label={t("search.placeholder", "搜索")}
      bind:value={keywordMobile}
      class="absolute inset-0 bg-transparent pl-10 text-sm text-black/50 outline-0 dark:text-white/50"
    />
  </div>

  <div class="overflow-y-auto" style="max-height: calc(100vh - 132px)">
    {#if isSearching}
      <!-- 状态消息是真实内容而非装饰，用更高对比度的 text-50 -->
      <div class="px-3 py-3 text-sm text-50">{t("search.loading", "搜索中...")}</div>
    {:else if (keywordDesktop || keywordMobile) && result.length === 0}
      <div class="px-3 py-3 text-sm text-50">{t("search.noResults", "没有搜索结果")}</div>
    {/if}

    <!-- search results -->
    {#each result as item}
      <a
        href={item.permalink}
        class="group block rounded-xl px-3 py-2 text-lg transition first-of-type:mt-2 hover:bg-(--btn-plain-bg-hover) active:bg-(--btn-plain-bg-active) lg:first-of-type:mt-0"
      >
        <div class="inline-flex font-bold text-90 transition group-hover:text-(--primary)">
          {@html renderHighlighted(item.title)}
          <span class="icon-[fa6-solid--chevron-right] my-auto translate-x-1 text-[0.75rem] text-(--primary) transition"></span>
        </div>
        <div class="text-sm text-50 transition">
          {@html excerptOf(item)}
        </div>
      </a>
    {/each}
  </div>
</div>

<style>
  /* 键盘聚焦（focus-visible）时提供可见焦点环，替代原来无条件 outline:0 导致的
     焦点不可见问题；鼠标点击不显示，避免视觉干扰 */
  input:focus-visible {
    outline: 2px solid var(--primary);
    outline-offset: -2px;
    border-radius: 0.5rem;
  }


</style>
