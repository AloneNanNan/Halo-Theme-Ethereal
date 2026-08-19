// 通用筛选标签处理器：时间轴（type）/ 技能（category）共用。
// 作用域约定（由模板写入）：
//   .filter-scope[data-filter-attr]  筛选作用域，attr 为条目匹配属性名（type/category）
//   .filter-tabs-item[data-filter-value]  标签按钮，value=all 表示全部
//   [data-filter-item][data-<attr>]  条目，隐藏用 hidden 类切换
//   .filter-tabs-count  标签计数徽标（脚本填充 "(n)"）
//   .filter-no-results  筛选后空状态（脚本切换 hidden）
// Swup 换页由 SwupScriptsPlugin 重执行（DOM 已替换，无跨页残留），
// data-filter-bound 守卫仅防同一实例重复绑定。

(function () {
  function splitAll(collection: ArrayLike<Element>): Element[] {
    return Array.prototype.slice.call(collection);
  }

  function init() {
    var scopes = document.querySelectorAll(".filter-scope");
    splitAll(scopes).forEach(function (scope) {
      if (scope.getAttribute("data-filter-bound") === "true") return;
      scope.setAttribute("data-filter-bound", "true");

      var attr = scope.getAttribute("data-filter-attr") || "type";
      var tabs = scope.querySelectorAll(".filter-tabs-item");
      var items = scope.querySelectorAll("[data-filter-item]");
      var noResults = scope.querySelector(".filter-no-results");
      var tabList = splitAll(tabs);
      var itemList = splitAll(items);

      function matches(el: Element, value: string): boolean {
        return value === "all" || el.getAttribute("data-" + attr) === value;
      }

      // 填充各标签计数
      tabList.forEach(function (tab) {
        var value = tab.getAttribute("data-filter-value") || "";
        var countEl = tab.querySelector(".filter-tabs-count");
        if (!countEl) return;
        var count =
          value === "all"
            ? itemList.length
            : itemList.filter(function (el) {
                return matches(el, value);
              }).length;
        countEl.textContent = "(" + count + ")";
      });

      // 绑定点击：切换 active、过滤条目、切换空状态
      tabList.forEach(function (tab) {
        tab.addEventListener("click", function () {
          tabList.forEach(function (t) {
            t.classList.remove("active");
          });
          tab.classList.add("active");
          var value = tab.getAttribute("data-filter-value") || "";
          var visible = 0;
          itemList.forEach(function (el) {
            var match = matches(el, value);
            el.classList.toggle("hidden", !match);
            if (match) visible++;
          });
          if (noResults) {
            noResults.classList.toggle("hidden", visible > 0);
          }
        });
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
