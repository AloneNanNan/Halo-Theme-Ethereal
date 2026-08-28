// 友链页脚本合并（构建产物：public/assets/links.bundle.js，源码在 src/scripts/assets/，esbuild 编译，勿手改产物）
// 由 requirements / collapse / copy / link-apply / random-visit 合并，各 IIFE 守卫独立保留；
// link-apply 与 random-visit 的原 th:if 门控移除，改由内部守卫（元素不存在即不绑定/不执行）

// 渲染友链须知和免责申明列表
(function () {
  function render() {
    var lists = document.querySelectorAll(
      ".requirements-list, .disclaimer-list",
    );
    lists.forEach(function (list) {
      if (list.dataset.rendered) return;
      list.dataset.rendered = "true";
      var text = list.getAttribute("data-text");
      if (text) {
        var lines = text.split("\n");
        lines.forEach(function (line) {
          if (line.trim()) {
            var li = document.createElement("li");
            li.textContent = line.trim();
            list.appendChild(li);
          }
        });
      }
    });
  }

  // 初始化
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", render);
  } else {
    render();
  }

  // 换页后重新渲染由 SwupScriptsPlugin 重执行覆盖；
  // 原 swup:contentReplaced 监听删除（v3 事件名从未触发）。
})();

// 折叠面板交互（平滑展开/收起动画）
(function () {
  function init() {
    document.querySelectorAll(".collapse-content").forEach(function (c) {
      if (c.dataset.transitionBound) return;
      c.dataset.transitionBound = "true";
      c.style.transition = "max-height 0.35s ease";
      c.addEventListener("transitionend", function (e) {
        if (e.propertyName === "max-height") {
          if (c.classList.contains("open")) {
            c.style.overflow = "visible";
            c.style.maxHeight = "";
          }
        }
      });
    });

    var headers = document.querySelectorAll("[data-collapse-target]");
    headers.forEach(function (header) {
      if (header.dataset.collapseBound) return;
      header.dataset.collapseBound = "true";

      header.addEventListener("click", function () {
        var targetId = header.getAttribute("data-collapse-target");
        var content = document.getElementById(targetId);
        var icon = header.querySelector(".collapse-icon");
        if (!content) return;

        var isOpen = content.classList.contains("open");

        document
          .querySelectorAll(".collapse-content.open")
          .forEach(function (c) {
            if (c !== content) {
              closePanel(c);
              var otherIcon = (
                c.parentElement || c.closest(".collapse-item")
              ).querySelector(".collapse-icon");
              if (otherIcon) otherIcon.classList.remove("is-expanded");
            }
          });

        if (!isOpen) {
          openPanel(content, icon);
        } else {
          closePanel(content, icon);
        }
      });
    });

    document.querySelectorAll(".collapse-content.open").forEach(function (c) {
      c.style.maxHeight = c.scrollHeight + "px";
      c.style.overflow = "visible";
    });
    document
      .querySelectorAll(".collapse-content:not(.open)")
      .forEach(function (c) {
        c.style.maxHeight = "0px";
        c.style.overflow = "hidden";
      });
  }

  function openPanel(content, icon) {
    content.style.overflow = "hidden";
    content.classList.add("open");
    content.style.maxHeight = content.scrollHeight + "px";
    if (icon) icon.classList.add("is-expanded");
  }

  function closePanel(content, icon) {
    var currentHeight = content.scrollHeight;
    content.style.overflow = "hidden";
    if (currentHeight <= 0) {
      content.style.maxHeight = "0px";
      content.classList.remove("open");
      if (icon) icon.classList.remove("is-expanded");
      return;
    }
    content.style.maxHeight = currentHeight + "px";
    content.offsetHeight;
    content.style.maxHeight = "0px";
    content.classList.remove("open");
    if (icon) icon.classList.remove("is-expanded");
  }

  // 初始化
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // Swup 页面切换后重新初始化
  // 换页后重新初始化由 SwupScriptsPlugin 重执行覆盖；
  // 原 swup:contentReplaced 监听删除（v3 事件名从未触发）。
})();

// 复制功能
(function () {
  function init() {
    var buttons = document.querySelectorAll(".copy-btn");
    buttons.forEach(function (btn) {
      if (btn.dataset.copyBound) return;
      btn.dataset.copyBound = "true";

      btn.addEventListener("click", function () {
        var text = btn.getAttribute("data-copy-text");
        if (!text) {
          var container = btn.closest(".flex");
          if (container) {
            var link = container.querySelector("a");
            if (link) {
              text = link.href || link.textContent;
            }
          }
        }

        if (text) {
          text = text.trim();
          var iconSpan = btn.querySelector(
            ".icon-\\[material-symbols--content-copy-outline-rounded\\]",
          );
          var originalClasses = iconSpan ? iconSpan.className : "";

          if (iconSpan)
            iconSpan.className =
              "icon-[material-symbols--check-rounded] text-sm";
          btn.disabled = true;
          btn.classList.add("text-(--primary)");

          function restore() {
            setTimeout(function () {
              if (iconSpan) iconSpan.className = originalClasses;
              btn.disabled = false;
              btn.classList.remove("text-(--primary)");
            }, 2000);
          }

          navigator.clipboard
            .writeText(text)
            .then(restore)
            .catch(function () {
              console.warn("[Copy] Clipboard write failed");
              restore();
            });
        }
      });
    });
  }

  // 初始化
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // Swup 页面切换后重新初始化
  // 换页后重新绑定由 SwupScriptsPlugin 重执行覆盖；
  // 原 swup:contentReplaced 监听删除（v3 事件名从未触发）。
})();

// 申请友链 - 模态框交互 + REST API 提交
// 事件委托，兼容 Swup 无刷新切换；模态框 HTML 由 links 页面渲染
(function () {
  var API_BASE = "/apis/api.link.halo.run/v1alpha1/link-applications";

  // 稳定错误类型 → 展示文案（依据 plugin-links 文档按 status + type 判断）
  var ERROR_MESSAGES = {
    "400 https://halo.run/probs/invalid-link-application":
      "请检查申请内容是否填写正确",
    "400 https://halo.run/probs/invalid-link-application-captcha":
      "验证码错误或已过期，请重新输入",
    "403 https://halo.run/probs/link-application-disabled": "友链申请暂未开放",
    "409 https://halo.run/probs/duplicate-link-application":
      "该链接已经提交过申请，请勿重复提交",
    "409 https://halo.run/probs/link-application-capacity-reached":
      "待审核申请已满，请稍后再试",
    "429 https://halo.run/probs/request-not-permitted":
      "提交过于频繁，请稍后再试",
    "503 https://halo.run/probs/link-application-unavailable":
      "服务暂时不可用，请稍后再试",
  };

  var DEFAULT_ERROR = "暂时无法提交，请稍后再试";

  // 状态挂 window 共享：本脚本会被 SwupScriptsPlugin 在换页时克隆重执行，
  // 新闭包必须操作同一份状态（监听器只在首次执行绑定一次，见文末守卫），
  // 否则多个各持独立 state 的闭包会同时响应同一事件（重复提交/重复刷新验证码）。
  var state =
    window.__linkApplyState ||
    (window.__linkApplyState = {
      challengeId: null,
      submitting: false,
      // 点击冷却：防止连点刷出并发请求触发插件限流
      captchaCooldownUntil: 0,
      // 验证码是否已加载过：仅首次打开自动加载，之后打开面板不刷新，手动点击图片才刷新
      captchaLoaded: false,
    });

  function getModal() {
    return document.getElementById("link-apply-modal");
  }

  // 将模态框挂载到 <body> 下：
  // swup-container 内 #content-wrapper 的 onload-animation 动画使用了 translate 属性，
  // translate 会创建包含块，导致 position: fixed 相对内容区而非视口定位（弹出位置错误）。
  // 挂到 body 后 fixed 恢复正常，与分享/打赏/外链模态框的处理方式一致。
  function mountModalToBody() {
    var modal = document.getElementById("link-apply-modal");
    if (modal && modal.parentElement !== document.body) {
      document.body.appendChild(modal);
    }
  }

  function clearMessage() {
    var msg = document.getElementById("link-apply-message");
    if (msg) {
      msg.textContent = "";
      msg.className = "link-apply-message";
    }
  }

  function showMessage(text, type) {
    var msg = document.getElementById("link-apply-message");
    if (!msg) return;
    msg.textContent = text;
    msg.className =
      "link-apply-message is-visible" +
      (type === "success" ? " is-success" : " is-error");
  }

  // 获取 / 刷新验证码：每次获取都产生新的挑战，旧的挑战自动失效
  function refreshCaptcha() {
    // 1.5 秒点击冷却，防止连点刷出并发请求触发插件限流
    var now = Date.now();
    if (now < state.captchaCooldownUntil) return;
    state.captchaCooldownUntil = now + 1500;

    fetch(API_BASE + "/captcha", { method: "POST", credentials: "omit" })
      .then(function (res) {
        // 插件对验证码生成限流（每 IP 每分钟 10 次），直接给简单提示
        if (res.status === 429) {
          showMessage("操作太频繁，稍后再试");
          throw new Error("captcha-rate-limited");
        }
        if (!res.ok) throw new Error("captcha unavailable");
        return res.json();
      })
      .then(function (payload) {
        state.challengeId = payload.challengeId || null;
        state.captchaLoaded = true;
        var img = document.getElementById("link-apply-captcha-img");
        if (img) {
          if (payload.image) {
            img.setAttribute("src", payload.image);
          } else {
            img.removeAttribute("src");
          }
        }
        var code = document.getElementById("link-apply-captcha-code");
        if (code) code.value = "";
      })
      .catch(function (err) {
        state.challengeId = null;
        var img = document.getElementById("link-apply-captcha-img");
        // 移除 src 后由 CSS 隐藏图片，不显示破图图标
        if (img) img.removeAttribute("src");
        // 限流提示已在 429 分支给出，此处不再覆盖
        if (!err || err.message !== "captcha-rate-limited") {
          showMessage("验证码加载失败，请稍后重试");
        }
      });
  }

  function openModal() {
    var modal = getModal();
    if (!modal || state.submitting) return;
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    clearMessage();
    // 仅在首次打开时自动加载验证码，之后打开保留上次验证码不刷新
    if (!state.captchaLoaded) refreshCaptcha();
    var input = modal.querySelector('input[name="displayName"]');
    if (input) {
      setTimeout(function () {
        input.focus();
      }, 50);
    }
  }

  function closeModal() {
    var modal = getModal();
    if (!modal || state.submitting) return;
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    // 保留验证码与挑战 ID：再次打开时直接沿用，不重新请求；点击图片刷新才更新
  }

  function setSubmitting(submitting) {
    state.submitting = submitting;
    var submitBtn = document.getElementById("link-apply-submit");
    var closeBtn = document.getElementById("link-apply-close");
    if (submitBtn) {
      submitBtn.disabled = submitting;
      var text = submitBtn.querySelector(".link-apply-submit-text");
      if (text) text.textContent = submitting ? "提交中..." : "提交申请";
    }
    if (closeBtn) closeBtn.disabled = submitting;
  }

  function submitApplication() {
    var form = document.getElementById("link-apply-form");
    if (!form || state.submitting) return;
    clearMessage();

    var url = form.elements.url.value.trim();
    var displayName = form.elements.displayName.value.trim();
    var captchaCode = form.elements.captchaCode.value.trim();

    if (!url || !displayName) {
      showMessage("请填写必填项（网站地址、网站名称）");
      return;
    }
    if (!captchaCode) {
      showMessage("请输入验证码");
      return;
    }
    if (!state.challengeId) {
      showMessage("验证码加载失败，请点击验证码重试");
      return;
    }

    // 每行一个 RSS 地址 → 字符串数组
    var feedUrls = (form.elements.feedUrls.value || "")
      .split(/\r?\n/)
      .map(function (line) {
        return line.trim();
      })
      .filter(Boolean);

    var payload = {
      url: url,
      displayName: displayName,
      logo: form.elements.logo.value.trim(),
      description: form.elements.description.value.trim(),
      email: form.elements.email.value.trim(),
      backlink: form.elements.backlink.value.trim(),
      feedUrls: feedUrls,
      challengeId: state.challengeId,
      captchaCode: captchaCode,
    };

    setSubmitting(true);

    fetch(API_BASE, {
      method: "POST",
      credentials: "omit",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then(function (res) {
        if (res.status === 201) {
          showMessage("申请已提交，请等待审核", "success");
          form.reset();
          return;
        }
        return res
          .json()
          .then(function (problem) {
            var key = problem.status + " " + problem.type;
            var text =
              ERROR_MESSAGES[key] ||
              (problem.detail ? String(problem.detail) : "") ||
              DEFAULT_ERROR;
            showMessage(text);
          })
          .catch(function () {
            showMessage(DEFAULT_ERROR);
          });
      })
      .catch(function () {
        showMessage(DEFAULT_ERROR);
      })
      .finally(function () {
        setSubmitting(false);
        // 验证码挑战每次提交都会被消费，无论成败都重新获取
        refreshCaptcha();
      });
  }

  // document 级监听器只绑一次（防重执行后多闭包重复响应，见文件头 state 注释）
  if (!window.__linkApplyBound) {
    window.__linkApplyBound = true;

    // 点击事件委托（兼容 Swup 重建 DOM）
    document.addEventListener("click", function (e) {
      var target = e.target;
      if (!(target instanceof Element)) return;

      if (target.closest("#link-apply-btn")) {
        e.preventDefault();
        openModal();
        return;
      }
      if (target.closest("#link-apply-close")) {
        closeModal();
        return;
      }
      if (target.closest("#link-apply-backdrop")) {
        closeModal();
        return;
      }
      if (target.closest("#link-apply-captcha-img")) {
        e.preventDefault();
        refreshCaptcha();
        return;
      }
    });

    // 表单提交委托
    document.addEventListener("submit", function (e) {
      var form = e.target;
      if (form && form.id === "link-apply-form") {
        e.preventDefault();
        submitApplication();
      }
    });

    // Esc 关闭
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeModal();
    });

    // 换页后重置状态：模态框挂载在 body 下、不随 Swup 容器替换。
    // 用 @swup/astro 文档化的 astro:after-swap（每次换页后分发）替代原
    // swup:contentReplaced 监听——那是 Swup v3 事件名，v4 分发 swup:{hook}，从未触发。
    document.addEventListener("astro:after-swap", function () {
      document.body.style.overflow = "";
      state.submitting = false;
      state.challengeId = null;
      // 页面切换后模态框 DOM 被重建（图片无 src），需重新加载验证码
      state.captchaLoaded = false;
      // 新页面若仍渲染了申请模态框（links 页面），重新挂载到 body
      mountModalToBody();
      // 离开 links 页面时，清理残留的模态框 DOM
      if (!document.getElementById("link-apply-btn")) {
        var modal = document.getElementById("link-apply-modal");
        if (modal) modal.remove();
      }
    });
  }

  // 首次加载时将模态框挂载到 body（换页场景由上方 astro:after-swap 覆盖）
  mountModalToBody();
})();

// 随机访问友链 - 从页面已渲染的友链卡片中随机选择
// 事件委托，不受 Swup 无刷新切换影响
// 点击后图标匀速旋转 1.5 秒再执行随机跳转，增加趣味性
(function () {
  // 只绑定一次：本脚本在 links 页面内（Swup 容器），每次进出该页都会被
  // SwupScriptsPlugin 克隆重执行——不守卫则多个闭包各持独立 spinning 标志，
  // 换页 N 次后一次点击会触发 N 个委托、打开 N 个随机链接。
  if (window.__randomVisitBound) return;
  window.__randomVisitBound = true;

  var t =
    window.__etherealI18n ||
    function (_key, fallback) {
      return fallback;
    };
  var SPIN_DELAY = 1500; // 旋转等待时长（ms）
  var spinning = false; // 防止重复点击

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

  // 停止旋转，恢复按钮
  function stopSpin(btn) {
    spinning = false;
    btn.classList.remove("spinning");
    var label = btn.querySelector(".random-visit-label");
    if (label) label.textContent = t("page.links.randomVisit", "随机访问");
  }

  // 旋转动画：匀速慢转（1s/圈，由 CSS 默认值控制），到时执行跳转
  function startSpin(btn, callback) {
    btn.classList.add("spinning");
    var label = btn.querySelector(".random-visit-label");
    if (label) label.textContent = t("page.links.drawing", "抽取中...");
    setTimeout(callback, SPIN_DELAY);
  }

  // 从页面已渲染的友链卡片中收集链接。
  // 友链 <a> 带 data-link-group（分组显示名），与后台「随机访问分组」填写的名称一致，
  // 避免 REST API group 参数（匹配 metadata.name）与显示名不匹配的问题。
  function collectUrls(btn) {
    var allowed = (btn.getAttribute("data-random-groups") || "").trim();
    var groups = null;
    if (allowed) {
      groups = allowed
        .split(/[\n,]/)
        .map(function (g) {
          return g.trim();
        })
        .filter(Boolean);
    }

    var urls = [];
    var anchors = document.querySelectorAll("a[data-link-group]");
    for (var i = 0; i < anchors.length; i++) {
      var a = anchors[i];
      if (!a.href) continue;
      if (groups && groups.indexOf(a.getAttribute("data-link-group")) === -1) {
        continue;
      }
      // 只收集 http/https 链接（a.href property 已解析为绝对 URL），
      // javascript: 等危险 scheme 不进随机访问池
      if (!/^https?:\/\//i.test(a.href)) continue;
      urls.push(a.href);
    }
    return urls;
  }

  // 执行随机访问
  function doRandomVisit(btn) {
    var urls = collectUrls(btn);
    if (urls.length === 0) {
      alert(t("page.links.noRandomLinks", "暂无可随机访问的友链"));
      stopSpin(btn);
      return;
    }
    openViaAnchor(urls[Math.floor(Math.random() * urls.length)]);
    stopSpin(btn);
  }

  document.addEventListener("click", function (e) {
    var btn = e.target.closest("#random-visit-btn");
    if (!btn || spinning) return;

    spinning = true;
    startSpin(btn, function () {
      doRandomVisit(btn);
    });
  });
})();
