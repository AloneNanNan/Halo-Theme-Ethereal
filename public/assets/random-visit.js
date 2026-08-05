// 随机访问友链 - 从页面已渲染的友链卡片中随机选择
// 事件委托，不受 Swup 无刷新切换影响
// 点击后图标匀速旋转 1.5 秒再执行随机跳转，增加趣味性
(function () {
  var SPIN_DELAY = 1500; // 旋转等待时长（ms）
  var spinning = false; // 防止重复点击

  // 通过临时 <a> 元素点击，让外链跳转模态框拦截
  function openViaAnchor(url) {
    var a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  // 停止旋转，恢复按钮
  function stopSpin(btn) {
    spinning = false;
    btn.classList.remove("spinning");
    var label = btn.querySelector(".random-visit-label");
    if (label) label.textContent = "随机访问";
  }

  // 旋转动画：匀速慢转（1s/圈，由 CSS 默认值控制），到时执行跳转
  function startSpin(btn, callback) {
    btn.classList.add("spinning");
    var label = btn.querySelector(".random-visit-label");
    if (label) label.textContent = "抽取中...";
    setTimeout(callback, SPIN_DELAY);
  }

  // 从页面已渲染的友链卡片中收集链接。
  // 友链 <a> 带 data-link-group（分组显示名），与后台「随机访问分组」填写的名称一致，
  // 避免 REST API group 参数（匹配 metadata.name）与显示名不匹配的问题。
  function collectUrls(btn) {
    var allowed = (btn.getAttribute("data-random-groups") || "").trim();
    var groups = null;
    if (allowed) {
      groups = allowed
        .split(/[\n,]/)
        .map(function (g) {
          return g.trim();
        })
        .filter(Boolean);
    }

    var urls = [];
    var anchors = document.querySelectorAll("a[data-link-group]");
    for (var i = 0; i < anchors.length; i++) {
      var a = anchors[i];
      if (!a.href) continue;
      if (groups && groups.indexOf(a.getAttribute("data-link-group")) === -1) {
        continue;
      }
      // 只收集 http/https 链接（a.href property 已解析为绝对 URL），
      // javascript: 等危险 scheme 不进随机访问池
      if (!/^https?:\/\//i.test(a.href)) continue;
      urls.push(a.href);
    }
    return urls;
  }

  // 执行随机访问
  function doRandomVisit(btn) {
    var urls = collectUrls(btn);
    if (urls.length === 0) {
      alert("暂无可随机访问的友链");
      stopSpin(btn);
      return;
    }
    openViaAnchor(urls[Math.floor(Math.random() * urls.length)]);
    stopSpin(btn);
  }

  document.addEventListener("click", function (e) {
    var btn = e.target.closest("#random-visit-btn");
    if (!btn || spinning) return;

    spinning = true;
    startSpin(btn, function () {
      doRandomVisit(btn);
    });
  });
})();
