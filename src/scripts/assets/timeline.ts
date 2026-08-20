// 时间轴条目多值字段渲染：技能标签 / 成就列表 / 相关链接。
// 数据由模板写入条目的 data-skills / data-achievements / data-links 属性
// （每行一条；links 行支持「名称|链接」格式，也可直接填链接，
// 统一在新窗口打开），由本脚本在客户端拆分渲染到对应容器
// （容器仅在字段非空时由 th:if 渲染）。
// Swup 换页由 SwupScriptsPlugin 重执行（DOM 已替换），data-rendered 守卫仅防重复。

(function () {
  function splitLines(raw: string | null | undefined): string[] {
    if (!raw) return [];
    return raw
      .split(/\r?\n/)
      .map(function (s) {
        return s.trim();
      })
      .filter(function (s) {
        return s.length > 0;
      });
  }

  function init() {
    var entries = document.querySelectorAll(".timeline-entry");
    Array.prototype.slice.call(entries).forEach(function (entry) {
      if (entry.getAttribute("data-rendered") === "true") return;
      entry.setAttribute("data-rendered", "true");

      // 技能标签
      var skillsBox = entry.querySelector(".timeline-skills");
      var skills = splitLines(skillsBox?.getAttribute("data-skills"));
      if (skillsBox && skills.length > 0) {
        skills.forEach(function (skill) {
          var tag = document.createElement("span");
          tag.className =
            "rounded-md bg-(--primary)/10 px-2 py-1 text-xs font-medium text-(--primary)";
          tag.textContent = skill;
          skillsBox.appendChild(tag);
        });
      }

      // 成就列表
      var achBox = entry.querySelector(".timeline-ach-list");
      var achs = splitLines(achBox?.getAttribute("data-achievements"));
      if (achBox && achs.length > 0) {
        var ul = document.createElement("ul");
        ul.className = "space-y-1.5";
        achs.forEach(function (ach) {
          var li = document.createElement("li");
          li.className = "flex items-start gap-2 text-sm text-75";
          var icon = document.createElement("span");
          icon.className =
            "icon-[material-symbols--workspace-premium-rounded] mt-0.5 flex-shrink-0 text-base text-(--primary)";
          var text = document.createElement("span");
          text.textContent = ach;
          li.appendChild(icon);
          li.appendChild(text);
          ul.appendChild(li);
        });
        achBox.appendChild(ul);
      }

      // 相关链接
      var linksBox = entry.querySelector(".timeline-links");
      var links = splitLines(linksBox?.getAttribute("data-links"));
      if (linksBox && links.length > 0) {
        links.forEach(function (line) {
          var sep = line.indexOf("|");
          var name: string;
          var url = "";
          if (sep >= 0) {
            name = line.slice(0, sep).trim();
            url = line.slice(sep + 1).trim();
          } else {
            // 无分隔符：整行视为链接，显示去协议/尾部斜杠的域名作为名称
            url = line.trim();
            name = url.replace(/^https?:\/\//i, "").replace(/\/+$/, "");
          }
          if (url && !/^[a-z]+:\/\//i.test(url)) {
            url = "https://" + url;
          }
          var a = document.createElement("a");
          a.className =
            "btn-regular flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium";
          var icon = document.createElement("span");
          icon.className =
            "icon-[material-symbols--open-in-new-rounded] text-xs";
          a.appendChild(icon);
          a.appendChild(document.createTextNode(name || url));
          a.href = url;
          a.target = "_blank";
          a.rel = "noopener noreferrer";
          linksBox.appendChild(a);
        });
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
