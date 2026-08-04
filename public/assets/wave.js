// 波浪 viewBox 动画
(function () {
  // 三选开关（settings.yaml styleSwitches.banner_wave）：
  // disabled / 旧版布尔 false → 不启动动画；desktop_only + 触屏设备 → 隐藏容器并跳过动画。
  // wave.js 是 public/ 静态资产读不到 theme.config，从 Layout.astro 注入的 #theme-config JSON 解析。
  var waveValue = null;
  var waveConfigEl = document.getElementById("theme-config");
  if (waveConfigEl) {
    try {
      var waveConfig = JSON.parse(
        waveConfigEl.textContent || waveConfigEl.innerText,
      );
      var waveSw =
        waveConfig && waveConfig.style && waveConfig.style.styleSwitches;
      if (waveSw) waveValue = waveSw.banner_wave;
    } catch (e) {}
  }
  // 关闭（含旧版布尔 false）：不启动动画
  if (waveValue === false || waveValue === "disabled") return;
  // 移动端关闭：触屏设备（pointer: coarse，与 navbar.js 判定一致）隐藏波浪容器并跳过动画
  if (
    waveValue === "desktop_only" &&
    window.matchMedia("(pointer: coarse)").matches
  ) {
    var waveBox = document.getElementById("wave-container");
    if (waveBox) waveBox.style.display = "none";
    return;
  }

  if (!document.getElementById("wave-svg-1")) return;

  var speeds = [18, 12, 8];
  var running = true;

  function setWaveViewBox() {
    var t = performance.now() / 1000;
    for (var i = 1; i <= 3; i++) {
      var svg = document.getElementById("wave-svg-" + i);
      if (!svg) continue;
      svg.setAttribute(
        "viewBox",
        ((t / speeds[i - 1]) % 1) * 2880 + " 0 1440 200",
      );
    }
  }

  function step() {
    setWaveViewBox();
    if (running) requestAnimationFrame(step);
  }

  function resume() {
    if (running) return;
    running = true;
    requestAnimationFrame(step);
  }

  // 页面不可见时暂停
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) {
      running = false;
    } else {
      resume();
    }
  });

  // 波浪不在视口内时暂停
  if ("IntersectionObserver" in window) {
    var waveContainer = document.getElementById("wave-svg-1").closest("div");
    if (waveContainer) {
      var observer = new IntersectionObserver(
        function (entries) {
          if (entries[0].isIntersecting) {
            resume();
          } else {
            running = false;
          }
        },
        { rootMargin: "100px" },
      );
      observer.observe(waveContainer);
    }
  }

  requestAnimationFrame(step);
  document.addEventListener("swup:contentReplaced", setWaveViewBox);
})();
