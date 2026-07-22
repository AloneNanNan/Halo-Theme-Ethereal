// 卡片3D倾斜效果
(function () {
  // 触控设备屏蔽，因为 mousemove 无法达到 PC 端的流畅倾斜体验
  if (
    "ontouchstart" in window ||
    navigator.maxTouchPoints > 0 ||
    window.matchMedia("(pointer: coarse)").matches
  ) {
    return;
  }

  var MAX_TILT = 12;

  function init() {
    document.querySelectorAll(".card-tilt").forEach(function (card) {
      if (card.dataset.tiltBound) return;
      card.dataset.tiltBound = "true";
      card.addEventListener(
        "mousemove",
        function (e) {
          var rect = card.getBoundingClientRect();
          var x = e.clientX - rect.left;
          var y = e.clientY - rect.top;
          var rx = (y / rect.height - 0.5) * -MAX_TILT;
          var ry = (x / rect.width - 0.5) * MAX_TILT;
          card.style.transform =
            "perspective(800px) rotateX(" + rx + "deg) rotateY(" + ry + "deg)";
        },
        { passive: true },
      );
      card.addEventListener("mouseleave", function () {
        card.style.transform = "perspective(800px) rotateX(0deg) rotateY(0deg)";
      });
    });
  }

  init();

  // Swup 页面切换后重新初始化（双 RAF 确保 DOM 布局完成）
  document.addEventListener("swup:contentReplaced", function () {
    document.querySelectorAll("[data-tilt-bound]").forEach(function (el) {
      el.dataset.tiltBound = "";
    });
    requestAnimationFrame(function () {
      requestAnimationFrame(init);
    });
  });
})();
