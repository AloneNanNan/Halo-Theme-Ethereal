// 文章分享图生成器 v4 - 修复对齐 + 无封面原版头部
(function () {
  "use strict";

  // ==================== DOM 数据采集 ====================

  function getCurrentUrl() {
    var link = document.querySelector("[data-current-post-url]");
    return link ? link.getAttribute("href") : window.location.href;
  }

  function getPageTitle() {
    var h1 = document.querySelector("#post-container h1");
    return h1 ? h1.textContent.trim() : document.title;
  }

  function getSiteTitle() {
    var el = document.querySelector("#navbar .site-title span:last-child");
    if (el) return el.textContent.trim();
    var t = document.title || "";
    var m = t.split(/\s*[-–—]\s*/);
    return m.length > 1 ? m[m.length - 1].trim() : "Ethereal";
  }

  function getPageDate() {
    var license = document.querySelector(".license-container");
    if (!license) return "";
    var divs = license.querySelectorAll(".line-clamp-2");
    return divs.length > 1 ? divs[1].textContent.trim() : "";
  }

  function getPageAuthor() {
    var license = document.querySelector(".license-container");
    if (!license) return "";
    var divs = license.querySelectorAll(".line-clamp-2");
    return divs.length > 0 ? divs[0].textContent.trim() : "";
  }

  function getPageSummary() {
    var el = document.getElementById("summary-text");
    return el ? el.getAttribute("data-text") || "" : "";
  }

  function getCoverImageUrl() {
    var img = document.querySelector("#post-cover img");
    return img ? img.getAttribute("src") || "" : "";
  }

  function getAuthorAvatarUrl() {
    var img = document.querySelector(
      '#sidebar .card-base a[aria-label="Profile"] img',
    );
    if (img) return img.getAttribute("src") || "";
    return "";
  }

  function getThemeColor() {
    // 方案1：从页面真实元素读取（元素 color 已经是浏览器渲染好的 sRGB）
    var el = document.querySelector(
      '.site-title, #post-share-btn, .btn-plain, .btn-card, .license-container a, #navbar a[aria-label="Home"]',
    );
    if (el) {
      var color = getComputedStyle(el).color;
      if (color && /^rgba?\(/.test(color)) return color;
    }
    // 方案2：从 --hue 用 Canvas 做 oklch → sRGB 精确转换
    try {
      var hue = "250";
      var s = document.documentElement.style.getPropertyValue("--hue");
      if (s) hue = s;
      else if (document.documentElement.dataset.hue)
        hue = document.documentElement.dataset.hue;
      var c = document.createElement("canvas");
      c.width = 1;
      c.height = 1;
      var ctx = c.getContext("2d");
      ctx.fillStyle = "oklch(0.7 0.14 " + hue + ")";
      ctx.fillRect(0, 0, 1, 1);
      var d = ctx.getImageData(0, 0, 1, 1).data;
      if (d[3] > 0) return "rgb(" + d[0] + "," + d[1] + "," + d[2] + ")";
    } catch (e) {}
    return "rgb(59, 130, 246)";
  }

  function parseRGB(str) {
    if (!str) return { r: 59, g: 130, b: 246 };
    // 标准 rgb/rgba
    var m = str.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (m) return { r: +m[1], g: +m[2], b: +m[3] };
    // oklch → 提取色相映射到简单颜色（近似）
    var o = str.match(/oklch\([\d.]+\)/);
    // 直接失败用默认紫
    return { r: 59, g: 130, b: 246 };
  }

  // ==================== Canvas 工具 ====================

  function wrapText(ctx, text, maxWidth) {
    if (!text) return [];
    var lines = [],
      line = "";
    for (var i = 0; i < text.length; i++) {
      var ch = text.charAt(i);
      if (ch === "\n") {
        lines.push(line);
        line = "";
        continue;
      }
      if (ctx.measureText(line + ch).width > maxWidth && line.length > 0) {
        lines.push(line);
        line = ch;
      } else {
        line += ch;
      }
    }
    if (line) lines.push(line);
    return lines;
  }

  function roundedRect(ctx, x, y, w, h, r) {
    var radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  function darkenColor(rgb, amount) {
    return {
      r: Math.max(0, rgb.r - amount),
      g: Math.max(0, rgb.g - amount),
      b: Math.max(0, rgb.b - amount),
    };
  }

  function loadImageAsync(src, cb) {
    if (!src) {
      cb(null);
      return;
    }
    var img = new Image();
    img.crossOrigin = "anonymous";
    var done = false;
    var timer = setTimeout(function () {
      if (!done) {
        done = true;
        cb(null);
      }
    }, 6000);
    img.onload = function () {
      if (!done) {
        done = true;
        clearTimeout(timer);
        cb(img);
      }
    };
    img.onerror = function () {
      if (!done) {
        done = true;
        clearTimeout(timer);
        cb(null);
      }
    };
    img.src = src;
  }

  // ==================== 按钮状态 ====================

  function setButtonBusy(btn) {
    if (!btn) return;
    btn.disabled = true;
    btn.style.opacity = "0.7";
  }

  function setButtonIdle(btn) {
    if (!btn) return;
    btn.disabled = false;
    btn.style.opacity = "1";
  }

  // ==================== 模态框 ====================

  function createModal(imageDataUrl, title) {
    var existing = document.getElementById("post-share-modal");
    if (existing) existing.remove();

    // 遮罩层（参考外链模态框 ext-fade-in 动画）
    var backdrop = document.createElement("div");
    backdrop.style.cssText =
      "position:fixed;inset:0;z-index:99998;background:rgba(0,0,0,0.4);backdrop-filter:blur(4px);animation:ps-fade-in 0.25s ease";
    backdrop.addEventListener("click", close);

    // 卡片（参考外链模态框 ext-slide-up 动画）
    var card = document.createElement("div");
    card.style.cssText =
      "position:fixed;z-index:99999;background:var(--card-bg,#fff);border-radius:var(--radius-large,20px);max-width:440px;width:calc(100% - 32px);box-shadow:0 20px 60px rgba(0,0,0,0.15);animation:ps-slide-up 0.3s ease;padding:0;overflow:hidden;left:50%;top:50%;transform:translate(-50%,-50%);color:var(--deep-text,#333)";

    // 图片区域
    var imgContainer = document.createElement("div");
    imgContainer.style.cssText =
      "padding:24px 24px 0 24px;border-radius:12px;overflow:hidden;display:flex;align-items:center;justify-content:center";
    var img = document.createElement("img");
    img.src = imageDataUrl;
    img.style.cssText =
      "max-width:100%;height:auto;display:block;border-radius:10px";
    img.alt = "分享图预览";
    imgContainer.appendChild(img);

    // ---- 按钮行 ----
    var btnRow = document.createElement("div");
    btnRow.style.cssText = "display:flex;gap:10px;padding:16px 24px 24px 24px";

    // 复制链接按钮（次要按钮，参考 .ext-btn-back 样式）
    var copyBtn = document.createElement("button");
    copyBtn.style.cssText =
      "flex:1;display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:12px 16px;border:none;border-radius:0.75rem;font-size:0.8125rem;font-weight:500;cursor:pointer;background:var(--btn-regular-bg,oklch(0.95 0.025 250));color:var(--btn-content,oklch(0.55 0.12 250));user-select:none;transition:background 0.2s";
    copyBtn.onmouseenter = function () {
      copyBtn.style.background =
        "var(--btn-regular-bg-hover,oklch(0.9 0.05 250))";
    };
    copyBtn.onmouseleave = function () {
      copyBtn.style.background = "var(--btn-regular-bg,oklch(0.95 0.025 250))";
    };
    // 链接图标
    copyBtn.innerHTML =
      '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg><span>复制链接</span>';

    // 保存图片按钮（主要按钮，参考 .ext-btn-go 样式）
    var saveBtn = document.createElement("button");
    saveBtn.style.cssText =
      "flex:1;display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:12px 16px;border:none;border-radius:0.75rem;font-size:0.8125rem;font-weight:500;cursor:pointer;color:#fff;background:var(--primary,oklch(0.7 0.14 250));user-select:none;transition:filter 0.2s";
    saveBtn.onmouseenter = function () {
      saveBtn.style.filter = "brightness(1.1)";
    };
    saveBtn.onmouseleave = function () {
      saveBtn.style.filter = "";
    };
    // 下载图标
    saveBtn.innerHTML =
      '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg><span>保存图片</span>';

    btnRow.appendChild(copyBtn);
    btnRow.appendChild(saveBtn);

    card.appendChild(imgContainer);
    card.appendChild(btnRow);

    // 插入 DOM
    document.body.appendChild(backdrop);
    document.body.appendChild(card);

    // ---- 动画 keyframes ----
    var style = document.getElementById("ps-keyframes");
    if (!style) {
      style = document.createElement("style");
      style.id = "ps-keyframes";
      style.textContent =
        "@keyframes ps-fade-in{from{opacity:0}to{opacity:1}}" +
        "@keyframes ps-slide-up{from{opacity:0;transform:translate(-50%,calc(-50% + 16px)) scale(0.97)}to{opacity:1;transform:translate(-50%,-50%) scale(1)}}";
      document.head.appendChild(style);
    }

    // ---- 关闭函数 ----
    function close() {
      backdrop.style.transition = "opacity 0.15s ease";
      backdrop.style.opacity = "0";
      card.style.transition = "opacity 0.15s ease, transform 0.15s ease";
      card.style.opacity = "0";
      card.style.transform = "translate(-50%,calc(-50% + 8px)) scale(0.98)";
      setTimeout(function () {
        if (backdrop.parentNode) backdrop.parentNode.removeChild(backdrop);
        if (card.parentNode) card.parentNode.removeChild(card);
      }, 150);
    }

    // ---- 事件 ----
    saveBtn.addEventListener("click", function () {
      try {
        var safeTitle =
          (title || "post")
            .replace(/[\\/:*?"<>|\s]+/g, "-")
            .slice(0, 40)
            .replace(/-+$/, "") || "post";
        var link = document.createElement("a");
        link.download = safeTitle + "-share.png";
        link.href = imageDataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (e) {
        console.error("保存失败:", e);
      }
    });

    copyBtn.addEventListener("click", function () {
      try {
        var url = getCurrentUrl();
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(url).then(function () {
            copyBtn.innerHTML =
              '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg><span>已复制!</span>';
            setTimeout(function () {
              copyBtn.innerHTML =
                '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg><span>复制链接</span>';
            }, 2000);
          });
        } else {
          var ta = document.createElement("textarea");
          ta.value = url;
          ta.style.cssText = "position:fixed;opacity:0";
          document.body.appendChild(ta);
          ta.select();
          document.execCommand("copy");
          document.body.removeChild(ta);
          copyBtn.innerHTML =
            '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg><span>已复制!</span>';
          setTimeout(function () {
            copyBtn.innerHTML =
              '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg><span>复制链接</span>';
          }, 2000);
        }
      } catch (e) {
        console.error("复制失败:", e);
      }
    });

    // ESC 关闭
    var escHandler = function (e) {
      if (e.key === "Escape") {
        close();
        document.removeEventListener("keydown", escHandler);
      }
    };
    document.addEventListener("keydown", escHandler);
  }

  // ==================== 海报渲染 ====================

  var W = 800,
    H = 1000;
  var MARGIN = 32,
    RADIUS = 24;
  var PAD = 40;

  function drawPoster(ctx, data) {
    var p = data.primaryRGB;
    var col = {
      primary: "rgb(" + p.r + "," + p.g + "," + p.b + ")",
      primaryLight: "rgba(" + p.r + "," + p.g + "," + p.b + ",0.2)",
      primaryMid: "rgba(" + p.r + "," + p.g + "," + p.b + ",0.08)",
    };
    var hasCover = !!(data.coverImg && data.coverImg.naturalWidth > 0);
    var cx = MARGIN,
      cy = MARGIN,
      cw = W - MARGIN * 2,
      ch = H - MARGIN * 2;
    var ix = cx + PAD,
      iw = cw - PAD * 2;

    // 背景
    ctx.fillStyle = "#f4f5f7";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#ffffff";
    roundedRect(ctx, cx, cy, cw, ch, RADIUS);
    ctx.fill();

    // ---- 装饰性主题色圆形（交错布局，增加层次感） ----
    ctx.save();
    ctx.globalAlpha = 0.1;
    ctx.fillStyle = col.primary;
    // 右上大圆
    ctx.beginPath();
    ctx.arc(cx + cw - 30, cy - 10, 140, 0, Math.PI * 2);
    ctx.fill();
    // 左下中圆
    ctx.beginPath();
    ctx.arc(cx - 20, cy + ch + 10, 110, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.06;
    // 中间穿插小圆
    ctx.beginPath();
    ctx.arc(cx + cw - 160, cy + 300, 60, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + 140, cy + ch - 120, 40, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // ↓↓↓ 两条布局路径：有封面 / 无封面 ↓↓↓

    if (hasCover) {
      // ======== 有封面：封面图 + 标题覆在图上 ========
      drawCover(ctx, cx, cy, cw, data.coverImg);
      drawTitleOnCover(ctx, cx, cy, cw, 360, data.title);

      // 摘要（封面下方）
      var summaryY = cy + 360 + 28;
      drawSummary(ctx, data.summary, ix, iw, summaryY, col);

      // Footer
      var sumLines = data.summary ? wrapText(ctx, data.summary, iw - 24) : [];
      var contentEnd = summaryY + sumLines.length * 36 + 16;
      drawFooter(ctx, data, cx, cy, cw, ch, ix, iw, PAD, col, contentEnd);
    } else {
      // ======== 无封面：原版顶部风格 ========
      // 装饰竖条
      ctx.fillStyle = col.primary;
      roundedRect(ctx, ix, cy + 44, 4, 20, 2);
      ctx.fill();

      // 站点名（左上）
      ctx.textBaseline = "top";
      ctx.fillStyle = col.primary;
      ctx.font =
        "600 17px -apple-system,'PingFang SC','Noto Sans SC',sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(data.siteName, ix + 16, cy + 44);

      // 日期（右上）
      ctx.fillStyle = "#9ca3af";
      ctx.font =
        "400 15px -apple-system,'PingFang SC','Noto Sans SC',sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(data.date || "", cx + cw - PAD, cy + 46);

      // 分割线
      var dividerY = cy + 88;
      ctx.strokeStyle = "#e5e7eb";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(ix, dividerY);
      ctx.lineTo(cx + cw - PAD, dividerY);
      ctx.stroke();

      // 标题（左对齐大字体）
      ctx.textBaseline = "top";
      ctx.textAlign = "left";
      ctx.fillStyle = "#111827";
      ctx.font =
        "700 48px -apple-system,'PingFang SC','Noto Sans SC',sans-serif";
      var titleLines = wrapText(ctx, data.title, iw);
      if (titleLines.length > 2) {
        titleLines = titleLines.slice(0, 2);
        var last = titleLines[1];
        while (ctx.measureText(last + "...").width > iw && last.length)
          last = last.slice(0, -1);
        titleLines[1] = last + "...";
      }
      var titleY = dividerY + 36;
      for (var ti = 0; ti < titleLines.length; ti++) {
        ctx.fillText(titleLines[ti], ix, titleY + ti * 58);
      }

      // 摘要
      var summaryY2 = titleY + titleLines.length * 58 + 20;
      drawSummary(ctx, data.summary, ix, iw, summaryY2, col);

      // Footer
      var sumLines2 = data.summary ? wrapText(ctx, data.summary, iw - 24) : [];
      var contentEnd2 = summaryY2 + sumLines2.length * 36 + 16;
      drawFooter(ctx, data, cx, cy, cw, ch, ix, iw, PAD, col, contentEnd2);
    }
  }

  // ---------- 子绘制函数 ----------

  // 摘要（左竖线装饰）
  function drawSummary(ctx, summary, ix, iw, startY, col) {
    if (!summary) return;
    ctx.textBaseline = "top";
    ctx.textAlign = "left";
    ctx.font = "400 24px -apple-system,'PingFang SC','Noto Sans SC',sans-serif";
    var lines = wrapText(ctx, summary, iw - 24);
    if (lines.length === 0) return;
    var lineH = 36;
    var textH = lines.length * lineH;

    // 竖线：6px 上下外延
    ctx.fillStyle = col.primaryMid;
    roundedRect(ctx, ix, startY - 6, 4, textH + 12, 2);
    ctx.fill();

    // 正文：竖线右侧 16px
    ctx.fillStyle = "#4b5563";
    for (var si = 0; si < lines.length; si++) {
      ctx.fillText(lines[si], ix + 16, startY + si * lineH);
    }
  }

  // Footer（头像 + 昵称/日期 + QR）
  function drawFooter(ctx, data, cx, cy, cw, ch, ix, iw, PAD, col, contentEnd) {
    var dividerY = Math.max(contentEnd + 8, cy + ch - 155);

    // 分割线
    ctx.strokeStyle = "#f0f0f0";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(ix, dividerY);
    ctx.lineTo(cx + cw - PAD, dividerY);
    ctx.stroke();

    // ---- 整体行高由较高的一侧决定，左右居中 ----
    var avatarSize = 72;
    var qrSize = 110;
    var rowH = qrSize; // QR 较高，以它为准
    var rowTop = dividerY + 22;

    // ---- 右侧：二维码（基准） ----
    var qrX = cx + cw - PAD - qrSize;
    var qrY = rowTop; // QR 顶对齐行

    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.06)";
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 2;
    ctx.fillStyle = "#ffffff";
    roundedRect(ctx, qrX, qrY, qrSize, qrSize, 8);
    ctx.fill();
    ctx.restore();

    if (data.qrImg && data.qrImg.naturalWidth > 0) {
      ctx.drawImage(data.qrImg, qrX + 5, qrY + 5, qrSize - 10, qrSize - 10);
    } else {
      ctx.fillStyle = col.primaryLight;
      roundedRect(ctx, qrX + 6, qrY + 6, qrSize - 12, qrSize - 12, 6);
      ctx.fill();
      ctx.fillStyle = col.primary;
      ctx.font = "600 13px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("QR", qrX + qrSize / 2, qrY + qrSize / 2 - 6);
      ctx.font = "400 10px sans-serif";
      ctx.fillText("扫码", qrX + qrSize / 2, qrY + qrSize / 2 + 12);
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
    }
    // 二维码下方不显示网址

    // ---- 左侧：头像 + 昵称/日期（整体基于 QR 居中） ----
    // 头像在行内垂直居中（相对 QR）
    var avatarY = rowTop + (rowH - avatarSize) / 2;
    var avatarX = ix;

    if (data.avatarImg && data.avatarImg.naturalWidth > 0) {
      ctx.save();
      roundedRect(ctx, avatarX, avatarY, avatarSize, avatarSize, 10);
      ctx.clip();
      ctx.drawImage(data.avatarImg, avatarX, avatarY, avatarSize, avatarSize);
      ctx.restore();
    } else {
      ctx.fillStyle = col.primaryLight;
      roundedRect(ctx, avatarX, avatarY, avatarSize, avatarSize, 10);
      ctx.fill();
      ctx.fillStyle = col.primary;
      ctx.font =
        "bold 24px -apple-system,'PingFang SC','Noto Sans SC',sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(
        (data.author && data.author.charAt(0)) || "?",
        avatarX + avatarSize / 2,
        avatarY + avatarSize / 2,
      );
      ctx.textBaseline = "top";
      ctx.textAlign = "left";
    }

    // 昵称+日期基于头像垂直居中
    var nickFontSize = 26;
    var dateFontSize = 18;
    var textGap = 6;
    var textBlockH = nickFontSize + textGap + dateFontSize;
    var avatarCenterY = avatarY + avatarSize / 2;
    var textStartY = avatarCenterY - textBlockH / 2;

    var textX = avatarX + avatarSize + 18;
    ctx.textBaseline = "top";
    ctx.textAlign = "left";
    ctx.fillStyle = "#1f2937";
    ctx.font =
      "700 " +
      nickFontSize +
      "px -apple-system,'PingFang SC','Noto Sans SC',sans-serif";
    ctx.fillText(data.author || "", textX, textStartY);

    ctx.fillStyle = "#9ca3af";
    ctx.font =
      "400 " +
      dateFontSize +
      "px -apple-system,'PingFang SC','Noto Sans SC',sans-serif";
    ctx.fillText(data.date || "", textX, textStartY + nickFontSize + textGap);

    // ---- 水印 ----
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillStyle = "#d1d5db";
    ctx.font = "400 12px sans-serif";
    ctx.fillText("Made with " + data.siteName, W / 2, cy + ch - 16);
  }

  // 封面图（object-fit: cover）
  function drawCover(ctx, cx, cy, cw, coverImg) {
    var sw = coverImg.naturalWidth,
      sh = coverImg.naturalHeight;
    var scale = Math.max(cw / sw, 360 / sh);
    var dx = cx + (cw - sw * scale) / 2;
    var dy = cy + (360 - sh * scale) / 2;
    ctx.save();
    roundedRect(ctx, cx, cy, cw, 360, RADIUS);
    ctx.clip();
    ctx.drawImage(coverImg, dx, dy, sw * scale, sh * scale);
    ctx.restore();
  }

  // 封面上的标题（带暗色渐变，左下角）
  function drawTitleOnCover(ctx, cx, cy, cw, coverH, title) {
    var gradH = 110;
    var grad = ctx.createLinearGradient(
      cx,
      cy + coverH - gradH,
      cx,
      cy + coverH,
    );
    grad.addColorStop(0, "rgba(0,0,0,0)");
    grad.addColorStop(0.5, "rgba(0,0,0,0.4)");
    grad.addColorStop(1, "rgba(0,0,0,0.65)");
    ctx.fillStyle = grad;
    ctx.fillRect(cx, cy + coverH - gradH, cw, gradH);

    ctx.textBaseline = "bottom";
    ctx.textAlign = "left";
    ctx.fillStyle = "#ffffff";
    ctx.font = "700 44px -apple-system,'PingFang SC','Noto Sans SC',sans-serif";
    ctx.shadowColor = "rgba(0,0,0,0.4)";
    ctx.shadowBlur = 6;

    var maxW = cw - 60;
    var lines = wrapText(ctx, title, maxW);
    if (lines.length > 2) {
      lines = lines.slice(0, 2);
      var last = lines[1];
      while (ctx.measureText(last + "...").width > maxW && last.length)
        last = last.slice(0, -1);
      lines[1] = last + "...";
    }
    var lineH = 54;
    var baseY = cy + coverH - 22;
    for (var i = lines.length - 1; i >= 0; i--) {
      ctx.fillText(lines[i], cx + 30, baseY - (lines.length - 1 - i) * lineH);
    }
    ctx.shadowBlur = 0;
    ctx.shadowColor = "transparent";
  }

  // ==================== 主流程 ====================

  function generateShareImage() {
    var btn = document.getElementById("post-share-btn");
    if (!btn || btn.disabled) return;

    setButtonBusy(btn);

    try {
      var posterData = {
        url: getCurrentUrl(),
        title: getPageTitle(),
        siteName: getSiteTitle(),
        date: getPageDate(),
        author: getPageAuthor(),
        summary: getPageSummary(),
        primaryRGB: parseRGB(getThemeColor()),
        coverImg: null,
        avatarImg: null,
        qrImg: null,
      };
      var coverUrl = getCoverImageUrl();
      var avatarUrl = getAuthorAvatarUrl();

      var hasQR =
        typeof QRCode !== "undefined" && typeof QRCode.toDataURL === "function";
      var pending = 0;
      if (hasQR) pending++;
      if (coverUrl) pending++;
      if (avatarUrl) pending++;

      function render() {
        try {
          var canvas = document.createElement("canvas");
          canvas.width = W;
          canvas.height = H;
          var ctx = canvas.getContext("2d");
          drawPoster(ctx, posterData);
          createModal(canvas.toDataURL("image/png"), posterData.title);
        } catch (e) {
          console.error("share: render error:", e);
        }
        setButtonIdle(btn);
      }

      function taskDone() {
        pending--;
        if (pending <= 0) render();
      }

      if (hasQR) {
        QRCode.toDataURL(
          posterData.url,
          {
            width: 140,
            margin: 1,
            color: { dark: "#111827", light: "#ffffff" },
          },
          function (err, qrDataUrl) {
            if (err || !qrDataUrl) {
              taskDone();
              return;
            }
            loadImageAsync(qrDataUrl, function (img) {
              posterData.qrImg = img;
              taskDone();
            });
          },
        );
      }
      if (coverUrl) {
        loadImageAsync(coverUrl, function (img) {
          posterData.coverImg = img;
          taskDone();
        });
      }
      if (avatarUrl) {
        loadImageAsync(avatarUrl, function (img) {
          posterData.avatarImg = img;
          taskDone();
        });
      }

      if (pending === 0) render();
    } catch (e) {
      console.error("share: error:", e);
      setButtonIdle(btn);
    }
  }

  // ==================== 初始化 ====================

  function safeInit() {
    var btn = document.getElementById("post-share-btn");
    if (btn) {
      btn.removeEventListener("click", generateShareImage);
      btn.addEventListener("click", generateShareImage);
    } else {
      setTimeout(safeInit, 500);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", safeInit);
  } else {
    safeInit();
  }

  document.addEventListener("swup:contentReplaced", safeInit);
})();
