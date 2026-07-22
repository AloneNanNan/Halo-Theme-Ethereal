// 文章协议区 URL 同步（支持 Swup 页面切换）
(function () {
  window.__etherealSyncCurrentPostUrl = function () {
    var currentUrl = window.location.href;
    try {
      currentUrl = decodeURIComponent(currentUrl);
    } catch (e) {}
    document
      .querySelectorAll("[data-current-post-url]")
      .forEach(function (link) {
        link.setAttribute("href", currentUrl);
        link.textContent = currentUrl;
      });
  };

  window.__etherealSyncCurrentPostUrl();
  if (!window.__etherealSyncCurrentPostUrlBound) {
    window.__etherealSyncCurrentPostUrlBound = true;
    document.addEventListener("astro:page-load", function () {
      window.__etherealSyncCurrentPostUrl &&
        window.__etherealSyncCurrentPostUrl();
    });
    document.addEventListener("swup:contentReplaced", function () {
      window.__etherealSyncCurrentPostUrl &&
        window.__etherealSyncCurrentPostUrl();
    });
  }
})();
