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
