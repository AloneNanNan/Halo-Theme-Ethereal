// 折叠面板交互（平滑展开/收起动画）
(function () {
  function init() {
    document.querySelectorAll(".collapse-content").forEach(function (c) {
      if (c.dataset.transitionBound) return;
      c.dataset.transitionBound = "true";
      c.style.transition = "max-height 0.35s ease";
      c.addEventListener("transitionend", function (e) {
        if (e.propertyName === "max-height") {
          if (c.classList.contains("open")) {
            c.style.overflow = "visible";
            c.style.maxHeight = "";
          }
        }
      });
    });

    var headers = document.querySelectorAll("[data-collapse-target]");
    headers.forEach(function (header) {
      if (header.dataset.collapseBound) return;
      header.dataset.collapseBound = "true";

      header.addEventListener("click", function () {
        var targetId = header.getAttribute("data-collapse-target");
        var content = document.getElementById(targetId);
        var icon = header.querySelector(".collapse-icon");
        if (!content) return;

        var isOpen = content.classList.contains("open");

        document
          .querySelectorAll(".collapse-content.open")
          .forEach(function (c) {
            if (c !== content) {
              closePanel(c);
              var otherIcon = (
                c.parentElement || c.closest(".collapse-item")
              ).querySelector(".collapse-icon");
              if (otherIcon) otherIcon.classList.remove("is-expanded");
            }
          });

        if (!isOpen) {
          openPanel(content, icon);
        } else {
          closePanel(content, icon);
        }
      });
    });

    document.querySelectorAll(".collapse-content.open").forEach(function (c) {
      c.style.maxHeight = c.scrollHeight + "px";
      c.style.overflow = "visible";
    });
    document
      .querySelectorAll(".collapse-content:not(.open)")
      .forEach(function (c) {
        c.style.maxHeight = "0px";
        c.style.overflow = "hidden";
      });
  }

  function openPanel(content, icon) {
    content.style.overflow = "hidden";
    content.classList.add("open");
    content.style.maxHeight = content.scrollHeight + "px";
    if (icon) icon.classList.add("is-expanded");
  }

  function closePanel(content, icon) {
    var currentHeight = content.scrollHeight;
    content.style.overflow = "hidden";
    if (currentHeight <= 0) {
      content.style.maxHeight = "0px";
      content.classList.remove("open");
      if (icon) icon.classList.remove("is-expanded");
      return;
    }
    content.style.maxHeight = currentHeight + "px";
    content.offsetHeight;
    content.style.maxHeight = "0px";
    content.classList.remove("open");
    if (icon) icon.classList.remove("is-expanded");
  }

  // 初始化
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // Swup 页面切换后重新初始化
  document.addEventListener("swup:contentReplaced", function () {
    document.querySelectorAll("[data-collapse-bound]").forEach(function (el) {
      el.dataset.collapseBound = "";
    });
    init();
  });
})();
