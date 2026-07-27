// 文字下坠效果
(function () {
  function DropEffect(el, lines) {
    this.el = el;
    this.lines = lines;
    this.index = 0;
    this.delay = 40;
    this.timeoutId = null;

    if (el.parentElement) {
      el.parentElement.style.animation = "none";
      el.parentElement.style.opacity = "1";
      el.parentElement.style.transform = "none";
    }

    this.start();
  }

  DropEffect.prototype.destroy = function () {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    // 恢复占位符维持行高，避免布局抖动
    this.el.innerHTML = "&nbsp;";
  };

  DropEffect.prototype.doDrop = function (text) {
    var self = this;
    self.el.innerHTML = "";
    text.split("").forEach(function (ch, i) {
      var span = document.createElement("span");
      span.textContent = ch === " " ? "\u00A0" : ch;
      span.style.display = "inline-block";
      span.style.opacity = "0";
      span.style.transform = "translateY(-1.2em)";
      span.style.transition = "opacity 0.1s ease-out, transform 0.35s ease-out";
      self.el.appendChild(span);
      setTimeout(
        function () {
          span.style.opacity = "1";
          span.style.transform = "translateY(0)";
        },
        (i + 1) * self.delay,
      );
    });
  };

  DropEffect.prototype.dropOut = function (cb) {
    var self = this;
    var spans = Array.from(self.el.children);
    if (spans.length === 0) {
      if (cb) cb.call(self);
      return;
    }
    spans.forEach(function (s) {
      s.style.transition = "opacity 0.15s ease-in, transform 0.2s ease-in";
      s.style.opacity = "0";
      s.style.transform = "translateY(0.8em)";
    });
    self.timeoutId = setTimeout(function () {
      if (cb) cb.call(self);
    }, 250);
  };

  DropEffect.prototype.showNext = function () {
    var self = this;
    var text = self.lines[self.index];
    var old = Array.from(self.el.children);
    function next() {
      self.index = (self.index + 1) % self.lines.length;
      self.showNext();
    }
    if (old.length > 0) {
      self.dropOut(function () {
        self.doDrop(text);
        self.timeoutId = setTimeout(next, text.length * self.delay + 2500);
      });
    } else {
      self.doDrop(text);
      self.timeoutId = setTimeout(next, text.length * self.delay + 2500);
    }
  };

  DropEffect.prototype.start = function () {
    var self = this;
    self.timeoutId = setTimeout(function () {
      self.showNext();
    }, 600);
  };

  function initDrop() {
    var el = document.getElementById("banner-subtitle");
    if (!el) return;

    // 只有 overlay 可见时才初始化
    var overlay = el.closest("#banner-overlay");
    if (overlay && overlay.classList.contains("banner-text-hidden")) return;

    // 销毁旧实例（destroy 内已恢复 &nbsp; 占位，维持行高）
    if (el.__dropInstance) {
      el.__dropInstance.destroy();
      delete el.__dropInstance;
    }

    // 读取数据
    var dc = document.getElementById("banner-subtitles-data");
    if (!dc) return;
    var raw = dc.textContent.trim();
    if (!raw) return;
    var lines = raw
      .split("\n")
      .map(function (l) {
        return l.trim();
      })
      .filter(Boolean);
    if (lines.length === 0) return;

    el.__dropInstance = new DropEffect(el, lines);
  }

  // Firefly 的 runInitWithDelay
  function runInitDrop() {
    initDrop();
    setTimeout(initDrop, 220);
  }

  runInitDrop();
  document.addEventListener("swup:contentReplaced", runInitDrop);
  document.addEventListener("banner:visible", runInitDrop);
})();
