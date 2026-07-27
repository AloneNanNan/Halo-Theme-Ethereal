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
  document.addEventListener("swup:contentReplaced", function () {
    var timeline = document.getElementById("friends-timeline");
    if (timeline) timeline.dataset.friendsLoaded = "";
    init();
  });
})();
