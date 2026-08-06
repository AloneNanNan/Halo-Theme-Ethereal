// 渲染友链须知和免责申明列表
(function () {
  function render() {
    var lists = document.querySelectorAll(
      ".requirements-list, .disclaimer-list",
    );
    lists.forEach(function (list) {
      if (list.dataset.rendered) return;
      list.dataset.rendered = "true";
      var text = list.getAttribute("data-text");
      if (text) {
        var lines = text.split("\n");
        lines.forEach(function (line) {
          if (line.trim()) {
            var li = document.createElement("li");
            li.textContent = line.trim();
            list.appendChild(li);
          }
        });
      }
    });
  }

  // 初始化
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", render);
  } else {
    render();
  }

  // 换页后重新渲染由 SwupScriptsPlugin 重执行覆盖；
  // 原 swup:contentReplaced 监听删除（v3 事件名从未触发）。
})();
