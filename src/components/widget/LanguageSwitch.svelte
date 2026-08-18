<script lang="ts">
  import { onMount } from "svelte";
  import { t } from "../../utils/i18n";

  // 前台语言面板：仅三种可选手动语言（跟随系统不提供，默认语言由后台「主题语言」配置决定）。
  // 切换机制：写入 Halo 官方 language cookie（ThemeLocaleContextResolver 原生支持，
  // 优先级高于站点首选语言与浏览器语言），随后整页刷新由 Thymeleaf 服务端用新语言重渲染。
  const LANGS: { code: string; icon: string; label: string }[] = [
    {
      code: "zh-CN",
      icon: "icon-[material-symbols--language-chinese-pinyin-rounded]",
      label: "简体中文",
    },
    {
      code: "zh-TW",
      icon: "icon-[material-symbols--language-chinese-cangjie-rounded]",
      label: "繁體中文",
    },
    {
      code: "en",
      icon: "icon-[material-symbols--language-gb-english-rounded]",
      label: "English",
    },
  ];

  let panelOpen = $state(false);
  let currentLang = $state("");

  // 当前生效语言：优先取 language cookie（访客显式选择），否则回退到
  // 服务端渲染的 <html lang>（站点默认 / 浏览器语言解析结果）。
  // 归一化逻辑复用 Layout.astro 注入的全局 __etherealLangTag（单一来源）
  function detectCurrent(): string {
    const match = document.cookie.match(/(?:^|;\s*)language=([^;]*)/);
    const value = match ? match[1].trim() : "";
    return window.__etherealLangTag(value || document.documentElement.lang);
  }

  function onDocumentClick(e: MouseEvent) {
    const target = e.target as Element | null;
    // 点击按钮/面板范围之外则收起（与深浅色切换面板同款 document 级委托）
    if (target && !target.closest("#language-switch, #language-panel")) {
      panelOpen = false;
    }
  }

  onMount(() => {
    currentLang = detectCurrent();
    document.addEventListener("click", onDocumentClick);
    return () => document.removeEventListener("click", onDocumentClick);
  });

  function togglePanel() {
    panelOpen = !panelOpen;
  }

  function switchLang(code: string) {
    panelOpen = false;
    if (code === detectCurrent()) return;
    // 防重复触发：同一次会话内连点语言项只发一次重载（页面刷新后标记自然清空）
    if (window.__etherealLangSwitching) return;
    window.__etherealLangSwitching = true;
    // 写语言 cookie（复用全局助手）+ 显式选择标记：标记存在时默认语言引导不再覆盖访客选择
    window.__etherealSetLanguage(code);
    document.cookie =
      "ethereal_lang_chosen=1; path=/; max-age=31536000; samesite=Lax";
    // 服务端模板文案随 locale 变化，必须整页重载重渲染。
    // 延迟一拍：让 cookie 落定、避开点击事件与 Swup 换页过渡的竞态；
    // 用 replace 发起导航，避免个别浏览器对 reload() 的特殊缓存/bfcache 处理。
    setTimeout(function () {
      window.location.replace(window.location.href);
    }, 60);
  }
</script>

<div class="relative group" role="menu" tabindex="-1">
  <button
    aria-label={t("nav.language", "语言")}
    aria-haspopup="menu"
    aria-expanded={panelOpen}
    role="menuitem"
    class="relative btn-plain scale-animation rounded-lg h-11 w-11 active:scale-90"
    id="language-switch"
    onclick={togglePanel}
  >
    <div class="absolute inset-0 flex items-center justify-center">
      <div class="icon-[material-symbols--translate-rounded] text-[1.25rem] leading-none"></div>
    </div>
  </button>

  <!-- 点击主按钮展开的悬浮选框：打开时 float-panel-closed 移除（浮层显示），
       选择语言 / 再次点击 / 点击外部三种方式收起。面板容器 role="none"
       让 menu 的直接语义子项收敛为 menuitem（严格 ARIA） -->
  <div
    id="language-panel"
    role="none"
    class="float-panel absolute z-50 !top-16 -right-2 p-2"
    class:float-panel-closed={!panelOpen}
  >
    {#each LANGS as lang, i}
      <button
        role="menuitem"
        class="flex transition whitespace-nowrap items-center !justify-start w-full btn-plain scale-animation rounded-lg h-9 px-3 font-medium active:scale-95 {i < LANGS.length - 1 ? 'mb-0.5' : ''}"
        class:current-theme-btn={currentLang === lang.code}
        onclick={() => switchLang(lang.code)}
      >
        <div class="{lang.icon} text-[1.25rem] mr-3"></div>
        {lang.label}
      </button>
    {/each}
  </div>
</div>