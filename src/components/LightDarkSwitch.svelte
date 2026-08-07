<script lang="ts">
  import { AUTO_MODE, DARK_MODE, LIGHT_MODE } from "../constants/constants.ts";

  import {
    applyThemeToDocument,
    getStoredTheme,
    resolveSchemeDark,
    setTheme,
  } from "../utils/setting-utils.ts";
  import { runThemeTransition } from "../utils/theme-transition.ts";
  import { onMount } from "svelte";
  import type { LIGHT_DARK_MODE } from "../types/config.ts";
  import { t } from "../utils/i18n";

  let mode: LIGHT_DARK_MODE = $state(AUTO_MODE);
  // 悬浮选框开合：点击主按钮展开，选择主题 / 再次点击 / 点击外部收起
  let panelOpen = $state(false);
  // 主按钮 DOM 引用（bind:this）：提供圆形扩散圆心，不依赖 getElementById
  //（macOS Chrome 下偶发查询不到导致圆心回退视口中心）
  let schemeSwitchBtn = $state<HTMLButtonElement>();

  function onDocumentClick(e: MouseEvent) {
    const target = e.target as Element | null;
    // 点击按钮/面板范围之外则收起（按钮与面板都在外层 .group 内）
    if (target && !target.closest("#scheme-switch, #light-dark-panel")) {
      panelOpen = false;
    }
  }

  onMount(() => {
    mode = getStoredTheme();
    const darkModePreference = window.matchMedia("(prefers-color-scheme: dark)");
    const changeThemeWhenSchemeChanged: Parameters<
      typeof darkModePreference.addEventListener<"change">
    >[1] = (_e) => {
      applyThemeToDocument(mode);
    };
    darkModePreference.addEventListener("change", changeThemeWhenSchemeChanged);
    // 点击外部收起（document 级委托，与 navbar.js 面板开关模式一致）
    document.addEventListener("click", onDocumentClick);
    return () => {
      darkModePreference.removeEventListener(
        "change",
        changeThemeWhenSchemeChanged,
      );
      document.removeEventListener("click", onDocumentClick);
    };
  });

  function togglePanel() {
    panelOpen = !panelOpen;
  }

  function switchScheme(newMode: LIGHT_DARK_MODE) {
    // 选择主题后关闭悬浮选框（即使选中当前模式也算完成一次选择）
    panelOpen = false;
    if (newMode === mode) {
      return;
    }
    mode = newMode;
    // 固定模式与系统主题间切换时，实际渲染明暗可能不变（如系统为暗色时在
    // "暗色"与"系统"间切换）：此时只更新选择与持久化，跳过动画与重载，
    // 避免快照相同的空转动画卡顿
    const actualDark = document.documentElement.classList.contains("dark");
    if (resolveSchemeDark(newMode) === actualDark) {
      setTheme(newMode, true);
      return;
    }
    // 按钮圆心（视口 px）：从组件引用取，macOS Chrome 下 getElementById
    // 偶发查不到主按钮导致圆心回退视口中心
    const rect = schemeSwitchBtn?.getBoundingClientRect();
    const origin = rect
      ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
      : undefined;
    runThemeTransition(() => {
      setTheme(newMode, true);
    }, origin);
  }
</script>

<div class="relative group" role="menu" tabindex="-1">
  <button bind:this={schemeSwitchBtn} aria-label={t("nav.lightDark", "Light/Dark Mode")} aria-haspopup="menu" aria-expanded={panelOpen} role="menuitem" class="relative btn-plain scale-animation rounded-lg h-11 w-11 active:scale-90" id="scheme-switch" onclick={togglePanel}>
    <div class="absolute inset-0 flex items-center justify-center" class:opacity-0={mode !== LIGHT_MODE}>
      <div class="icon-[material-symbols--wb-sunny-outline-rounded] text-[1.25rem] leading-none"></div>
    </div>
    <div class="absolute inset-0 flex items-center justify-center" class:opacity-0={mode !== DARK_MODE}>
      <div class="icon-[material-symbols--dark-mode-outline-rounded] text-[1.25rem] leading-none"></div>
    </div>
    <div class="absolute inset-0 flex items-center justify-center" class:opacity-0={mode !== AUTO_MODE}>
      <div class="icon-[material-symbols--radio-button-partial] text-[1.25rem] leading-none"></div>
    </div>
  </button>

  <!-- 点击主按钮展开的悬浮选框：打开时 float-panel-closed 移除（浮层显示），
       选择主题 / 再点按钮 / 点击外部三种方式收起。面板容器 role="none"
       让 menu 的直接语义子项收敛为 menuitem（严格 ARIA） -->
  <div id="light-dark-panel" role="none" class="float-panel absolute z-50 !top-16 -right-2 p-2" class:float-panel-closed={!panelOpen}>
    <!-- 面板内主题选择按钮：补 role="menuitem"（外层容器为 role="menu"，
         菜单的直接子项需为 menuitem，否则触发 aria-required-children 违规） -->
    <button role="menuitem" class="flex transition whitespace-nowrap items-center !justify-start w-full btn-plain scale-animation rounded-lg h-9 px-3 font-medium active:scale-95 mb-0.5"
            class:current-theme-btn={mode === LIGHT_MODE}
            onclick={() => switchScheme(LIGHT_MODE)}
    >
      <div class="icon-[material-symbols--wb-sunny-outline-rounded] text-[1.25rem] mr-3"></div>
      {t("theme.light", "亮色")}
    </button>
    <button role="menuitem" class="flex transition whitespace-nowrap items-center !justify-start w-full btn-plain scale-animation rounded-lg h-9 px-3 font-medium active:scale-95 mb-0.5"
            class:current-theme-btn={mode === DARK_MODE}
            onclick={() => switchScheme(DARK_MODE)}
    >
      <div class="icon-[material-symbols--dark-mode-outline-rounded] text-[1.25rem] mr-3"></div>
      {t("theme.dark", "暗色")}
    </button>
    <button role="menuitem" class="flex transition whitespace-nowrap items-center !justify-start w-full btn-plain scale-animation rounded-lg h-9 px-3 font-medium active:scale-95"
            class:current-theme-btn={mode === AUTO_MODE}
            onclick={() => switchScheme(AUTO_MODE)}
    >
      <div class="icon-[material-symbols--radio-button-partial] text-[1.25rem] mr-3"></div>
      {t("theme.system", "系统")}
    </button>
  </div>
</div>
