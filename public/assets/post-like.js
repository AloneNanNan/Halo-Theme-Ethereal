// 文章点赞按钮（Halo API 服务端存储）
(function () {
  var btn = document.getElementById("post-like-btn");
  if (!btn) return;
  var postName = btn.getAttribute("data-post");
  var svCount = parseInt(btn.getAttribute("data-count") || "0", 10);
  var key = "ethereal-like-" + postName;
  var liked = localStorage.getItem(key) === "1";
  var countEl = document.getElementById("post-like-count");
  var count = Math.max(
    svCount,
    parseInt(localStorage.getItem(key + "-count") || "0", 10) || 0,
  );

  if (liked) btn.classList.add("liked");
  if (countEl) countEl.textContent = count > 0 ? count : "";

  btn.addEventListener("click", function () {
    if (btn.classList.contains("liked")) return;
    btn.classList.add("liked");
    localStorage.setItem(key, "1");
    count++;
    localStorage.setItem(key + "-count", count);
    if (countEl) countEl.textContent = count;
    fetch("/apis/api.halo.run/v1alpha1/trackers/upvote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        group: "content.halo.run",
        plural: "posts",
        name: postName,
      }),
    }).catch(function () {});
  });
})();
