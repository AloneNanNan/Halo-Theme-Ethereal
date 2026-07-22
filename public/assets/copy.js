// 复制功能
(function () {
  function init() {
    var buttons = document.querySelectorAll(".copy-btn");
    buttons.forEach(function (btn) {
      if (btn.dataset.copyBound) return;
      btn.dataset.copyBound = "true";

      btn.addEventListener("click", function () {
        var text = btn.getAttribute("data-copy-text");
        if (!text) {
          var container = btn.closest(".flex");
          if (container) {
            var link = container.querySelector("a");
            if (link) {
              text = link.href || link.textContent;
            }
          }
        }

        if (text) {
          text = text.trim();
          var textSpan = btn.querySelector("span:last-child");
          var iconSpan = btn.querySelector(
            ".icon-\\[material-symbols--content-copy-outline-rounded\\]",
          );
          var originalText = textSpan ? textSpan.textContent : "";
          var originalClasses = iconSpan ? iconSpan.className : "";

          if (textSpan) textSpan.textContent = "已复制";
          if (iconSpan)
            iconSpan.className =
              "icon-[material-symbols--check-rounded] text-sm";
          btn.disabled = true;
          btn.classList.add("text-(--primary)");

          navigator.clipboard
            .writeText(text)
            .then(function () {
              setTimeout(function () {
                if (textSpan) textSpan.textContent = originalText;
                if (iconSpan) iconSpan.className = originalClasses;
                btn.disabled = false;
                btn.classList.remove("text-(--primary)");
              }, 2000);
            })
            .catch(function () {
              console.warn("[Copy] Clipboard write failed");
              setTimeout(function () {
                if (textSpan) textSpan.textContent = originalText;
                if (iconSpan) iconSpan.className = originalClasses;
                btn.disabled = false;
                btn.classList.remove("text-(--primary)");
              }, 2000);
            });
        }
      });
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
    document.querySelectorAll("[data-copy-bound]").forEach(function (el) {
      el.dataset.copyBound = "";
    });
    init();
  });
})();
