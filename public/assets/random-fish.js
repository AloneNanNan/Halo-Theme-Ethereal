// 随机钓鱼 - 随机跳转朋友圈的文章链接
(function () {
  function init() {
    var btn = document.getElementById("random-fish-btn");
    if (!btn || btn.dataset.randomFishBound) return;
    btn.dataset.randomFishBound = "true";

    btn.addEventListener("click", function () {
      // 从朋友圈列表中收集所有文章链接
      var urls = [];
      document
        .querySelectorAll(".friends-item a.friend-author")
        .forEach(function (link) {
          var url = link.getAttribute("data-site");
          if (url) {
            urls.push(url);
          }
        });

      if (urls.length === 0) {
        alert("暂无朋友圈文章可随机跳转");
        return;
      }

      var randomIndex = Math.floor(Math.random() * urls.length);
      var randomUrl = urls[randomIndex];

      var a = document.createElement("a");
      a.href = randomUrl;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    });
  }

  // 初始化
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // Swup 页面切换后重新初始化
  document.addEventListener("swup:contentReplaced", function () {
    var fishBtn = document.getElementById("random-fish-btn");
    if (fishBtn) fishBtn.dataset.randomFishBound = "";
    init();
  });
})();
