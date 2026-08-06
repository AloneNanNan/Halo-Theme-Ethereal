// 朋友圈 - 黑名单过滤
(function () {
  function init() {
    try {
      var timeline = document.getElementById("friends-timeline");
      if (!timeline) return;

      var raw = timeline.getAttribute("data-blacklist") || "";
      if (!raw.trim()) return;

      var patterns = raw
        .split("\n")
        .map(function (s) {
          return s.trim().toLowerCase();
        })
        .filter(function (s) {
          return s.length > 0;
        });

      if (patterns.length === 0) return;

      var rows = Array.from(timeline.querySelectorAll(".friends-timeline-row"));

      rows.forEach(function (row) {
        var author = (
          row.getAttribute("data-group-author") || ""
        ).toLowerCase();
        var matched = patterns.some(function (p) {
          return author.indexOf(p) >= 0;
        });
        if (matched) {
          row.remove();
        }
      });
    } catch (e) {
      // 静默失败，不阻断页面渲染
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // 换页后重新初始化由 SwupScriptsPlugin 重执行覆盖；
  // 原 swup:contentReplaced 监听删除（v3 事件名从未触发）。
})();
