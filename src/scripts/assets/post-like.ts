// 构建产物：public/assets/post-like.js（源码在 src/scripts/assets/，esbuild 编译，勿手改产物）
import { getThemeConfig } from "./_theme-config";

// 文章点赞按钮（Halo API 服务端存储）
(function () {
  var btn = document.getElementById("post-like-btn");
  if (!btn) return;

  // 点赞功能关闭：仅展示空心图标，不显示已赞红心与数字、不可交互
  var cfg = getThemeConfig();
  var disabled = !!(
    cfg &&
    cfg.post &&
    cfg.post.actionBar &&
    cfg.post.actionBar.like === false
  );

  if (disabled) {
    var cntEl = document.getElementById("post-like-count");
    if (cntEl) cntEl.style.display = "none";
    return;
  }

  // 守卫后的窄化副本：闭包内 var btn 可能被重赋值，TS 无法保持窄化
  const likeBtn = btn;
  var postName = likeBtn.getAttribute("data-post");
  var svCount = parseInt(likeBtn.getAttribute("data-count") || "0", 10);
  var key = "ethereal-like-" + postName;
  var liked = localStorage.getItem(key) === "1";
  var countEl = document.getElementById("post-like-count");
  var count = Math.max(
    svCount,
    parseInt(localStorage.getItem(key + "-count") || "0", 10) || 0,
  );

  if (liked) likeBtn.classList.add("liked");
  if (countEl) {
    countEl.textContent = count > 0 ? String(count) : "";
    // 新访客也能直接看到已有点赞数（不依赖是否点过赞）
    if (count > 0) countEl.style.display = "flex";
  }

  // 点赞成功冷却 5s（失败可立即重试）：防脚本循环点击刷请求
  var cooldownUntil = 0;

  likeBtn.addEventListener("click", function () {
    if (likeBtn.classList.contains("liked")) return;
    if (Date.now() < cooldownUntil) return;
    // 乐观更新：先本地标记已赞、计数 +1（失败时回滚，与 upvote.js 瞬间版行为对齐）
    likeBtn.classList.add("liked");
    localStorage.setItem(key, "1");
    count++;
    localStorage.setItem(key + "-count", String(count));
    if (countEl) {
      countEl.textContent = String(count);
      countEl.style.display = "flex";
    }
    fetch("/apis/api.halo.run/v1alpha1/trackers/upvote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        group: "content.halo.run",
        plural: "posts",
        name: postName,
      }),
    })
      .then(function (res) {
        // fetch 只在网络层失败时 reject，非 2xx 需显式检查（否则会静默失败）
        if (!res.ok) throw new Error("HTTP " + res.status);
        cooldownUntil = Date.now() + 5000;
      })
      .catch(function (e) {
        // 点赞失败：回滚乐观更新（计数 -1、撤销已赞、清除本地标记、抖动提示）
        console.warn("[Like] 点赞失败", e && e.message);
        localStorage.removeItem(key);
        localStorage.removeItem(key + "-count");
        likeBtn.classList.remove("liked");
        count = Math.max(svCount, count - 1);
        if (countEl) {
          countEl.textContent = count > 0 ? String(count) : "";
          if (count <= 0) countEl.style.display = "none";
        }
        likeBtn.classList.add("upvote-failed");
        setTimeout(function () {
          likeBtn.classList.remove("upvote-failed");
        }, 1200);
      });
  });
})();
