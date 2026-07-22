// 瞬间点赞
(function () {
  function init() {
    document.querySelectorAll(".moment-upvote-btn").forEach(function (btn) {
      if (btn.dataset.upvoteBound) return;
      btn.dataset.upvoteBound = "true";
      var name = btn.getAttribute("data-moment");
      var key = "ethereal-upvote-moment-" + name;
      if (localStorage.getItem(key) === "1") {
        btn.classList.add("text-(--primary)");
        btn.style.pointerEvents = "none";
      }
      btn.addEventListener("click", function () {
        if (localStorage.getItem(key) === "1") return;
        localStorage.setItem(key, "1");
        btn.classList.add("text-(--primary)");
        btn.style.pointerEvents = "none";
        var countEl = btn.querySelector(".moment-upvote-count");
        if (countEl)
          countEl.textContent = parseInt(countEl.textContent || "0", 10) + 1;
        fetch("/apis/api.halo.run/v1alpha1/trackers/upvote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            group: "moment.halo.run",
            plural: "moments",
            name: name,
          }),
        }).catch(function () {});
      });
    });
  }

  init();

  // Swup 页面切换后重新初始化
  document.addEventListener("swup:contentReplaced", function () {
    document.querySelectorAll("[data-upvote-bound]").forEach(function (el) {
      el.dataset.upvoteBound = "";
    });
    init();
  });
})();
