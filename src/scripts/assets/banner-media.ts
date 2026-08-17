// @ts-nocheck —— legacy 手写脚本迁入源码目录（保持 ES5 原样，不做类型改造）
// Banner 视频：右下角播放/暂停按钮 + 屏幕外暂停（wave 同构）。
// 视频始终 muted（浏览器自动播放限制），不显示浏览器原生控件，
// 仅自定义按钮控制播放/继续。
// 移动端独立来源开启时存在双视频（#banner-video / #banner-video-mobile）：
// 各自独立绑定（按钮/用户暂停态/IO/visibilitychange）。preload 与激活播放
// 由 banner-src-switch.js 驱动（隐藏端 preload=none 不拉流），本脚本通过
// video.dataset.etherealUserPaused 暴露手动暂停态供其跳过自动播放。
(function () {
  // 跨页面持久 + Swup 克隆重执行：全局守卫防重复绑定（同 wave.js）
  if (window.__etherealBannerMediaBound) return;
  window.__etherealBannerMediaBound = true;

  function initVideo(video, btn) {
    if (!video) return;
    // 按钮可空：showPauseBtn=false 时按钮被隐藏（btn 为 null），此时仅跳过
    // 按钮相关逻辑（点击/图标/aria），视频生命周期管理（自动播放兜底、
    // 屏幕外暂停恢复、加载失败隐藏）仍须保留，避免关闭按钮后视频失控
    var hasBtn = !!btn;

    // userPaused = 用户「手动暂停」标记：点击按钮后的目标状态（点暂停→true，
    // 点播放→false），屏幕外恢复时据此决定是否自动续播，保持用户手动暂停。
    // dataset 同步给 banner-src-switch.js 读取（跨脚本状态共享）。
    var userPaused = false;

    function syncUserPausedFlag() {
      if (userPaused) video.dataset.etherealUserPaused = "1";
      else delete video.dataset.etherealUserPaused;
    }

    function setPausedState(paused) {
      if (!hasBtn) return;
      var icon = btn.querySelector("span");
      if (icon) {
        icon.className = paused
          ? "icon-[material-symbols--play-arrow-rounded] text-[1.25rem]"
          : "icon-[material-symbols--pause-rounded] text-[1.25rem]";
      }
      btn.setAttribute("aria-label", paused ? "继续播放" : "暂停播放");
    }

    function playVideo() {
      var p = video.play();
      // 只在 play() 成功时切到播放图标、失败时保持/回到暂停图标，
      // 避免先同步置 false 再异步 catch 置 true 造成的图标闪动
      if (p && p.then) {
        p.then(function () {
          setPausedState(false);
        }).catch(function () {
          setPausedState(true);
        });
      } else {
        setPausedState(false);
      }
    }

    function pauseVideo() {
      if (!video.paused) {
        video.pause();
        setPausedState(true);
      }
    }

    // 供 banner-src-switch.js 在直接驱动播放/暂停时同步按钮图标（图标类名单一
    // 来源保持在本文件，避免双份 class 字符串漂移）
    if (hasBtn) {
      video.__etherealSyncIcon = function (paused) {
        setPausedState(paused);
      };

      btn.addEventListener("click", function () {
        userPaused = video.paused ? false : true;
        syncUserPausedFlag();
        if (video.paused) playVideo();
        else pauseVideo();
      });
    }

    // 自动播放兜底（muted+playsinline 下 autoplay 应生效，双保险；
    // 独立来源开启时视频无 autoplay 属性、由切换引擎驱动 load/play，
    // loadeddata 触发后此处仍会兜底续播）
    video.addEventListener("loadeddata", function () {
      if (video.paused && !userPaused) playVideo();
    });

    // 视频加载/解码失败：隐藏视频元素本身（而非整个容器），避免黑屏占位。
    // 只隐藏 video 是可自愈的——容器背景/标题遮罩仍在，跨断点切换另一端
    // 不受影响；inline display:none 会粘在容器上（优先级高于媒体查询的
    // display:block），永久空白直到刷新，故不能作用于容器
    video.addEventListener("error", function () {
      video.style.display = "none";
    });

    // 屏幕外/切页暂停，回到屏幕恢复（保持用户手动暂停状态）。
    // restore 额外校验 offsetParent：隐藏容器（display:none）在页面重新
    // 可见时也会收到 visibilitychange，不加校验会在隐藏状态下 play()，
    // 触发 preload=none 的视频开始拉流
    function suspend() {
      if (!video.paused) {
        video.pause();
      }
    }

    function restore() {
      if (video.offsetParent === null) return;
      if (!userPaused && video.paused) playVideo();
    }

    document.addEventListener("visibilitychange", function () {
      if (document.hidden) suspend();
      else restore();
    });

    if ("IntersectionObserver" in window) {
      var observer = new IntersectionObserver(
        function (entries) {
          if (entries[0].isIntersecting) restore();
          else suspend();
        },
        { rootMargin: "100px" },
      );
      observer.observe(video);
    }

    // 初始图标同步：移动端视频初始为 paused（preload=none），静态 HTML 是
    // 暂停图标，先归位为播放图标；桌面 autoplay 启动后由 loadeddata 兜底回正
    if (hasBtn && video.paused) {
      setPausedState(true);
    }
  }

  initVideo(
    document.getElementById("banner-video"),
    document.getElementById("banner-play-btn"),
  );
  initVideo(
    document.getElementById("banner-video-mobile"),
    document.getElementById("banner-play-btn-mobile"),
  );
})();
