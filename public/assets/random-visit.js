// 随机访问友链 - 使用 plugin-links 官方 REST API
// 事件委托，不受 Swup 无刷新切换影响
(function () {
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

  document.addEventListener("click", function (e) {
    var btn = e.target.closest("#random-visit-btn");
    if (!btn) return;

    var allowedGroups = (btn.getAttribute("data-random-groups") || "").trim();

    if (!allowedGroups) {
      // 不限分组：直接使用官方随机 API
      fetch("/apis/api.link.halo.run/v1alpha1/links/-/random?maxSize=1")
        .then(function (r) {
          if (!r.ok) throw new Error("API error");
          return r.json();
        })
        .then(function (data) {
          if (data && data[0] && data[0].spec && data[0].spec.url) {
            openViaAnchor(data[0].spec.url);
          } else {
            alert("暂无可随机访问的友链");
          }
        })
        .catch(function () {
          alert("暂无可随机访问的友链");
        });
    } else {
      // 限定了分组：分别请求各分组的链接
      var groups = allowedGroups
        .split(/[\n,]/)
        .map(function (g) {
          return g.trim();
        })
        .filter(Boolean);

      var promises = groups.map(function (g) {
        return fetch(
          "/apis/api.link.halo.run/v1alpha1/links?group=" +
            encodeURIComponent(g) +
            "&size=100",
        )
          .then(function (r) {
            return r.ok ? r.json() : { items: [] };
          })
          .catch(function () {
            return { items: [] };
          });
      });

      Promise.all(promises)
        .then(function (results) {
          var urls = [];
          results.forEach(function (res) {
            (res.items || []).forEach(function (link) {
              if (link.spec && link.spec.url) urls.push(link.spec.url);
            });
          });
          if (urls.length === 0) {
            alert("暂无可随机访问的友链");
            return;
          }
          openViaAnchor(urls[Math.floor(Math.random() * urls.length)]);
        })
        .catch(function () {
          alert("暂无可随机访问的友链");
        });
    }
  });
})();
