// 朋友圈：从文章链接提取博客主页
(function () {
  function init() {
    document.querySelectorAll(".friend-author").forEach(function (a) {
      if (a.dataset.friendBound) return;
      a.dataset.friendBound = "true";
      var postLink = a.getAttribute("data-site");
      if (!postLink) return;
      try {
        var u = new URL(postLink);
        a.href = u.origin + "/";
      } catch (e) {
        // URL 不合法，不设置 href（防止 javascript: 等危险协议）
      }
      a.target = "_blank";
      a.rel = "noopener noreferrer";
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
    document.querySelectorAll("[data-friend-bound]").forEach(function (el) {
      el.dataset.friendBound = "";
    });
    init();
  });
})();
