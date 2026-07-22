// 文章摘要打字机效果
(function () {
  var el = document.getElementById("summary-text");
  var caret = document.getElementById("summary-caret");
  if (!el) return;
  var text = el.getAttribute("data-text") || "";
  var i = 0;
  var speed = 40;
  function type() {
    if (i < text.length) {
      el.textContent += text.charAt(i);
      i++;
      setTimeout(type, speed);
    } else {
      if (caret) caret.style.display = "none";
    }
  }
  setTimeout(type, 600);
})();
