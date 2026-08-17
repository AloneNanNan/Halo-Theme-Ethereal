// @ts-nocheck —— legacy 手写脚本迁入源码目录（保持 ES5 原样，不做类型改造）
// Banner 多图轮播：切换动画（淡入淡出/滑动）、可点击指示点、停留定时器、
// 预加载、屏幕外暂停。配置来自 #theme-config JSON（public/ 静态资产读不到
// theme.config，同 wave.js）。切换动画时长 --dur-banner-transition 由动画档位
// /custom 档注入 <html>；停留时长独立配置 style.bannerStyle.carousel.dwellMs 直接读 JSON，
// 不随档位变化。切换动画时长交给 CSS transition。
// 移动端独立来源开启时存在双容器（#banner / #banner-mobile）：两个容器各自
// 独立初始化（slides/指示点/定时器/IO 各自一份），行为设置共用 style.bannerStyle.carousel。
// 隐藏容器（display:none）的 IntersectionObserver 报 isIntersecting=false 自然
// 暂停定时器，无需跨容器事件联动；首图 lazy 在容器被 CSS 显示后立即加载。
(function () {
  // 本脚本会被 SwupScriptsPlugin 在每次换页时克隆重执行，而 #banner 位于
  // Layout（Swup 容器外）跨页面持久——不守卫则每次换页叠加一套定时器链 +
  // IO 观察器 + 监听器（N 次换页 = N 倍开销），与 wave.js 同模式。
  if (window.__etherealBannerCarouselBound) return;
  window.__etherealBannerCarouselBound = true;

  var containers = [];
  var c1 = document.getElementById("banner");
  var c2 = document.getElementById("banner-mobile");
  if (c1) containers.push(c1);
  if (c2) containers.push(c2);

  // #theme-config JSON 解析（I27：写/读 window.__themeConfig 缓存，与
  // scripts/assets/_theme-config.ts 共享契约，避免多脚本重复 JSON.parse）
  var cfg = null;
  var cachedCfg = window.__themeConfig;
  if (cachedCfg !== undefined) {
    cfg = cachedCfg;
  } else {
    var configEl = document.getElementById("theme-config");
    if (configEl) {
      try {
        cfg = JSON.parse(configEl.textContent || configEl.innerText);
      } catch (e) {}
      window.__themeConfig = cfg;
    }
  }
  var bannerCfg =
    cfg && cfg.style && cfg.style.bannerStyle ? cfg.style.bannerStyle : null;
  var carouselCfg = bannerCfg && bannerCfg.carousel ? bannerCfg.carousel : {};
  var effect = carouselCfg.effect === "slide" ? "slide" : "fade";
  var showDots = carouselCfg.dots !== false;
  var preloadCount = parseInt(carouselCfg.preloadCount, 10);
  if (isNaN(preloadCount) || preloadCount < 0) preloadCount = 1;

  function initBannerCarousel(carousel) {
    // 单图/视频模式下 #banner 存在但无 .banner-slide，slides 为空即早退
    var slides = carousel.querySelectorAll(".banner-slide");
    if (slides.length === 0) return;

    // 同一链接在配置中出现多次（典型如随机图片 API）时，浏览器按 URL 缓存
    // 会让所有实例显示同一张图。从第二次出现的实例起给 src 追加唯一令牌
    // （_r=索引+随机串），使每个链接实例单独发起请求、互不复用；首次出现的
    // 实例保持原样，不打断首页 eager 首图加载。
    var srcSeen = {};
    for (var i = 0; i < slides.length; i++) {
      var slideEl = slides[i];
      if (srcSeen[slideEl.src]) {
        var sep = slideEl.src.indexOf("?") >= 0 ? "&" : "?";
        slideEl.src =
          slideEl.src +
          sep +
          "_r=" +
          i +
          "_" +
          Math.random().toString(36).slice(2);
      } else {
        srcSeen[slideEl.src] = true;
      }
    }

    var count = slides.length;
    var index = 0;
    var timer = null;
    var cleanupTimer = null; // 切换后的幻灯片清理定时器（快速连点时不累积）
    var visible = true;
    var dotsWrap = null;

    function readCssVar(name) {
      var v = getComputedStyle(document.documentElement)
        .getPropertyValue(name)
        .trim();
      if (!v) return null;
      var num = parseFloat(v);
      if (isNaN(num)) return null;
      // Chrome 会把自定义属性里的时长规范化为秒（5000ms → "5s"），
      // 直接 parseFloat 会得到 5（当作毫秒），导致轮播 5ms 就切换。
      // 按单位换算：以 ms 结尾按毫秒计，否则按秒换算成毫秒。
      return /ms$/.test(v) ? num : num * 1000;
    }

    function transitionMs() {
      return readCssVar("--dur-banner-transition") || 700;
    }

    // 停留时长独立配置：读取 style.bannerStyle.carousel.dwellMs 设置项（ms），
    // 不随动画速度档位变化；切换动画时长仍跟随档位（--dur-banner-transition）
    function dwellMs() {
      var d = parseInt(carouselCfg.dwellMs, 10);
      return isNaN(d) || d <= 0 ? 5000 : d;
    }

    function updateDots() {
      if (!dotsWrap) return;
      for (var i = 0; i < dotsWrap.children.length; i++) {
        var on = i === index;
        dotsWrap.children[i].classList.toggle("bg-white/80", on);
        dotsWrap.children[i].classList.toggle("bg-white/40", !on);
        dotsWrap.children[i].setAttribute(
          "aria-current",
          on ? "true" : "false",
        );
      }
    }

    function buildDots() {
      if (!showDots || count < 2) return;
      dotsWrap = document.createElement("div");
      // 双容器各自带指示点，id 需唯一（carousel 容器 id 为 banner/banner-mobile）
      dotsWrap.id =
        carousel.id === "banner-mobile"
          ? "banner-mobile-carousel-dots"
          : "banner-carousel-dots";
      dotsWrap.className =
        "pointer-events-auto absolute bottom-24 right-4 z-20 flex items-center gap-2";
      for (var i = 0; i < count; i++) {
        (function (idx) {
          var dot = document.createElement("button");
          dot.type = "button";
          dot.className =
            "h-2 w-2 rounded-full bg-white/40 transition-colors duration-[var(--dur-banner-transition,700ms)] hover:bg-white/70";
          dot.setAttribute("aria-label", "切换到第 " + (idx + 1) + " 张");
          dot.addEventListener("click", function () {
            stop();
            // 点击当前活动指示点：go(idx) 会因 i === index 提前返回，
            // 需显式重启停留定时器，否则轮播永久停转
            if (idx === index) {
              start();
            } else {
              go(idx);
            }
          });
          dotsWrap.appendChild(dot);
        })(i);
      }
      carousel.appendChild(dotsWrap);
    }

    // 等首图加载完全后再开始计时轮换：首图 eager + fetchpriority=high 也需网络
    // 时间，若定时器先行，会在首图未就绪时就切走/或首图半途加载完与计时竞争。
    // load 后照常 start；error 也放行（naturalWidth 恒为 0，不能再走 start 重挂
    // 监听），避免加载失败导致轮播永久停转。
    function firstImgReady() {
      var el = slides[0];
      return !el || (el.complete && el.naturalWidth > 0);
    }

    function start() {
      if (timer !== null || !visible || count < 2) return;
      if (index === 0 && !firstImgReady()) {
        slides[0].addEventListener("load", start, { once: true });
        slides[0].addEventListener("error", startAfterFirstImgError, {
          once: true,
        });
        return;
      }
      timer = setTimeout(next, dwellMs());
    }

    function startAfterFirstImgError() {
      if (timer !== null || !visible || count < 2) return;
      timer = setTimeout(next, dwellMs());
    }

    function stop() {
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
    }

    // 切换：fade 新图淡入盖旧图；slide 旧图左移、新图右入。
    // display:none 元素无法过渡，需先加 visible（display:block）并强制重排，
    // 再加 active（opacity:1）驱动过渡；过渡结束后清理非当前幻灯片。
    // slide 模式注意事项：新图必须一开始就完全不透明（内联 opacity/transition
    // 只保留 transform 过渡），否则滑动过程中半透明的新图会透出背景底色。
    function go(i) {
      if (i === index || count < 2) return;
      i = ((i % count) + count) % count;
      var from = slides[index];
      var to = slides[i];
      if (!from || !to) return;
      var dur = transitionMs();
      to.classList.add("visible");
      if (effect === "slide") {
        // 只过渡 transform，opacity 直接置 1：滑动模式不做透明度淡入
        to.style.transition = "transform " + dur + "ms ease";
        to.style.opacity = "1";
        to.style.transform = "translateX(100%)";
        from.style.transform = "translateX(-100%)";
      }
      void to.offsetWidth;
      if (effect === "slide") {
        to.style.transform = "translateX(0)";
      }
      to.classList.add("active");
      index = i;
      stop();
      if (cleanupTimer !== null) clearTimeout(cleanupTimer);
      cleanupTimer = setTimeout(function () {
        cleanupTimer = null;
        for (var j = 0; j < count; j++) {
          if (j !== index) {
            slides[j].classList.remove("active", "visible");
            slides[j].style.transform = "";
            slides[j].style.opacity = "";
            slides[j].style.transition = "";
          }
        }
        // 预加载窗口跟随 index 滚动：其余幻灯片为 loading=lazy +
        // display:none（浏览器不下载），不及时预加载会在轮播切到
        // 第 3+ 张时现场拉取导致空白
        preload();
        updateDots();
        start();
      }, dur + 50);
      updateDots();
    }

    function next() {
      go(index + 1);
    }

    // 预加载当前图之后的 N 张：new Image 绕过 loading=lazy 直接入缓存。
    // preloaded 去重：同一 src 只预加载一次，避免轮播切换时反复创建 Image 对象
    var preloaded = {};

    function preload() {
      if (preloadCount <= 0) return;
      for (var k = 1; k <= preloadCount; k++) {
        var s = slides[(index + k) % count];
        if (!s || preloaded[s.src]) continue;
        preloaded[s.src] = true;
        var img = new Image();
        img.src = s.src;
      }
    }

    // 屏幕外暂停定时器（wave 同构：rootMargin 100px + visibilitychange）。
    // display:none 的隐藏容器 IO 报 isIntersecting=false → 自然暂停；
    // 跨断点被 CSS 显示后 IO 报 intersecting → resume 并等待首图就绪。
    // resume 额外校验 offsetParent：隐藏容器（display:none）在页面重新
    // 可见时也会收到 visibilitychange，不加校验会在隐藏状态下启动定时器
    function resume() {
      visible = true;
      if (carousel.offsetParent !== null) start();
    }

    function pause() {
      visible = false;
      stop();
    }

    document.addEventListener("visibilitychange", function () {
      if (document.hidden) pause();
      else resume();
    });

    if ("IntersectionObserver" in window) {
      var observer = new IntersectionObserver(
        function (entries) {
          if (entries[0].isIntersecting) resume();
          else pause();
        },
        { rootMargin: "100px" },
      );
      observer.observe(carousel);
    }

    buildDots();
    updateDots();
    // 初始预加载/计时必须以容器可见为前提（offsetParent 门控，同 resume()）：
    // 隐藏容器（display:none）的 new Image 预加载会绕过 loading=lazy 直接下载，
    // 违反"隐藏端不下载"；激活后 IO 报 intersecting → resume → start，
    // 首图 eager 升级加载完成后照常启动，preload() 在 go() 轮转时补充
    if (carousel.offsetParent !== null) {
      preload();
      start();
    }
  }

  for (var ci = 0; ci < containers.length; ci++) {
    initBannerCarousel(containers[ci]);
  }
})();
