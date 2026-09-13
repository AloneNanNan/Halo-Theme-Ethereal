// @ts-nocheck —— 与 timeline.js 同款：配合模板里 th:data-* 多行字段在客户端渲染。
// 用于「关于我」与「博客更新日志」两个自定义页面：模板把多行文本写进 data-lines，
// 这里按行拆分后生成 chips / paragraphs / entries / tags / stackTags / projTech。
//
// 为什么要客户端渲染：settings.yaml 里这些字段是 textarea（每行一条），
// 而 Thymeleaf 侧没有顺手的分行迭代；timeline.js 已确立同一做法。
//
// 「关于我」页的「保持联系」「页脚链接」已改为结构化设置 / 直接读侧栏社交，
// 由模板服务端渲染，不再经过本文件。
//
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

  // "名称|链接" → {label, href}；无竖线时视为纯文本
  function splitPair(line) {
    var i = line.indexOf("|");
    if (i < 0) return { label: line, href: "" };
    return {
      label: line.slice(0, i).trim(),
      href: line.slice(i + 1).trim(),
    };
  }

  // 「博客更新日志」页的标签胶囊（圆角全包），与「关于我」的 .about-chip 不同
  var CLS_TAG =
    "rounded-full border border-(--line-color) px-2.5 py-1 text-xs text-75 transition-colors hover:border-(--primary) hover:text-(--primary)";

  function render(el) {
    var kind = el.getAttribute("data-lines-render") || "chips";
    var lines = splitLines(el.getAttribute("data-lines"));
    if (lines.length === 0) {
      // 容器里可能已经有服务端渲染的静态子节点（例如「更新摘要」的版本号胶囊），
      // 这种情况只跳过追加，不能整块摘掉。
      if (!el.childNodes.length) el.remove();
      return;
    }

    var frag = document.createDocumentFragment();

    if (kind === "paragraphs") {
      // 版式由 .about-paragraphs > p 接管（max-width:72ch / .92rem / line-height:1.9）
      lines.forEach(function (line) {
        var p = document.createElement("p");
        p.textContent = line;
        frag.appendChild(p);
      });
    } else if (kind === "entries") {
      lines.forEach(function (line, i) {
        var pair = splitPair(line);
        var li = document.createElement("li");
        li.className =
          "flex items-start gap-3 rounded-lg bg-(--btn-regular-bg)/40 px-3 py-2.5";

        var num = document.createElement("span");
        num.className =
          "mt-0.5 shrink-0 font-mono text-xs font-bold text-(--primary)";
        num.textContent = ("0" + (i + 1)).slice(-2);

        var body = document.createElement("div");
        body.className = "min-w-0";

        if (pair.href && line.indexOf("|") >= 0) {
          var label = document.createElement("span");
          label.className = "mr-2 text-xs font-bold text-(--primary)";
          label.textContent = pair.label;
          body.appendChild(label);
          var txt = document.createElement("span");
          txt.className = "text-sm leading-relaxed text-75";
          txt.textContent = pair.href;
          body.appendChild(txt);
        } else {
          var only = document.createElement("span");
          only.className = "text-sm leading-relaxed text-75";
          only.textContent = pair.label;
          body.appendChild(only);
        }

        li.appendChild(num);
        li.appendChild(body);
        frag.appendChild(li);
      });
    } else if (kind === "tags") {
      // 「博客更新日志」页专用（圆角全包胶囊）
      lines.forEach(function (line) {
        var span = document.createElement("span");
        span.className = CLS_TAG;
        span.textContent = line;
        frag.appendChild(span);
      });
    } else if (kind === "stackTags") {
      // 「关于我 → 技术轨迹」= 标签胶囊（样式见 about.astro 的 .about-tag-chip）
      lines.forEach(function (line) {
        var span = document.createElement("span");
        span.className = "about-tag-chip";
        span.textContent = line;
        frag.appendChild(span);
      });
    } else if (kind === "projTech") {
      // 项目卡底部的技术标签：样式由 .about-proj__tech i 接管
      lines.forEach(function (line) {
        var i = document.createElement("i");
        i.textContent = line;
        frag.appendChild(i);
      });
    } else {
      // chips：「更新摘要」条目底部的动作标签 = 参考站 .project-card__tags em
      lines.forEach(function (line) {
        var span = document.createElement("span");
        span.className = "about-chip";
        span.textContent = line;
        frag.appendChild(span);
      });
    }

    el.appendChild(frag);
  }

  // 「我的朋友」：卡片由模板**服务端全量渲染**（本站友情链接），这里只做
  // 「每次刷新随机排序」—— Fisher–Yates 洗牌后截前 N。
  // 刻意用 DOM 移动既有节点而非重建：卡片内容（logo / 名称 / 描述）已在 HTML 里，
  // 重建等于丢掉服务端渲染成果，也白白引入一次 XSS 面。
  // 无 JS 时按服务端顺序完整展示，功能不缺失（渐进增强）。
  // Swup 换页后容器是新节点，data-shuffled 守卫保证只洗一次。
  function shuffleFriends() {
    var box = document.querySelector(
      ".about-friends[data-shuffle]:not([data-shuffled])",
    );
    if (!box) return;
    box.setAttribute("data-shuffled", "true");

    var cards = Array.prototype.slice.call(
      box.querySelectorAll(".about-friend"),
    );
    if (cards.length < 2) return;

    var n = parseInt(box.getAttribute("data-count") || "6", 10);
    if (!n || n < 0) n = 6;

    for (var i = cards.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = cards[i];
      cards[i] = cards[j];
      cards[j] = t;
    }

    var frag = document.createDocumentFragment();
    cards.slice(0, n).forEach(function (c) {
      frag.appendChild(c);
    });
    box.textContent = "";
    box.appendChild(frag);
  }

  // 「最近的提交」= 最新文章 + 最新瞬间两组由服务端直出的行，这里按 data-time
  // 归并成一条时间线。时间戳都是 ISO-8601（同为 UTC 口径），取前 19 位（精确到秒）
  // 做**字典序**比较即等价于时间序 —— 既避开 Date.parse 对「9 位小数秒」的兼容性坑，
  // 也不用先解析。无 JS 时行照样完整可见（只是按「文章在前、瞬间在后」两组排），
  // 属于渐进增强；Swup 换页由 init 重新触发（data-sorted 守卫防重复）。
  function sortTimeline() {
    var box = document.querySelector(
      "[data-activity-timeline]:not([data-sorted])",
    );
    if (!box) return;
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
  }

  function init() {
    var nodes = document.querySelectorAll("[data-lines]:not([data-rendered])");
    Array.prototype.slice.call(nodes).forEach(function (el) {
      el.setAttribute("data-rendered", "true");
      render(el);
    });
    shuffleFriends();
    sortTimeline();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // 暴露重排入口，供 Swup 换页后调用（幂等）
  window.__extendPagesRender = init;
})();
