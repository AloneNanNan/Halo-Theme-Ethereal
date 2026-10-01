// 朋友圈脚本合并（构建产物：public/assets/friends.bundle.js，源码在 src/scripts/assets/，esbuild 编译，勿手改产物）
// 由 friend-authors / friends-group / friends-load-more 合并，
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

// 朋友圈 - 同作者同日合并（后续文章并入第一张卡的内容区）
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
        var firstBody = firstRow.querySelector(
          ".friends-card .friends-card-body",
        );
        if (!firstBody) return;

        var firstCard = firstRow.querySelector(".friends-card");
        if (firstCard) firstCard.classList.add("friends-card-grouped");

        for (var i = 1; i < groupRows.length; i++) {
          var row = groupRows[i];
          var body = row.querySelector(".friends-card .friends-card-body");
          if (!body) continue;

          // 时间（头部信息列内）
          var timeEl = row.querySelector(".friends-item-time time");

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
          var titleEl = body.querySelector(".friends-item-title");
          if (titleEl) article.appendChild(titleEl.cloneNode(true));

          // 摘要
          var summaryEl = body.querySelector(".friends-item-summary");
          if (summaryEl) article.appendChild(summaryEl.cloneNode(true));

          firstBody.appendChild(sep);
          firstBody.appendChild(article);

          // 源行整组移除：row 并入后其 group 变空（无 row / 日期头），一并删除
          var srcGroup = row.closest(".friends-timeline-group");
          row.remove();
          if (srcGroup && !srcGroup.querySelector(".friends-timeline-row")) {
            srcGroup.remove();
          }
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
// 分批单位 = group（日期头 + 卡片），与合并的整组口径一致
(function () {
  function updateDisplay(timeline, groups, current) {
    var btn = document.getElementById("friends-load-more");
    var prev = parseInt(timeline.dataset.friendsLoaded) || 0;

    // 加载更多（非首屏）：新卡片立即入场——清除 SSR 首屏错峰延迟，避免
    // 「点击后空等 400ms 再整批一起出现」；首屏（prev=0）保持 SSR 的错峰演出
    if (prev > 0 && current > prev) {
      groups.forEach(function (g, i) {
        if (i < prev || i >= current) return;
        var card = g.querySelector(".friends-card");
        if (card) card.style.animationDelay = "0ms";
      });
    }

    groups.forEach(function (g, i) {
      g.style.display = i < current ? "" : "none";
    });
    timeline.dataset.friendsLoaded = current;
    if (btn) {
      btn.style.display = current < groups.length ? "flex" : "none";
    }
  }

  function setup() {
    try {
      var timeline = document.getElementById("friends-timeline");
      var btn = document.getElementById("friends-load-more");
      if (!timeline || !btn) return;

      var batchSize = parseInt(timeline.getAttribute("data-batch-size")) || 30;

      // 取「含 row 的 group」（合并后与可见卡片一一对应）
      var allGroups = Array.prototype.slice
        .call(timeline.querySelectorAll(".friends-timeline-group"))
        .filter(function (g) {
          return !!g.querySelector(".friends-timeline-row");
        });

      // 已有进度则沿用（clamp 到有效范围）；否则首屏取一个批次
      var current = parseInt(timeline.dataset.friendsLoaded) || batchSize;
      if (current > allGroups.length) current = allGroups.length;
      if (!timeline.dataset.friendsLoaded) {
        current = Math.min(batchSize, allGroups.length);
      }

      updateDisplay(timeline, allGroups, current);

      if (!btn.dataset.friendsBound) {
        btn.dataset.friendsBound = "true";
        btn.addEventListener("click", function () {
          var c = parseInt(timeline.dataset.friendsLoaded) || batchSize;
          c += batchSize;
          if (c > allGroups.length) c = allGroups.length;
          updateDisplay(timeline, allGroups, c);
        });
      }
    } catch (e) {
      // 静默失败，不阻断页面渲染
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setup);
  } else {
    setup();
  }

  // 换页后重新初始化由 SwupScriptsPlugin 重执行覆盖；
  // 原 swup:contentReplaced 监听删除（v3 事件名从未触发）。
})();
