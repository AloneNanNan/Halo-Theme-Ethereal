// 文章摘要文字下坠效果：逐字从上落下，无需出场
(function () {
  var el = document.getElementById("summary-text");
  if (!el) return;

  var text = el.getAttribute("data-text") || "";
  if (!text) return;

  var dropDelay = 40; // 每字间隔 (ms)

  // 先清空，用字符 spans 替代
  el.innerHTML = "";
  var chars = text.split("");

  chars.forEach(function (ch, i) {
    var span = document.createElement("span");
    span.textContent = ch === " " ? "\u00A0" : ch;
    span.style.display = "inline-block";
    span.style.opacity = "0";
    span.style.transform = "translateY(-1.2em)";
    span.style.transition =
      "opacity 0.1s ease-out, transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)";
    el.appendChild(span);

    setTimeout(
      function () {
        span.style.opacity = "1";
        span.style.transform = "translateY(0)";
      },
      (i + 1) * dropDelay,
    );
  });
})();
