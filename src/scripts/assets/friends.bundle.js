// 朋友圈脚本合并（构建产物：public/assets/friends.bundle.js，源码在 src/scripts/assets/，esbuild 编译，勿手改产物）
// 由 friend-authors / friends-blacklist / friends-group / friends-load-more 合并，
// 各 IIFE 守卫独立保留；空列表页由 friends.astro th:if 整体不加载

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
  // 换页后重新初始化：每次进入朋友圈页面时 SwupScriptsPlugin 重执行覆盖；
  // 原 swup:contentReplaced 监听删除（v3 事件名从未触发）。
})();

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

// 朋友圈 - 分批加载（"加载更多"按钮）
(function () {
  function init() {
    try {
      var timeline = document.getElementById("friends-timeline");
      var btn = document.getElementById("friends-load-more");
      if (!timeline || !btn) return;

      var batchSize = parseInt(timeline.getAttribute("data-batch-size")) || 30;

      // 先取消隐藏（分组脚本可能已隐藏/删除了部分行）
      var allRows = Array.from(
        timeline.querySelectorAll(".friends-timeline-row"),
      );

      // 移除之前可能绑定的 data 状态
      var current = parseInt(timeline.dataset.friendsLoaded) || batchSize;
      if (current > allRows.length) current = allRows.length;

      // 首次加载用 batchSize
      if (!timeline.dataset.friendsLoaded) {
        current = Math.min(batchSize, allRows.length);
      }

      updateDisplay(timeline, allRows, current);

      btn.addEventListener("click", function () {
        current += batchSize;
        if (current > allRows.length) current = allRows.length;
        updateDisplay(timeline, allRows, current);
      });
    } catch (e) {
      // 静默失败，不阻断页面渲染
    }
  }

  function updateDisplay(timeline, rows, current) {
    var btn = document.getElementById("friends-load-more");
    rows.forEach(function (row, i) {
      row.style.display = i < current ? "" : "none";
    });
    timeline.dataset.friendsLoaded = current;
    if (btn) {
      btn.style.display = current < rows.length ? "flex" : "none";
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // Swup 页面切换后重新初始化
  // 换页后重新初始化由 SwupScriptsPlugin 重执行覆盖；
  // 原 swup:contentReplaced 监听删除（v3 事件名从未触发）。
})();
