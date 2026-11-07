// 打赏信息表单（/reward 的自建模态框，替代「打赏插件」自带的 reward-modal.js）
// 构建产物：public/assets/reward-form.js（源码在 src/scripts/assets/，esbuild 编译，勿手改产物）
//
// 交互对齐 /links 的「申请友链」模态框（links.bundle.js）；表单标记由 reward.astro 服务端渲染，
// 本脚本只做交互与提交：captcha / config / records 三个接口，均带 15s 超时。
import {
  lockPageScroll,
  resetPageScrollLock,
  unlockPageScroll,
} from "../../utils/scroll-lock";

// 客户端 i18n：复用 Layout.astro 注入的全局助手（缺失时退化为回退文案）
var t =
  window.__etherealI18n ||
  function (_k: string, f: string) {
    return f;
  };

interface RewardFormState {
  /** 当前验证码挑战 id（提交时随 payload 带上） */
  captchaId: string | null;
  /** 是否已加载过验证码：仅首次打开自动加载，之后保留，点图或提交后才刷新 */
  captchaLoaded: boolean;
  /** 验证码刷新点击冷却（插件按 IP 限流 10 次/分钟） */
  captchaCooldownUntil: number;
  submitting: boolean;
  /** 「仅登录用户可提交」且当前未登录：锁住提交按钮 */
  needLogin: boolean;
  loginChecked: boolean;
}

type RewardFormWindow = Window & {
  __rewardFormState?: RewardFormState;
  __rewardFormBound?: boolean;
  /** 赞助者墙刷新钩子（reward.astro 内联脚本挂载），提交成功后调用 */
  __rewardWallReload?: () => void;
};

(function () {
  "use strict";

  var API_BASE = "/apis/api.reward.nanzhiy.cn/v1alpha1";
  var MAX_AMOUNT = 1000000;
  // 接口挂起兜底：超时即按失败收尾，避免提交按钮 / 登录态永久卡在「进行中」
  var REQUEST_TIMEOUT = 15000;
  // 金额只接受正数且最多两位小数（与插件 buildRecord 的校验一致）
  var AMOUNT_PATTERN = /^\d+(\.\d{1,2})?$/;

  var win = window as unknown as RewardFormWindow;

  // 状态挂 window 共享：SwupScriptsPlugin 换页时会克隆重执行本脚本，新闭包必须操作同一份状态
  var state =
    win.__rewardFormState ||
    (win.__rewardFormState = {
      captchaId: null,
      captchaLoaded: false,
      captchaCooldownUntil: 0,
      submitting: false,
      needLogin: false,
      loginChecked: false,
    });

  // 关闭动画定时器：出场动画（约 200ms）结束后再隐藏；再次打开时取消
  var closeTimer: ReturnType<typeof setTimeout> | null = null;

  function byId(id: string): HTMLElement | null {
    return document.getElementById(id);
  }

  // 给 fetch 挂超时：返回 { signal, done }，done 在响应/失败后清理定时器。
  // 刻意不返回 Promise（返回 Promise 会触发 TS 的「可改 async」建议）。
  function withTimeout(): { signal?: AbortSignal; done: () => void } {
    if (typeof AbortController === "undefined") {
      return { signal: undefined, done: function () {} };
    }
    var controller = new AbortController();
    var timer = setTimeout(function () {
      controller.abort();
    }, REQUEST_TIMEOUT);
    return {
      signal: controller.signal,
      done: function () {
        clearTimeout(timer);
      },
    };
  }

  function getModal(): HTMLElement | null {
    return byId("reward-form-modal");
  }

  function getForm(): HTMLFormElement | null {
    var node = byId("reward-form");
    return node instanceof HTMLFormElement ? node : null;
  }

  // 表单控件按 name 取（form.elements.namedItem 可能返回 RadioNodeList，用 instanceof 收窄）
  function input(name: string): HTMLInputElement | null {
    var form = getForm();
    if (!form) return null;
    var item = form.elements.namedItem(name);
    return item instanceof HTMLInputElement ? item : null;
  }

  function textarea(name: string): HTMLTextAreaElement | null {
    var form = getForm();
    if (!form) return null;
    var item = form.elements.namedItem(name);
    return item instanceof HTMLTextAreaElement ? item : null;
  }

  function select(name: string): HTMLSelectElement | null {
    var form = getForm();
    if (!form) return null;
    var item = form.elements.namedItem(name);
    return item instanceof HTMLSelectElement ? item : null;
  }

  function captchaImg(): HTMLImageElement | null {
    var node = byId("reward-form-captcha-img");
    return node instanceof HTMLImageElement ? node : null;
  }

  function hasCaptcha(): boolean {
    return !!captchaImg();
  }

  // 将模态框挂到 <body>：swup 容器内 #content-wrapper 的 onload-animation 用了 translate，
  // 会创建包含块，position: fixed 会相对内容区定位；挂 body 后与分享 / 打赏 / 外链弹层一致
  function mountModalToBody() {
    var modal = getModal();
    if (modal && modal.parentElement !== document.body) {
      document.body.appendChild(modal);
    }
  }

  function clearMessage() {
    var msg = byId("reward-form-message");
    if (!msg) return;
    msg.textContent = "";
    msg.className = "link-apply-message";
  }

  function showNeedLogin() {
    showMessage(t("page.reward.formNeedLogin", "请先登录后再提交打赏信息"));
  }

  function showMessage(text: string, type?: "success") {
    var msg = byId("reward-form-message");
    if (!msg) return;
    msg.textContent = text;
    msg.className =
      "link-apply-message is-visible" +
      (type === "success" ? " is-success" : " is-error");
  }

  // 验证码：插件 GET /public/captcha 返回 { id, image }，一次性、5 分钟失效
  function refreshCaptcha() {
    var now = Date.now();
    if (now < state.captchaCooldownUntil) return;
    state.captchaCooldownUntil = now + 1500;

    var guard = withTimeout();
    fetch(API_BASE + "/public/captcha", {
      headers: { Accept: "application/json" },
      signal: guard.signal,
    })
      .then(function (res) {
        guard.done();
        if (res.status === 429) {
          showMessage(
            t("page.reward.formCaptchaBusy", "验证码获取过于频繁，请稍后再试"),
          );
          throw new Error("captcha-busy");
        }
        if (!res.ok) throw new Error("captcha-unavailable");
        return res.json();
      })
      .then(function (payload) {
        state.captchaId =
          payload && payload.id
            ? String(payload.id)
            : (null as unknown as string);
        state.captchaLoaded = true;
        var img = captchaImg();
        if (img) {
          if (payload && payload.image) img.setAttribute("src", payload.image);
          else img.removeAttribute("src");
        }
        var code = input("captchaCode");
        if (code) code.value = "";
      })
      .catch(function (err: Error) {
        guard.done();
        state.captchaId = null;
        var img = captchaImg();
        // 移除 src 后由 CSS 隐藏图片，不显示破图图标
        if (img) img.removeAttribute("src");
        // 限流提示已在 429 分支给出，此处不再覆盖
        if (!err || err.message !== "captcha-busy") {
          showMessage(
            t(
              "page.reward.formCaptchaFailed",
              "验证码加载失败，请点击图片重试",
            ),
          );
        }
      });
  }

  function captureIdleLabel() {
    var submit = byId("reward-form-submit");
    var text = submit && submit.querySelector(".reward-form-submit-text");
    if (submit && text && !submit.dataset.idleLabel) {
      submit.dataset.idleLabel = text.textContent || "";
    }
  }

  function setSubmitting(submitting: boolean) {
    state.submitting = submitting;
    var submit = byId("reward-form-submit");
    var closeBtn = byId("reward-form-close");
    if (submit instanceof HTMLButtonElement) {
      submit.disabled = submitting || state.needLogin;
      var text = submit.querySelector(".reward-form-submit-text");
      if (text) {
        text.textContent = submitting
          ? t("page.reward.formSubmitting", "提交中…")
          : submit.dataset.idleLabel || "";
      }
    }
    if (closeBtn instanceof HTMLButtonElement) closeBtn.disabled = submitting;
  }

  // 仅「仅登录用户可提交」时需要：打开面板先锁提交，再用公开配置里的 loggedIn 判定
  function checkLogin() {
    var modal = getModal();
    if (!modal || modal.dataset.requireLogin !== "true" || state.loginChecked) {
      return;
    }
    state.needLogin = true;
    setSubmitting(state.submitting);

    var guard = withTimeout();
    fetch(API_BASE + "/public/config", {
      headers: { Accept: "application/json" },
      signal: guard.signal,
    })
      .then(function (res) {
        guard.done();
        if (!res.ok) throw new Error("config-unavailable");
        return res.json();
      })
      .then(function (config) {
        state.loginChecked = true;
        state.needLogin = !!config && config.loggedIn === false;
        if (state.needLogin) showNeedLogin();
        setSubmitting(state.submitting);
      })
      .catch(function () {
        guard.done();
        // 查询失败（含超时）不拦提交：服务端会再校验并返回明确提示
        state.loginChecked = true;
        state.needLogin = false;
        setSubmitting(state.submitting);
      });
  }

  function openModal() {
    var modal = getModal();
    if (!modal || state.submitting) return;
    // 若处于关闭动画中：取消未完成的关闭并去掉 is-closing，重新走入场
    if (closeTimer) clearTimeout(closeTimer);
    modal.classList.remove("is-closing");
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    lockPageScroll();
    clearMessage();
    captureIdleLabel();
    if (hasCaptcha() && !state.captchaLoaded) refreshCaptcha();
    checkLogin();
    var amountEl = input("amount");
    if (amountEl) {
      var focusTarget = amountEl;
      setTimeout(function () {
        focusTarget.focus();
      }, 50);
    }
  }

  function closeModal() {
    var modal = getModal();
    if (!modal || state.submitting) return;
    // 防重复触发（连点 / Esc 与点击同帧）：已在出场动画中则忽略
    if (modal.classList.contains("is-closing")) return;
    var card = modal;
    card.classList.add("is-closing");
    if (closeTimer) clearTimeout(closeTimer);
    closeTimer = setTimeout(function () {
      card.classList.remove("is-open", "is-closing");
      card.setAttribute("aria-hidden", "true");
      unlockPageScroll();
    }, 200);
    // 保留验证码与挑战 id：再次打开时沿用，点图或提交后才刷新
  }

  function submitForm() {
    var form = getForm();
    if (!form || state.submitting) return;
    var formEl = form;
    if (state.needLogin) {
      showNeedLogin();
      return;
    }
    clearMessage();

    var amountEl = input("amount");
    var nicknameEl = input("nickname");
    var contactEl = input("contact");
    var transactionEl = input("transactionNo");
    var avatarEl = input("avatar");
    var captchaEl = input("captchaCode");
    var messageEl = textarea("message");
    var methodEl = select("method");

    var rawAmount = amountEl ? amountEl.value.trim() : "";
    var amount = Number(rawAmount);
    var nickname = nicknameEl ? nicknameEl.value.trim() : "";
    var transactionNo = transactionEl ? transactionEl.value.trim() : "";
    var avatar = avatarEl ? avatarEl.value.trim() : "";
    var captchaCode = captchaEl ? captchaEl.value.trim() : "";

    if (!rawAmount) {
      showMessage(t("page.reward.formAmountRequired", "请填写打赏金额"));
      if (amountEl) amountEl.focus();
      return;
    }
    if (
      !AMOUNT_PATTERN.test(rawAmount) ||
      !isFinite(amount) ||
      amount <= 0 ||
      amount > MAX_AMOUNT
    ) {
      showMessage(
        t(
          "page.reward.formAmountInvalid",
          "打赏金额不合法（需大于 0 且最多两位小数）",
        ),
      );
      if (amountEl) amountEl.focus();
      return;
    }
    if (!nickname) {
      showMessage(t("page.reward.formNicknameRequired", "请填写昵称"));
      if (nicknameEl) nicknameEl.focus();
      return;
    }
    if (transactionEl && !transactionNo) {
      showMessage(t("page.reward.formTransactionRequired", "请填写交易单号"));
      transactionEl.focus();
      return;
    }
    if (avatar && !/^https?:\/\//i.test(avatar)) {
      showMessage(
        t("page.reward.formAvatarInvalid", "头像链接需以 http(s):// 开头"),
      );
      if (avatarEl) avatarEl.focus();
      return;
    }
    if (captchaEl) {
      if (!captchaCode) {
        showMessage(t("page.reward.formCaptchaRequired", "请输入验证码"));
        captchaEl.focus();
        return;
      }
      if (!state.captchaId) {
        showMessage(
          t("page.reward.formCaptchaFailed", "验证码加载失败，请点击图片重试"),
        );
        return;
      }
    }

    var payload: Record<string, unknown> = {
      amount: Math.round(amount * 100) / 100,
      nickname: nickname,
      method: methodEl ? methodEl.value : "wechat",
    };
    if (messageEl && messageEl.value.trim()) {
      payload.message = messageEl.value.trim();
    }
    if (contactEl && contactEl.value.trim()) {
      payload.contact = contactEl.value.trim();
    }
    if (transactionEl && transactionNo) payload.transactionNo = transactionNo;
    if (avatarEl && avatar) payload.avatar = avatar;
    if (captchaEl && state.captchaId) {
      payload.captchaId = state.captchaId;
      payload.captchaCode = captchaCode;
    }

    setSubmitting(true);

    // 状态码单独留存：错误响应体可能不是 JSON（网关 / 限流页），拿不到 message 时走兜底文案
    var status = 0;

    // 收尾：解锁提交态 + 换验证码（一次性，服务端校验后即失效，无论成败）
    function finish(): void {
      setSubmitting(false);
      if (hasCaptcha()) {
        state.captchaLoaded = false;
        refreshCaptcha();
      }
    }

    function handlePayload(data: Record<string, unknown>): void {
      if (status >= 200 && status < 300) {
        showMessage(
          String(
            data.message ||
              t("page.reward.formSuccess", "已提交，等待站长确认后展示"),
          ),
          "success",
        );
        formEl.reset();
        // 插件开「提交后自动通过」时记录会立即上墙：让墙面拉回第一页
        if (typeof win.__rewardWallReload === "function") {
          win.__rewardWallReload();
        }
        return;
      }
      // 400 可能是「未登录」，下次打开重新查一次登录态（本页缓存不长期作废）
      var modal = getModal();
      if (status === 400 && modal && modal.dataset.requireLogin === "true") {
        state.loginChecked = false;
      }
      var text =
        status === 429
          ? t("page.reward.formRateLimited", "提交过于频繁，请稍后再试")
          : data.message || t("page.reward.formFailed", "提交失败，请稍后再试");
      showMessage(String(text));
    }

    // 外层回调不 return Promise（否则触发 TS 的「可改 async」建议，而经典脚本按 es2015
    // 编译、不宜引入 async 降级 helper）；解析在内部链处理，外层只兜网络层失败。
    var guard = withTimeout();
    // 不要加 credentials: "omit"：服务端按 cookie 判定登录态（「仅登录用户可提交」会直接 400）
    fetch(API_BASE + "/records", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
      signal: guard.signal,
    })
      .then(function (res) {
        guard.done();
        status = res.status;
        res
          .json()
          .catch(function () {
            return {} as Record<string, unknown>;
          })
          .then(handlePayload)
          .then(finish, finish);
      })
      .catch(function () {
        guard.done();
        showMessage(t("page.reward.formNetworkError", "网络异常，请稍后再试"));
        finish();
      });
  }

  // document 级监听器只绑一次（防换页重执行后多闭包重复响应）
  if (!win.__rewardFormBound) {
    win.__rewardFormBound = true;

    document.addEventListener("click", function (e) {
      var target = e.target;
      if (!(target instanceof Element)) return;

      if (target.closest("#reward-form-open")) {
        e.preventDefault();
        openModal();
        return;
      }
      if (target.closest("#reward-form-close")) {
        closeModal();
        return;
      }
      if (target.closest("#reward-form-backdrop")) {
        closeModal();
        return;
      }
      if (target.closest("#reward-form-captcha-img")) {
        e.preventDefault();
        refreshCaptcha();
      }
    });

    document.addEventListener("submit", function (e) {
      var target = e.target;
      if (target instanceof HTMLFormElement && target.id === "reward-form") {
        e.preventDefault();
        submitForm();
      }
    });

    document.addEventListener("keydown", function (e) {
      if (e.key !== "Escape") return;
      var modal = getModal();
      if (modal && modal.classList.contains("is-open")) closeModal();
    });

    // 换页后复位：模态框挂在 body 下、不随 Swup 容器替换，需按新页面重新挂载或清理
    document.addEventListener("astro:after-swap", function () {
      resetPageScrollLock();
      state.submitting = false;
      state.needLogin = false;
      state.loginChecked = false;
      state.captchaId = null;
      state.captchaLoaded = false;
      // 同一 id 的旧副本（上一页遗留在 body 下）先清掉，避免与新页面的模态框并存
      var modals = document.querySelectorAll("#reward-form-modal");
      for (var i = 0; i < modals.length; i++) {
        if (modals[i].parentElement === document.body) modals[i].remove();
      }
      if (byId("reward-form-open")) {
        mountModalToBody();
      } else {
        var leftover = getModal();
        if (leftover) leftover.remove();
      }
    });
  }

  mountModalToBody();
  captureIdleLabel();
})();
