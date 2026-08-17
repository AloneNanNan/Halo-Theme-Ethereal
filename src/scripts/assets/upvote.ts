// @ts-nocheck —— legacy 手写脚本迁入源码目录（保持 ES5 原样，不做类型改造）
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
        // 乐观更新：先本地标记已投、加高亮、禁用按钮、计数 +1（失败时回滚）
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
        })
          .then(function (res) {
            // fetch 只在网络层失败时 reject，非 2xx 需显式检查（否则会静默失败）
            if (!res.ok) throw new Error("HTTP " + res.status);
          })
          .catch(function (e) {
            // 点赞失败：回滚乐观更新（计数 -1、撤销高亮、恢复按钮可点、清除本地标记），
            // 并以短暂抖动闪烁提示用户（新增 upvote-failed 类，避免新增 i18n 键）。
            // 参考 copy.js 的失败恢复写法（还原状态后复原）。
            console.warn("[Upvote] 点赞失败", e && e.message);
            localStorage.removeItem(key);
            btn.classList.remove("text-(--primary)");
            btn.style.pointerEvents = "";
            if (countEl)
              countEl.textContent = Math.max(
                0,
                parseInt(countEl.textContent || "0", 10) - 1,
              );
            btn.classList.add("upvote-failed");
            setTimeout(function () {
              btn.classList.remove("upvote-failed");
            }, 1200);
          });
      });
    });
  }

  init();

  // Swup 页面切换后重新初始化
  // 换页后重新绑定由 SwupScriptsPlugin 重执行覆盖；
  // 原 swup:contentReplaced 监听删除（v3 事件名从未触发）。
})();
