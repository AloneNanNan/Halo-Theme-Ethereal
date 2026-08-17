// @ts-nocheck —— legacy 手写脚本迁入源码目录（保持 ES5 原样，不做类型改造）
// Banner 移动端独立来源切换引擎
// 双容器（#banner / #banner-mobile）显隐由 CSS 媒体查询驱动（首帧即定），
// 本脚本只负责媒体生命周期：激活容器首图升级 eager、视频 preload/播放切换。
// 配置来自 #theme-config JSON（同 banner-carousel.js）；未启用移动端独立
// 来源或移动端无有效来源（空值回退）时早退，保持现状行为。
// 本脚本会被 SwupScriptsPlugin 在每次换页时克隆重执行，而 #banner 位于
// Swup 容器外跨页面持久——全局守卫只绑一次 matchMedia 监听（同 wave.js）。
(function () {
  // #theme-config JSON 解析（I27：写/读 window.__themeConfig 缓存，与
  // scripts/assets/_theme-config.ts 共享契约，避免多脚本重复 JSON.parse）
  var cfg = null;
  var cachedCfg = window.__themeConfig;
  if (cachedCfg !== undefined) {
    cfg = cachedCfg;
  } else {
    var configEl = document.getElementById("theme-config");
    if (!configEl) return;
    try {
      cfg = JSON.parse(configEl.textContent || configEl.innerText);
    } catch (e) {
      return;
    }
    window.__themeConfig = cfg;
  }
  var bannerCfg =
    cfg && cfg.style && cfg.style.bannerStyle ? cfg.style.bannerStyle : null;
  if (!bannerCfg || bannerCfg.useMobileSrc !== true) return;
  // 移动端是否有有效来源由 SSR 统一判定（src/utils/image-suffix.ts
  // bannerMobileVars() 的 mobileActive），移动容器 #banner-mobile 仅在
  // mobileActive 为 true 时渲染；此处直接以容器是否存在为准，避免 JS 侧
  // 重复实现判定逻辑造成双实现漂移（此前双实现需两处同步维护）
  var hasMobileSrc = !!document.getElementById("banner-mobile");
  if (!hasMobileSrc) return;

  var desktop = document.getElementById("banner");
  var mobile = document.getElementById("banner-mobile");
  if (!desktop || !mobile) return;

  var MOBILE_QUERY = "(max-width: 767.98px)";
  var mq = window.matchMedia(MOBILE_QUERY);

  function isMobile() {
    return mq.matches;
  }

  function activeContainer() {
    return isMobile() ? mobile : desktop;
  }

  // 激活容器首图升级 eager：SSR 为保证隐藏端不下载全部 lazy，
  // 容器激活后立即升级，避免首图显示延迟
  function upgradeFirstImg(container) {
    if (!container) return;
    var img = container.querySelector("img");
    if (!img || img.getAttribute("loading") === "eager") return;
    img.setAttribute("loading", "eager");
    img.setAttribute("fetchpriority", "high");
  }

  // 视频生命周期管理：激活端 preload=auto + 播放（autoplay 会被浏览器在
  // display:none 下忽略/延迟，这里显式驱动）；隐藏端暂停并 preload=none，
  // 确保跨断点切换后隐藏端不再拉流。用户手动暂停（banner-media.js 写入
  // dataset.etherealUserPaused）时跳过自动播放，保持用户意图。
  // 仅在无任何数据时（readyState===0）才 load()：跨断点反复切换/拖拽缩放时
  // 不得重置 currentTime、不得中止在途拉流
  function setVideoActive(video, active) {
    if (!video) return;
    if (active) {
      if (video.dataset.etherealUserPaused) return;
      if (video.preload !== "auto") {
        video.preload = "auto";
      }
      if (video.readyState === 0) {
        video.load();
      }
      var p = video.play();
      if (p && p.catch) {
        p.catch(function () {});
      }
      // 播放图标与真实状态同步（初始为暂停态，直接 play 不会触发 media.js 的
      // 图标更新；函数由 banner-media.js 挂在 video 上，保持图标类名单一来源）
      if (typeof video.__etherealSyncIcon === "function") {
        video.__etherealSyncIcon(false);
      }
    } else {
      video.pause();
      video.preload = "none";
      if (typeof video.__etherealSyncIcon === "function") {
        video.__etherealSyncIcon(true);
      }
    }
  }

  function apply() {
    var active = activeContainer();
    upgradeFirstImg(active);
    if (active === desktop) {
      setVideoActive(document.getElementById("banner-video"), true);
      setVideoActive(document.getElementById("banner-video-mobile"), false);
    } else {
      setVideoActive(document.getElementById("banner-video"), false);
      setVideoActive(document.getElementById("banner-video-mobile"), true);
    }
    // 隐藏容器图片保持 lazy，display:none 下浏览器不下载
  }

  apply();

  if (!window.__etherealBannerSrcSwitchBound) {
    window.__etherealBannerSrcSwitchBound = true;
    mq.addEventListener("change", apply);
  }
})();
