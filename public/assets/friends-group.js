// 朋友圈
(function () {
  function init() {
    try {
      var timeline = document.getElementById("friends-timeline");
      if (!timeline) return;

      var rows = Array.from(timeline.querySelectorAll(".friends-timeline-row"));
      if (rows.length <= 1) return;

      // 按 日期|作者 分组
      var groups = new Map();
      rows.forEach(function (row) {
        var author = row.getAttribute("data-group-author") || "";
        var date = row.getAttribute("data-group-date") || "";
        var key = date + "|" + author;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(row);
      });

      groups.forEach(function (groupRows) {
        if (groupRows.length <= 1) return;

        var firstRow = groupRows[0];
        var firstContent = firstRow.querySelector(".friends-card .min-w-0");
        if (!firstContent) return;

        var firstCard = firstRow.querySelector(".friends-card");
        if (firstCard) firstCard.classList.add("friends-card-grouped");

        for (var i = 1; i < groupRows.length; i++) {
          var row = groupRows[i];
          var content = row.querySelector(".friends-card .min-w-0");
          if (!content) continue;

          // 从作者行中提取时间
          var authorLine = content.querySelector(".friends-item-header");
          var timeEl = authorLine ? authorLine.querySelector("time") : null;

          // 分隔线
          var sep = document.createElement("div");
          sep.className = "friends-article-separator";

          // 文章容器
          var article = document.createElement("div");
          article.className = "friends-article-item";

          // 时间
          if (timeEl) {
            var timeDiv = document.createElement("div");
            timeDiv.className = "friends-article-time";
            timeDiv.appendChild(timeEl.cloneNode(true));
            article.appendChild(timeDiv);
          }

          // 标题
          var titleEl = content.querySelector(".friends-item-title");
          if (titleEl) article.appendChild(titleEl.cloneNode(true));

          // 摘要
          var summaryEl = content.querySelector(".friends-item-summary");
          if (summaryEl) article.appendChild(summaryEl.cloneNode(true));

          // 来源链接
          var sourceEl = content.querySelector(".friends-source-link");
          if (sourceEl) article.appendChild(sourceEl.cloneNode(true));

          firstContent.appendChild(sep);
          firstContent.appendChild(article);

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
