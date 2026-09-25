// @ts-nocheck —— 与 timeline.js 同款：配合模板里 th:data-* 字段做客户端增强。
// 只服务「关于页面」两件事：
//   1. 「个人简介」正文：按 data-lines 把多行文本拆成 <p> 段落（服务端已直出纯文本
//      兜底，这里只把它换成与设计一致的段落版式）；
//   2. 「最近提交」：按 data-time 归并文章 + 瞬间两组行，并按 data-count 截断。
// 其余字段均已服务端直出，不经过本文件。
// Swup 换页由 SwupScriptsPlugin 重执行（DOM 已替换），data-rendered 守卫仅防重复。
(function () {
  function splitLines(raw) {
    if (!raw) return [];
    return String(raw)
      .split(/\r?\n/)
      .map(function (s) {
        return s.trim();
      })
      .filter(function (s) {
        return s.length > 0;
      });
  }

  function render(el) {
    // 契约：data-lines-render 目前只认 paragraphs（「个人简介」正文每行一段）。
    // 出现未知取值一律不渲染 —— 不做「静默兜底」，避免留下无人使用的分支。
    if (el.getAttribute("data-lines-render") !== "paragraphs") return;

    var lines = splitLines(el.getAttribute("data-lines"));
    // 模板已把同一份文本服务端直出为纯文本（无 JS 时靠 .about-paragraphs 的
    // white-space: pre-line 显示），这里先清空再重建，避免正文出现两遍。
    el.textContent = "";
    if (lines.length === 0) {
      el.remove();
      return;
    }

    var frag = document.createDocumentFragment();
    // 版式由 .about-paragraphs > p 接管（max-width:72ch / .92rem / line-height:1.9）
    lines.forEach(function (line) {
      var p = document.createElement("p");
      p.textContent = line;
      frag.appendChild(p);
    });
    el.appendChild(frag);
  }

  // 「最近的提交」= 最新文章 + 最新瞬间两组由服务端直出的行，这里按 data-time
  // 归并成一条时间线。时间戳都是 ISO-8601（同为 UTC 口径），取前 19 位（精确到秒）
  // 做**字典序**比较即等价于时间序 —— 既避开 Date.parse 对「9 位小数秒」的兼容性坑，
  // 也不用先解析。归并后按容器的 data-count（设置里的「显示数量」）只留最新 N 条：
  // 两组各取了 count 条作候选，所以必须排完序才知道该留哪些（服务端算不了）。
  // 无 JS 时既不归并也不截断，两组按服务端顺序完整展示，属于渐进增强；
  // Swup 换页由 init 重新触发（data-sorted 守卫防重复）。
  function sortTimeline() {
    document
      .querySelectorAll("[data-activity-timeline]:not([data-sorted])")
      .forEach(function (box) {
        box.setAttribute("data-sorted", "true");

        var rows = Array.prototype.slice.call(box.children);
        if (rows.length < 2) return;
        rows.sort(function (a, b) {
          var ka = String(a.getAttribute("data-time") || "").slice(0, 19);
          var kb = String(b.getAttribute("data-time") || "").slice(0, 19);
          if (ka === kb) return 0;
          return ka < kb ? 1 : -1;
        });
        rows.forEach(function (el) {
          box.appendChild(el);
        });

        // 合并排序后只留前 N 条：候选池是「文章 N 条 + 瞬间 N 条」，多出来的在这里删掉
        var n = parseInt(box.getAttribute("data-count") || "5", 10);
        if (!n || n < 0) n = 5;
        rows.slice(n).forEach(function (el) {
          el.remove();
        });
      });
  }

  function init() {
    var nodes = document.querySelectorAll("[data-lines]:not([data-rendered])");
    Array.prototype.slice.call(nodes).forEach(function (el) {
      el.setAttribute("data-rendered", "true");
      render(el);
    });
    sortTimeline();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
