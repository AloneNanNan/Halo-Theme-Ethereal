<script lang="ts">
  import {
    getDefaultHue,
    getHue,
    setHue,
    isHueFixed,
    getVisitorSwitches,
    getStoredPostListLayout,
    setPostListLayout,
    getDefaultCardHoverLift,
    getDefaultNavbarBlur,
    getStoredCardHoverLift,
    getStoredNavbarBlur,
    setCardHoverLift,
    setNavbarBlur,
    getDefaultPostListMasonry,
    getStoredPostListMasonry,
    setPostListMasonry,
    getCurrentWallpaperDefaults,
    getStoredWallpaperParams,
    setWallpaperParam,
    getDefaultBannerDisplay,
    getStoredBannerDisplay,
    setBannerDisplay,
    getDefaultFullscreenLayout,
    getStoredFullscreenLayout,
    setFullscreenLayout,
    getDefaultWave,
    getStoredWave,
    setWave,
    getDefaultGradient,
    getStoredGradient,
    setGradient,
    getDefaultCarousel,
    getStoredCarousel,
    setCarousel,
    getDefaultBannerTitle,
    getStoredBannerTitle,
    setBannerTitle,
    resetPostListLayout,
    resetCardStyle,
    resetWallpaperParams,
    resetWallpaperMode,
    resetWave,
    resetGradient,
    resetCarousel,
    resetBannerTitle,
    getDefaultSakuraEnabled,
    getStoredSakuraEnabled,
    setSakuraEnabled,
    resetSakura,
    getDefaultCardBorderEnabled,
    getStoredCardBorderEnabled,
    setCardBorderEnabled,
    resetCardBorder,
    getDefaultCardFollowThemeEnabled,
    getStoredCardFollowThemeEnabled,
    setCardFollowThemeEnabled,
    resetCardFollowTheme,
    type PostListLayoutMode,
    type BannerDisplayMode,
    type FullscreenLayoutMode,
  } from "../../utils/setting-utils";
  import { t } from "../../utils/i18n";

  /* ── 主题色（原有） ── */
  let hue = $state(getHue());
  const defaultHue = getDefaultHue();
  const hueFixed = isHueFixed();

  function resetHue() {
    hue = getDefaultHue();
  }

  $effect(() => {
    setHue(hue);
  });

  /* ── 访客样式切换：分区可见性 ── */
  const switches = getVisitorSwitches();
  const showLayout = switches.postListLayout;
  const showCardStyle = switches.cardStyle;

  /* ── 壁纸模式 / 壁纸设置（首页壁纸标题 + 波浪）状态 ── */
  let wallpaperMode = $state<BannerDisplayMode>(getStoredBannerDisplay());
  let fullscreenLayout = $state<FullscreenLayoutMode>(getStoredFullscreenLayout());
  let wave = $state(getStoredWave());
  let gradient = $state(getStoredGradient());
  let carousel = $state(getStoredCarousel());
  let bannerTitle = $state(getStoredBannerTitle());
  const defaultBannerDisplay = getDefaultBannerDisplay();
  const defaultWave = getDefaultWave();
  const defaultGradient = getDefaultGradient();
  const defaultCarousel = getDefaultCarousel();
  const defaultBannerTitle = getDefaultBannerTitle();
  const dirtyWallpaperMode = $derived(wallpaperMode !== defaultBannerDisplay);
  const dirtyWallpaperSettings = $derived(
    wave !== defaultWave ||
      gradient !== defaultGradient ||
      carousel !== defaultCarousel ||
      bannerTitle !== defaultBannerTitle,
  );

  // 壁纸参数区跟随访客当前生效模式（仅全屏透明时显示），而非服务端初值
  const showWallpaperMode = switches.wallpaperMode;
  // 壁纸设置区（横幅/全屏：首页壁纸标题 + 波浪开关）：访客壁纸设置开关 + 任一后台项
  // 可用（首页壁纸标题或波浪）且访客可切壁纸模式时可见，具体渲染还取决于当前模式
  const showWallpaperSettings =
    showWallpaperMode &&
    switches.wallpaperSettings &&
    (defaultWave || defaultBannerTitle);
  // 壁纸参数区（透明度/模糊度/卡片透明度）：透明模式全显示；全屏沉浸(hero)布局下
  // 显示「背景模糊度」+「卡片透明度」（hero 模糊斜坡封顶/卡片磨砂均消费，对齐 onlynn 可调）
  const showWallpaper = $derived(
    switches.transparent &&
      (wallpaperMode === "transparent" ||
        (wallpaperMode === "fullscreen" && fullscreenLayout === "hero")),
  );

  /* ── 面板 Tab（外观 / 壁纸 / 特效，参考 firefly） ── */
  const hasAppearanceContent = $derived(!hueFixed || showLayout || showCardStyle);
  const hasWallpaperContent = $derived(showWallpaperMode || showWallpaper);
  // 特效分区：访客特效开关 + 后台已启用樱花（后台为总开关，未启用则无法开启）
  const defaultSakuraEnabled = getDefaultSakuraEnabled();
  const hasEffectsContent = $derived(switches.effects && defaultSakuraEnabled);
  const visibleTabCount = $derived(
    [hasAppearanceContent, hasWallpaperContent, hasEffectsContent].filter(Boolean)
      .length,
  );
  const showTabBar = $derived(visibleTabCount > 1);
  let activeTab = $state<"appearance" | "wallpaper" | "effects">("appearance");

  // 当前 Tab 不可用时自动切换到可用的 Tab
  $effect(() => {
    if (
      (activeTab === "appearance" && !hasAppearanceContent) ||
      (activeTab === "wallpaper" && !hasWallpaperContent) ||
      (activeTab === "effects" && !hasEffectsContent)
    ) {
      if (hasAppearanceContent) activeTab = "appearance";
      else if (hasWallpaperContent) activeTab = "wallpaper";
      else if (hasEffectsContent) activeTab = "effects";
    }
  });

  /* ── 文章布局：当前生效值 = localStorage 覆盖 ?? 容器实际类（启动脚本已应用覆盖） ── */
  function serverLayout(): PostListLayoutMode {
    const container = document.getElementById("post-list-container");
    const server = container?.dataset.serverLayout;
    return server === "grid" || server === "list" ? server : "list";
  }

  function currentLayout(): PostListLayoutMode {
    const stored = getStoredPostListLayout();
    if (stored) return stored;
    const container = document.getElementById("post-list-container");
    if (container) {
      return container.classList.contains("post-grid-mode") ? "grid" : "list";
    }
    return "list";
  }

  let layout = $state<PostListLayoutMode>(currentLayout());
  let cardHoverLift = $state(getStoredCardHoverLift());
  let navbarBlur = $state(getStoredNavbarBlur());
  let postListMasonry = $state(getStoredPostListMasonry());
  // 樱花特效（前台面板「特效」分区）
  let sakuraEnabled = $state(getStoredSakuraEnabled());
  // 卡片边框和阴影 / 卡片跟随主题色（对齐 Firefly）
  let cardBorder = $state(getStoredCardBorderEnabled());
  let cardFollowTheme = $state(getStoredCardFollowThemeEnabled());
  // 面板里透明度类参数以百分比展示（存储为 0–1）
  const storedWallpaper = getStoredWallpaperParams();
  let wallpaperOpacity = $state(Math.round(storedWallpaper.opacity * 100));
  let wallpaperBlur = $state(Math.round(storedWallpaper.blur));
  let wallpaperCardAlpha = $state(Math.round(storedWallpaper.cardAlpha * 100));
  // 各分区是否偏离默认（用于标题旁「恢复默认」按钮显隐）。
  // 判定与主题色一致：对比当前值与默认值，手动切回默认即自动隐藏。
  const defaultLayout = serverLayout();
  const defaultCardHoverLift = getDefaultCardHoverLift();
  const defaultNavbarBlur = getDefaultNavbarBlur();
  const defaultPostListMasonry = getDefaultPostListMasonry();
  const defaultWallpaper = getCurrentWallpaperDefaults();
  const dirtyLayout = $derived(layout !== defaultLayout);
  const dirtyCard = $derived(
    cardHoverLift !== defaultCardHoverLift ||
      navbarBlur !== defaultNavbarBlur ||
      postListMasonry !== defaultPostListMasonry,
  );
  const dirtySakura = $derived(sakuraEnabled !== defaultSakuraEnabled);
  const defaultCardBorder = getDefaultCardBorderEnabled();
  const defaultCardFollowTheme = getDefaultCardFollowThemeEnabled();
  const dirtyCardBorder = $derived(cardBorder !== defaultCardBorder);
  const dirtyCardFollowTheme = $derived(
    cardFollowTheme !== defaultCardFollowTheme,
  );
  const showMasonry = $derived(showCardStyle && layout === "grid");
  const dirtyWallpaper = $derived(
    wallpaperOpacity !== Math.round(defaultWallpaper.opacity * 100) ||
      wallpaperBlur !== Math.round(defaultWallpaper.blur) ||
      wallpaperCardAlpha !== Math.round(defaultWallpaper.cardAlpha * 100),
  );

  const modes: {
    value: BannerDisplayMode;
    icon: string;
    key: string;
    label: string;
  }[] = [
    {
      value: "disabled",
      icon: "icon-[material-symbols--hide-image-outline-rounded]",
      key: "display.wallpaperModeDisabled",
      label: "纯色背景",
    },
    {
      value: "banner",
      icon: "icon-[material-symbols--image-outline-rounded]",
      key: "display.wallpaperModeBanner",
      label: "横幅壁纸",
    },
    {
      value: "fullscreen",
      icon: "icon-[material-symbols--wallpaper-rounded]",
      key: "display.wallpaperModeFullscreen",
      label: "全屏壁纸",
    },
    {
      value: "transparent",
      icon: "icon-[material-symbols--full-coverage-outline-rounded]",
      key: "display.wallpaperModeTransparent",
      label: "覆盖透明",
    },
  ];

  function chooseMode(mode: BannerDisplayMode) {
    wallpaperMode = mode;
    setBannerDisplay(mode);
  }

  function chooseFsLayout(mode: FullscreenLayoutMode) {
    fullscreenLayout = mode;
    setFullscreenLayout(mode);
  }

  function toggleWave() {
    wave = !wave;
    setWave(wave);
  }

  function toggleGradient() {
    gradient = !gradient;
    setGradient(gradient);
  }

  function toggleCarousel() {
    carousel = !carousel;
    setCarousel(carousel);
  }

  function toggleSakura() {
    sakuraEnabled = !sakuraEnabled;
    setSakuraEnabled(sakuraEnabled);
  }

  function resetSakuraBtn() {
    resetSakura();
    sakuraEnabled = defaultSakuraEnabled;
  }

  function toggleCardBorder() {
    cardBorder = !cardBorder;
    setCardBorderEnabled(cardBorder);
  }

  function resetCardBorderBtn() {
    resetCardBorder();
    cardBorder = defaultCardBorder;
  }

  function toggleCardFollowTheme() {
    cardFollowTheme = !cardFollowTheme;
    setCardFollowThemeEnabled(cardFollowTheme);
  }

  function resetCardFollowBtn() {
    resetCardFollowTheme();
    cardFollowTheme = defaultCardFollowTheme;
  }

  function toggleBannerTitle() {
    bannerTitle = !bannerTitle;
    setBannerTitle(bannerTitle);
  }

  function resetWallpaperModeBtn() {
    resetWallpaperMode();
    wallpaperMode = getDefaultBannerDisplay();
  }

  function resetWallpaperSettingsBtn() {
    resetWave();
    resetGradient();
    resetCarousel();
    resetBannerTitle();
    wave = getDefaultWave();
    gradient = getDefaultGradient();
    carousel = getDefaultCarousel();
    bannerTitle = getDefaultBannerTitle();
  }

  function chooseLayout(mode: PostListLayoutMode) {
    layout = mode;
    setPostListLayout(mode);
  }

  function resetLayout() {
    resetPostListLayout();
    layout = serverLayout();
  }

  function toggleCardHoverLift() {
    cardHoverLift = !cardHoverLift;
    setCardHoverLift(cardHoverLift);
  }

  function toggleNavbarBlur() {
    navbarBlur = !navbarBlur;
    setNavbarBlur(navbarBlur);
  }

  function toggleMasonry() {
    postListMasonry = !postListMasonry;
    setPostListMasonry(postListMasonry);
  }

  function resetCard() {
    resetCardStyle();
    cardHoverLift = getDefaultCardHoverLift();
    navbarBlur = getDefaultNavbarBlur();
    postListMasonry = getDefaultPostListMasonry();
  }

  function applyOpacity() {
    setWallpaperParam("wallpaperOpacity", wallpaperOpacity / 100);
  }

  function applyBlur() {
    setWallpaperParam("wallpaperBlur", wallpaperBlur);
  }

  function applyCardAlpha() {
    setWallpaperParam("wallpaperCardAlpha", wallpaperCardAlpha / 100);
  }

  function resetWallpaper() {
    resetWallpaperParams();
    const p = getCurrentWallpaperDefaults();
    wallpaperOpacity = Math.round(p.opacity * 100);
    wallpaperBlur = Math.round(p.blur);
    wallpaperCardAlpha = Math.round(p.cardAlpha * 100);
  }
</script>

<div id="display-setting" class="float-panel float-panel-closed absolute w-80 right-4 px-4 pb-4 pt-0">
  {#if showTabBar}
    <div class="panel-tabs" role="tablist">
      <button type="button" class="panel-tab" class:panel-tab-on={activeTab === "appearance"}
              role="tab" aria-selected={activeTab === "appearance"} on:click={() => (activeTab = "appearance")}>
        <span>{t("display.tabAppearance", "外观")}</span>
      </button>
      <button type="button" class="panel-tab" class:panel-tab-on={activeTab === "wallpaper"}
              role="tab" aria-selected={activeTab === "wallpaper"} on:click={() => (activeTab = "wallpaper")}>
        <span>{t("display.tabWallpaper", "壁纸")}</span>
      </button>
      {#if hasEffectsContent}
        <button type="button" class="panel-tab" class:panel-tab-on={activeTab === "effects"}
                role="tab" aria-selected={activeTab === "effects"} on:click={() => (activeTab = "effects")}>
          <span>{t("display.tabEffects", "特效")}</span>
        </button>
      {/if}
    </div>
  {/if}

  <div class="panel-sections" class:pt-3={!showTabBar}>
    {#if activeTab === "appearance"}
      <!-- 主题色 -->
      {#if !hueFixed}
        <div class="flex flex-row gap-2 mb-3 items-center justify-between">
          <div class="section-title">
            {t("theme.color", "主题色相")}
            <button aria-label={t("theme.resetDefault", "Reset to Default")} class="btn-regular w-7 h-7 rounded-md  active:scale-90 will-change-transform"
                    class:opacity-0={hue === defaultHue} class:pointer-events-none={hue === defaultHue} on:click={resetHue}>
              <div class="text-(--btn-content)">
                <div icon="fa6-solid:arrow-rotate-left" class="icon-[fa6-solid--arrow-rotate-left] text-[0.875rem]"></div>
              </div>
            </button>
          </div>
          <div class="flex gap-1">
            <div id="hueValue" class="transition bg-(--btn-regular-bg) w-10 h-7 rounded-md flex justify-center
                  font-bold text-sm items-center text-(--btn-content)">
              {hue}
            </div>
          </div>
        </div>
        <div class="w-full h-6 rounded select-none overflow-hidden">
          <!-- aria-label 原为写死的 "11"（当前值），屏幕阅读器会误读；改为固定语义标签
               "主题色"，当前值由 range 的 aria-valuenow 自动暴露 -->
          <input aria-label={t("theme.color", "主题色相")} type="range" min="0" max="360" bind:value={hue}
                 class="display-setting-slider" id="colorSlider" step="5" style="width: 100%">
        </div>
      {/if}

      <!-- 文章布局 -->
      {#if showLayout}
        <div class="section-title mb-3">
          {t("display.layout", "文章布局")}
          <button aria-label={t("theme.resetDefault", "Reset to Default")} class="btn-regular w-7 h-7 rounded-md active:scale-90 will-change-transform"
                  class:opacity-0={!dirtyLayout} class:pointer-events-none={!dirtyLayout} on:click={resetLayout}>
            <div class="text-(--btn-content)">
              <div icon="fa6-solid:arrow-rotate-left" class="icon-[fa6-solid--arrow-rotate-left] text-[0.875rem]"></div>
            </div>
          </button>
        </div>
        <div class="seg-control" role="group" aria-label={t("display.layout", "文章布局")}>
          <button type="button" class="seg-item" class:seg-on={layout === "list"}
                  aria-pressed={layout === "list"} on:click={() => chooseLayout("list")}>
            <span class="icon-[material-symbols--view-list-outline-rounded] text-lg"></span>
            <span>{t("display.layoutList", "列表")}</span>
          </button>
          <button type="button" class="seg-item" class:seg-on={layout === "grid"}
                  aria-pressed={layout === "grid"} on:click={() => chooseLayout("grid")}>
            <span class="icon-[material-symbols--grid-view-outline-rounded] text-lg"></span>
            <span>{t("display.layoutGrid", "网格")}</span>
          </button>
        </div>
      {/if}

      <!-- 卡片样式 -->
      {#if showCardStyle}
        <div class="section-title mb-3">
          {t("display.cardStyle", "卡片样式")}
          <button aria-label={t("theme.resetDefault", "Reset to Default")} class="btn-regular w-7 h-7 rounded-md active:scale-90 will-change-transform"
                  class:opacity-0={!dirtyCard} class:pointer-events-none={!dirtyCard} on:click={resetCard}>
            <div class="text-(--btn-content)">
              <div icon="fa6-solid:arrow-rotate-left" class="icon-[fa6-solid--arrow-rotate-left] text-[0.875rem]"></div>
            </div>
          </button>
        </div>
        <button type="button" class="toggle-row" class:toggle-on={cardHoverLift} role="switch" aria-checked={cardHoverLift} on:click={toggleCardHoverLift}>
          <span class="icon-[material-symbols--touch-app-rounded] toggle-icon"></span>
          <span class="toggle-label">{t("display.cardHoverLift", "卡片悬浮效果")}</span>
          <span class="toggle" class:toggle-on={cardHoverLift}><span class="toggle-knob"></span></span>
        </button>
        <button type="button" class="toggle-row" class:toggle-on={navbarBlur} role="switch" aria-checked={navbarBlur} on:click={toggleNavbarBlur}>
          <span class="icon-[material-symbols--blur-on-rounded] toggle-icon"></span>
          <span class="toggle-label">{t("display.navbarBlur", "高级材质")}</span>
          <span class="toggle" class:toggle-on={navbarBlur}><span class="toggle-knob"></span></span>
        </button>
        {#if switches.cardBorder}
          <button type="button" class="toggle-row" class:toggle-on={cardBorder} role="switch" aria-checked={cardBorder} on:click={toggleCardBorder}>
            <span class="icon-[material-symbols--border-style-rounded] toggle-icon"></span>
            <span class="toggle-label">{t("display.cardBorder", "卡片边框和阴影")}</span>
            <span class="toggle" class:toggle-on={cardBorder}><span class="toggle-knob"></span></span>
          </button>
        {/if}
        {#if switches.cardFollowTheme}
          <button type="button" class="toggle-row" class:toggle-on={cardFollowTheme} role="switch" aria-checked={cardFollowTheme} on:click={toggleCardFollowTheme}>
            <span class="icon-[material-symbols--palette-outline] toggle-icon"></span>
            <span class="toggle-label">{t("display.cardFollowTheme", "卡片跟随主题色")}</span>
            <span class="toggle" class:toggle-on={cardFollowTheme}><span class="toggle-knob"></span></span>
          </button>
        {/if}
        {#if showMasonry}
          <button type="button" class="toggle-row" class:toggle-on={postListMasonry} role="switch" aria-checked={postListMasonry} on:click={toggleMasonry}>
            <span class="icon-[material-symbols--waterfall-chart-rounded] toggle-icon"></span>
            <span class="toggle-label">{t("display.masonry", "瀑布流")}</span>
            <span class="toggle" class:toggle-on={postListMasonry}><span class="toggle-knob"></span></span>
          </button>
        {/if}
      {/if}
    {/if}

    {#if activeTab === "wallpaper"}
      <!-- 壁纸模式（纯色背景/横幅/全屏/全屏透明） -->
      {#if showWallpaperMode}
        <div class="section-title mb-3">
          {t("display.wallpaperMode", "壁纸模式")}
          <button aria-label={t("theme.resetDefault", "Reset to Default")} class="btn-regular w-7 h-7 rounded-md active:scale-90 will-change-transform"
                  class:opacity-0={!dirtyWallpaperMode} class:pointer-events-none={!dirtyWallpaperMode} on:click={resetWallpaperModeBtn}>
            <div class="text-(--btn-content)">
              <div icon="fa6-solid:arrow-rotate-left" class="icon-[fa6-solid--arrow-rotate-left] text-[0.875rem]"></div>
            </div>
          </button>
        </div>
        <div class="mode-grid" role="group" aria-label={t("display.wallpaperMode", "壁纸模式")}>
          {#each modes as m}
            <button type="button" class="mode-item" class:mode-on={wallpaperMode === m.value}
                    aria-pressed={wallpaperMode === m.value} on:click={() => chooseMode(m.value)}>
              <span class="{m.icon} mode-icon"></span>
              <span>{t(m.key, m.label)}</span>
            </button>
          {/each}
        </div>
      {/if}

      <!-- 全屏布局（经典 classic / 沉浸 hero，对齐 Firefly）仅全屏模式显示 -->
      {#if wallpaperMode === "fullscreen"}
        <div class="section-title mb-3 mt-4">
          {t("display.fullscreenLayout", "全屏布局")}
        </div>
        <div class="mode-grid" role="group" aria-label={t("display.fullscreenLayout", "全屏布局")}>
          <button type="button" class="mode-item" class:mode-on={fullscreenLayout === "classic"}
                  aria-pressed={fullscreenLayout === "classic"} on:click={() => chooseFsLayout("classic")}>
            <span class="icon-[material-symbols--view-day-outline-rounded] mode-icon"></span>
            <span>{t("display.fullscreenClassic", "经典")}</span>
          </button>
          <button type="button" class="mode-item" class:mode-on={fullscreenLayout === "hero"}
                  aria-pressed={fullscreenLayout === "hero"} on:click={() => chooseFsLayout("hero")}>
            <span class="icon-[material-symbols--desktop-landscape-outline-rounded] mode-icon"></span>
            <span>{t("display.fullscreenHero", "沉浸")}</span>
          </button>
        </div>
      {/if}

      <!-- 壁纸设置（横幅/全屏：首页壁纸标题 + 波浪开关，参考 firefly 的壁纸设置分区） -->
      {#if showWallpaperSettings && (wallpaperMode === "banner" || wallpaperMode === "fullscreen")}
        <div class="section-title mb-3">
          {t("display.wallpaperSettings", "壁纸设置")}
          <button aria-label={t("theme.resetDefault", "Reset to Default")} class="btn-regular w-7 h-7 rounded-md active:scale-90 will-change-transform"
                  class:opacity-0={!dirtyWallpaperSettings} class:pointer-events-none={!dirtyWallpaperSettings} on:click={resetWallpaperSettingsBtn}>
            <div class="text-(--btn-content)">
              <div icon="fa6-solid:arrow-rotate-left" class="icon-[fa6-solid--arrow-rotate-left] text-[0.875rem]"></div>
            </div>
          </button>
        </div>
        {#if defaultBannerTitle}
          <button type="button" class="toggle-row" class:toggle-on={bannerTitle} role="switch" aria-checked={bannerTitle} on:click={toggleBannerTitle}>
            <span class="icon-[material-symbols--title-rounded] toggle-icon"></span>
            <span class="toggle-label">{t("display.bannerTitle", "首页壁纸标题")}</span>
            <span class="toggle" class:toggle-on={bannerTitle}><span class="toggle-knob"></span></span>
          </button>
        {/if}
        {#if defaultWave}
          <button type="button" class="toggle-row" class:toggle-on={wave} role="switch" aria-checked={wave} on:click={toggleWave}>
            <span class="icon-[material-symbols--water-lux-rounded] toggle-icon"></span>
            <span class="toggle-label">{t("display.wave", "波浪")}</span>
            <span class="toggle" class:toggle-on={wave}><span class="toggle-knob"></span></span>
          </button>
        {/if}
        {#if defaultGradient}
          <button type="button" class="toggle-row" class:toggle-on={gradient} role="switch" aria-checked={gradient} on:click={toggleGradient}>
            <span class="icon-[material-symbols--gradient-rounded] toggle-icon"></span>
            <span class="toggle-label">{t("display.gradient", "底部渐变")}</span>
            <span class="toggle" class:toggle-on={gradient}><span class="toggle-knob"></span></span>
          </button>
        {/if}
        <!-- 轮播开关：不依赖后台默认（carousel 默认关，用户仍需能开），
             壁纸设置区可见即显示（对齐 Firefly bannerCarouselSwitchable） -->
        <button type="button" class="toggle-row" class:toggle-on={carousel} role="switch" aria-checked={carousel} on:click={toggleCarousel}>
          <span class="icon-[material-symbols--photo-library-outline-rounded] toggle-icon"></span>
          <span class="toggle-label">{t("display.carousel", "壁纸轮播")}</span>
          <span class="toggle" class:toggle-on={carousel}><span class="toggle-knob"></span></span>
        </button>
      {/if}

      <!-- 壁纸参数（透明模式全显示；全屏沉浸 hero 仅模糊/卡片透明度，壁纸恒不透明） -->
      {#if showWallpaper}
        <div class="section-title mb-3">
          {t("display.wallpaper", "壁纸设置")}
          <button aria-label={t("theme.resetDefault", "Reset to Default")} class="btn-regular w-7 h-7 rounded-md active:scale-90 will-change-transform"
                  class:opacity-0={!dirtyWallpaper} class:pointer-events-none={!dirtyWallpaper} on:click={resetWallpaper}>
            <div class="text-(--btn-content)">
              <div icon="fa6-solid:arrow-rotate-left" class="icon-[fa6-solid--arrow-rotate-left] text-[0.875rem]"></div>
            </div>
          </button>
        </div>
        <!-- 壁纸透明度仅透明模式（hero 壁纸恒不透明，对齐 onlynn） -->
        {#if wallpaperMode === "transparent"}
        <div class="slider-row">
          <div class="slider-label">
            <span>{t("display.wallpaperOpacity", "壁纸透明度")}</span>
            <span class="value-badge">{wallpaperOpacity}%</span>
          </div>
          <input aria-label={t("display.wallpaperOpacity", "壁纸透明度")} type="range" min="30" max="100" step="5"
                 bind:value={wallpaperOpacity} on:input={applyOpacity} class="wallpaper-slider">
        </div>
        {/if}
        <!-- 背景模糊度：透明模式与全屏沉浸(hero)均生效（hero 写斜坡封顶 --hero-wallpaper-blur-max） -->
        <div class="slider-row">
          <div class="slider-label">
            <span>{t("display.wallpaperBlur", "背景模糊度")}</span>
            <span class="value-badge">{wallpaperBlur}px</span>
          </div>
          <input aria-label={t("display.wallpaperBlur", "背景模糊度")} type="range" min="0" max="20" step="1"
                 bind:value={wallpaperBlur} on:input={applyBlur} class="wallpaper-slider">
        </div>
        <div class="slider-row">
          <div class="slider-label">
            <span>{t("display.wallpaperCardAlpha", "卡片透明度")}</span>
            <span class="value-badge">{wallpaperCardAlpha}%</span>
          </div>
          <input aria-label={t("display.wallpaperCardAlpha", "卡片透明度")} type="range" min="30" max="100" step="5"
                 bind:value={wallpaperCardAlpha} on:input={applyCardAlpha} class="wallpaper-slider">
        </div>
      {/if}
    {/if}

    {#if activeTab === "effects"}
      <!-- 特效：樱花飘落开关（sakura.js 监听 sakuraToggle 启停） -->
      {#if hasEffectsContent}
        <div class="section-title mb-3">
          {t("display.effectsSettings", "特效设置")}
          <button aria-label={t("theme.resetDefault", "Reset to Default")} class="btn-regular w-7 h-7 rounded-md active:scale-90 will-change-transform"
                  class:opacity-0={!dirtySakura} class:pointer-events-none={!dirtySakura} on:click={resetSakuraBtn}>
            <div class="text-(--btn-content)">
              <div icon="fa6-solid:arrow-rotate-left" class="icon-[fa6-solid--arrow-rotate-left] text-[0.875rem]"></div>
            </div>
          </button>
        </div>
        <button type="button" class="toggle-row" class:toggle-on={sakuraEnabled} role="switch" aria-checked={sakuraEnabled} on:click={toggleSakura}>
          <span class="icon-[mdi--flower-poppy] toggle-icon"></span>
          <span class="toggle-label">{t("display.sakuraEffect", "樱花飘落")}</span>
          <span class="toggle" class:toggle-on={sakuraEnabled}><span class="toggle-knob"></span></span>
        </button>
      {/if}
    {/if}
  </div>
</div>


<style>
  /* 分区标题：沿用主题色区的装饰条样式 */
  #display-setting .section-title {
    display: flex;
    gap: 0.5rem;
    font-weight: 700;
    font-size: 1.125rem;
    line-height: 1.75rem;
    color: rgb(23 23 23);
    position: relative;
    margin-left: 0.75rem;
    margin-top: 0.75rem;
    align-items: center;
  }
  /* 每个 Tab 的第一个分区标题不带上边距，保证与顶部装饰线距离一致 */
  #display-setting .panel-sections > :first-child,
  #display-setting .panel-sections > :first-child .section-title {
    margin-top: 0;
  }
  :global(.dark) #display-setting .section-title {
    color: rgb(245 245 245);
  }
  #display-setting .section-title::before {
    content: "";
    width: 0.25rem;
    height: 1rem;
    border-radius: 0.375rem;
    background: var(--primary);
    position: absolute;
    left: -0.75rem;
    top: 50%;
    translate: 0 -50%;
  }

  /* 面板内滚动：覆盖 .float-panel 的 overflow-hidden，避免内容超出视口被裁切 */
  #display-setting {
    max-height: 80vh;
    overflow-y: auto;
  }

  /* Tab 栏（外观/壁纸）：参考状态模态框的居中标题 + 主题色短横线样式 */
  #display-setting .panel-tabs {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 1.5rem;
    margin: 0 -1rem;
    padding: 0.875rem 1rem 0.75rem;
  }
  #display-setting .panel-tab {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.375rem;
    padding: 0.25rem 0.5rem;
    font-size: 1.0625rem;
    font-weight: 700;
    /* 未选中用主题次级文字色（黑/白 + 透明度，参考页面的 text-black/50），
       比固定浅灰在磨砂面板（透出黑灰壁纸）上对比度更好 */
    color: rgb(0 0 0 / 0.55);
    transition: color 0.15s ease-in-out;
  }
  :global(.dark) #display-setting .panel-tab {
    color: rgb(255 255 255 / 0.55);
  }
  #display-setting .panel-tab:hover {
    color: rgb(23 23 23);
  }
  :global(.dark) #display-setting .panel-tab:hover {
    color: rgb(245 245 245);
  }
  #display-setting .panel-tab::after {
    content: "";
    width: 0;
    height: 0.25rem;
    border-radius: 9999px;
    background: var(--primary);
    transition: width 0.15s ease-in-out;
  }
  #display-setting .panel-tab.panel-tab-on {
    color: rgb(23 23 23);
  }
  :global(.dark) #display-setting .panel-tab.panel-tab-on {
    color: rgb(245 245 245);
  }
  #display-setting .panel-tab.panel-tab-on::after {
    width: 1.25rem;
  }

  /* 列表/网格分段控件 */
  #display-setting .seg-control {
    display: flex;
    gap: 0.5rem;
  }
  #display-setting .seg-item {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.375rem;
    height: 2.25rem;
    border-radius: 0.5rem;
    background: var(--btn-regular-bg);
    color: var(--btn-content);
    font-size: 0.875rem;
    font-weight: 500;
    transition: background 0.15s ease-in-out, color 0.15s ease-in-out,
      scale 0.15s ease-in-out;
  }
  #display-setting .seg-item:hover {
    background: var(--btn-regular-bg-hover);
  }
  #display-setting .seg-item.seg-on {
    background: var(--primary);
    color: white;
  }

  /* 壁纸模式 2×2 网格（参考 firefly：图标 + 文字，当前模式主题色高亮） */
  #display-setting .mode-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.5rem;
  }
  #display-setting .mode-item {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.375rem;
    height: 2.25rem;
    border-radius: 0.5rem;
    background: var(--btn-regular-bg);
    color: var(--btn-content);
    font-size: 0.875rem;
    font-weight: 500;
    transition: background 0.15s ease-in-out, color 0.15s ease-in-out,
      scale 0.15s ease-in-out;
  }
  #display-setting .mode-item:hover {
    background: var(--btn-regular-bg-hover);
  }
  #display-setting .mode-item.mode-on {
    background: var(--primary);
    color: white;
  }
  /* 主题常用点击内凹动效（同 active:scale-95），作用于整行按钮背景 */
  #display-setting .seg-item:active,
  #display-setting .mode-item:active,
  #display-setting .toggle-row:active {
    scale: 0.95;
  }
  #display-setting .mode-icon {
    font-size: 1.125rem;
    flex-shrink: 0;
  }

  /* 开关行（卡片式整行，参考 firefly：开启时主题色背景 tint + 图标 + 开关） */
  #display-setting .toggle-row {
    display: flex;
    width: 100%;
    align-items: center;
    gap: 0.75rem;
    padding: 0.5rem 0.75rem;
    border-radius: 0.5rem;
    background: var(--btn-regular-bg);
    color: var(--btn-content);
    font-size: 0.875rem;
    font-weight: 500;
    transition: background 0.15s ease-in-out, color 0.15s ease-in-out,
      scale 0.15s ease-in-out;
  }
  #display-setting .toggle-row:hover {
    background: var(--btn-regular-bg-hover);
  }
  #display-setting .toggle-row.toggle-on {
    background: var(--btn-regular-bg-hover);
  }
  #display-setting .toggle-row + .toggle-row {
    margin-top: 0.25rem;
  }
  #display-setting .toggle-icon {
    font-size: 1.25rem;
    flex-shrink: 0;
  }
  #display-setting .toggle-label {
    flex: 1;
    text-align: left;
  }
  #display-setting .toggle {
    width: 2.25rem;
    height: 1.25rem;
    border-radius: 9999px;
    /* 未开启轨道用比行背景更深的按钮色（参考 firefly），避免与行底色重合 */
    background: var(--btn-regular-bg-active);
    position: relative;
    flex-shrink: 0;
    transition: background 0.15s ease-in-out;
  }
  #display-setting .toggle.toggle-on {
    background: var(--primary);
  }
  #display-setting .toggle-knob {
    position: absolute;
    top: 0.125rem;
    left: 0.125rem;
    width: 1rem;
    height: 1rem;
    border-radius: 9999px;
    background: var(--btn-content);
    transition: translate 0.15s ease-in-out, background 0.15s ease-in-out;
  }
  #display-setting .toggle.toggle-on .toggle-knob {
    translate: 1rem 0;
    background: white;
  }

  /* 壁纸参数滑块行 */
  #display-setting .slider-row {
    margin-bottom: 0.5rem;
  }
  #display-setting .slider-label {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 0.875rem;
    color: rgb(64 64 64);
    margin-bottom: 0.125rem;
  }
  :global(.dark) #display-setting .slider-label {
    color: rgb(212 212 212);
  }
  #display-setting .value-badge {
    background: var(--btn-regular-bg);
    color: var(--btn-content);
    border-radius: 0.375rem;
    min-width: 2.5rem;
    height: 1.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.75rem;
    font-weight: 700;
    padding: 0 0.375rem;
  }

  /* 透明设置滑块：样式同主题色相滑块（1.5rem 高轨道 + 小圆角直角 + 白色矩形滑块），
  轨道用比开关行开启态背景再深一档的按钮色（btn-regular-bg-active） */
  #display-setting input[type="range"] {
    /* 拖动滑杆时不触发页面滚动/文本选择（X20） */
    touch-action: none;
  }
  #display-setting input[type="range"].wallpaper-slider {
    -webkit-appearance: none;
    appearance: none;
    width: 100%;
    height: 1.5rem;
    border-radius: 0.25rem;
    background: var(--btn-regular-bg-active);
    transition: background 0.15s ease-in-out;
  }
  #display-setting input[type="range"].wallpaper-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    height: 1rem;
    width: 0.5rem;
    border-radius: 0.125rem;
    background: rgba(255, 255, 255, 0.7);
    box-shadow: none;
  }
  #display-setting input[type="range"].wallpaper-slider::-webkit-slider-thumb:hover {
    background: rgba(255, 255, 255, 0.8);
  }
  #display-setting input[type="range"].wallpaper-slider::-webkit-slider-thumb:active {
    background: rgba(255, 255, 255, 0.6);
  }
  #display-setting input[type="range"].wallpaper-slider::-moz-range-thumb {
    height: 1rem;
    width: 0.5rem;
    border-radius: 0.125rem;
    border-width: 0;
    background: rgba(255, 255, 255, 0.7);
    box-shadow: none;
  }
  #display-setting input[type="range"].wallpaper-slider::-moz-range-thumb:hover {
    background: rgba(255, 255, 255, 0.8);
  }
  #display-setting input[type="range"].wallpaper-slider::-moz-range-thumb:active {
    background: rgba(255, 255, 255, 0.6);
  }
  #display-setting input[type="range"].wallpaper-slider::-ms-thumb {
    height: 1rem;
    width: 0.5rem;
    border-radius: 0.125rem;
    background: rgba(255, 255, 255, 0.7);
    box-shadow: none;
  }
  #display-setting input[type="range"].wallpaper-slider::-ms-thumb:hover {
    background: rgba(255, 255, 255, 0.8);
  }
  #display-setting input[type="range"].wallpaper-slider::-ms-thumb:active {
    background: rgba(255, 255, 255, 0.6);
  }

  #display-setting input[type="range"].display-setting-slider {
    -webkit-appearance: none;
    height: 1.5rem;
    background-image: var(--color-selection-bar);
    transition: background-image 0.15s ease-in-out;
  }

  #display-setting input[type="range"].display-setting-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    height: 1rem;
    width: 0.5rem;
    border-radius: 0.125rem;
    background: rgba(255, 255, 255, 0.7);
    box-shadow: none;
  }

  #display-setting input[type="range"].display-setting-slider::-webkit-slider-thumb:hover {
    background: rgba(255, 255, 255, 0.8);
  }

  #display-setting input[type="range"].display-setting-slider::-webkit-slider-thumb:active {
    background: rgba(255, 255, 255, 0.6);
  }

  #display-setting input[type="range"].display-setting-slider::-moz-range-thumb {
    height: 1rem;
    width: 0.5rem;
    border-radius: 0.125rem;
    border-width: 0;
    background: rgba(255, 255, 255, 0.7);
    box-shadow: none;
  }

  #display-setting input[type="range"].display-setting-slider::-moz-range-thumb:hover {
    background: rgba(255, 255, 255, 0.8);
  }

  #display-setting input[type="range"].display-setting-slider::-moz-range-thumb:active {
    background: rgba(255, 255, 255, 0.6);
  }

  #display-setting input[type="range"].display-setting-slider::-ms-thumb {
    height: 1rem;
    width: 0.5rem;
    border-radius: 0.125rem;
    background: rgba(255, 255, 255, 0.7);
    box-shadow: none;
  }

  #display-setting input[type="range"].display-setting-slider::-ms-thumb:hover {
    background: rgba(255, 255, 255, 0.8);
  }

  #display-setting input[type="range"].display-setting-slider::-ms-thumb:active {
    background: rgba(255, 255, 255, 0.6);
  }
</style>
