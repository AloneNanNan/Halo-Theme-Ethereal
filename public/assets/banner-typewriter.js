// 打字机效果
(function () {
  var TypewriterEffect = function (el, lines) {
    this.el = el;
    this.lines = lines;
    this.index = 0;
    this.charIdx = 0;
    this.deleting = false;
    this.timeoutId = null;
    this.typeSpeed = 80;
    this.deleteSpeed = 40;
    this.pauseAfterType = 2000;
    this.pauseAfterDelete = 500;

    var self = this;
    self.setText("");
    self.timeoutId = setTimeout(function () {
      self.type();
    }, 500);
  };

  TypewriterEffect.prototype.setText = function (text) {
    this.el.textContent = text || "\u00A0";
  };

  TypewriterEffect.prototype.type = function () {
    var self = this;
    var text = self.lines[self.index];
    if (!self.deleting) {
      self.charIdx++;
      self.setText(text.substring(0, self.charIdx));
      if (self.charIdx >= text.length) {
        if (self.lines.length > 1) {
          self.deleting = true;
          self.timeoutId = setTimeout(function () {
            self.type();
          }, self.pauseAfterType);
        }
        return;
      }
      self.timeoutId = setTimeout(function () {
        self.type();
      }, self.typeSpeed);
    } else {
      self.charIdx--;
      self.setText(text.substring(0, self.charIdx));
      if (self.charIdx <= 0) {
        self.deleting = false;
        self.index = (self.index + 1) % self.lines.length;
        self.timeoutId = setTimeout(function () {
          self.type();
        }, self.pauseAfterDelete);
        return;
      }
      self.timeoutId = setTimeout(function () {
        self.type();
      }, self.deleteSpeed);
    }
  };

  TypewriterEffect.prototype.destroy = function () {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  };

  function initTypewriter() {
    var el = document.getElementById("banner-subtitle");
    if (!el) return;

    var overlay = el.closest("#banner-overlay");
    if (overlay && overlay.classList.contains("banner-text-hidden")) return;

    if (el.__twInstance) {
      el.__twInstance.destroy();
      delete el.__twInstance;
    }
    el.textContent = "";

    var cursor = document.getElementById("banner-cursor");
    if (cursor) {
      if (cursor.__blinkInterval) {
        clearInterval(cursor.__blinkInterval);
        delete cursor.__blinkInterval;
      }
      cursor.style.opacity = "1";
      var vis = true;
      cursor.__blinkInterval = setInterval(function () {
        if (cursor) cursor.style.opacity = vis ? "1" : "0";
        vis = !vis;
      }, 530);
    }

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

    el.__twInstance = new TypewriterEffect(el, lines);
  }

  function runInitTW() {
    initTypewriter();
    setTimeout(initTypewriter, 220);
  }

  runInitTW();
  document.addEventListener("swup:contentReplaced", runInitTW);
  document.addEventListener("banner:visible", runInitTW);
})();
