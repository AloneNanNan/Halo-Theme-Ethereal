// 随机访问友链
(function () {
  function init() {
    var btn = document.getElementById("random-visit-btn");
    if (!btn || btn.dataset.randomBound) return;
    btn.dataset.randomBound = "true";

    btn.addEventListener("click", function () {
      var allowedGroups = btn.getAttribute("data-random-groups") || "";
      var groupFilter = allowedGroups
        ? allowedGroups
            .split(/[\n,]/)
            .map(function (g) {
              return g.trim();
            })
            .filter(Boolean)
        : [];

      var links = [];
      document
        .querySelectorAll(".btn-card[data-link-group]")
        .forEach(function (card) {
          var groupName = card.getAttribute("data-link-group") || "";
          if (groupFilter.length > 0 && groupFilter.indexOf(groupName) === -1) {
            return;
          }
          var url = card.getAttribute("href");
          if (url) {
            links.push(url);
          }
        });

      if (links.length === 0) {
        alert("暂无可随机访问的友链");
        return;
      }

      var randomIndex = Math.floor(Math.random() * links.length);
      var randomUrl = links[randomIndex];

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
    var randomBtn = document.getElementById("random-visit-btn");
    if (randomBtn) randomBtn.dataset.randomBound = "";
    init();
  });
})();
