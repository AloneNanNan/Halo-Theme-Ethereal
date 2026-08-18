// 文章打赏模态框（微信/支付宝收款二维码）
// 构建产物：public/assets/post-reward.js（源码在 src/scripts/assets/，esbuild 编译，勿手改产物）
import { getThemeConfig } from "./_theme-config";

// 客户端 i18n：复用 Layout.astro 注入的全局助手（缺失时退化为回退文案）
var t =
  window.__etherealI18n ||
  function (k, f) {
    return f;
  };

(function () {
  "use strict";

  var RETRY_LIMIT = 10;

  function getActionBarConfig() {
    var config = getThemeConfig();
    return (config && config.post && config.post.actionBar) || null;
  }

  function openRewardModal() {
    var actionBar = getActionBarConfig();
    var rs = (actionBar && actionBar.rewardSetting) || {};
    var title = (
      rs.title || "如果这篇文章对你有帮助，可以请我喝杯咖啡！"
    ).trim();
    var wechat = (rs.wechat_qr || "").trim();
    var alipay = (rs.alipay_qr || "").trim();

    if (!wechat && !alipay) {
      alert(t("post.noQrConfigured", "博主暂未配置收款二维码"));
      return;
    }

    // 复用分享模态框的动画 keyframes（ps-fade-in / ps-slide-up）
    var style = document.getElementById("ps-keyframes");
    if (!style) {
      style = document.createElement("style");
      style.id = "ps-keyframes";
      style.textContent =
        "@keyframes ps-fade-in{from{opacity:0}to{opacity:1}}" +
        "@keyframes ps-slide-up{from{opacity:0;transform:translate(-50%,calc(-50% + 16px)) scale(0.97)}to{opacity:1;transform:translate(-50%,-50%) scale(1)}}";
      document.head.appendChild(style);
    }

    // 遮罩层
    var backdrop = document.createElement("div");
    backdrop.style.cssText =
      "position:fixed;inset:0;z-index:99998;background:rgba(0,0,0,0.4);backdrop-filter:blur(4px);animation:ps-fade-in 0.25s ease";

    // 卡片
    var card = document.createElement("div");
    card.style.cssText =
      "position:fixed;z-index:99999;background:var(--card-bg,#fff);border-radius:var(--radius-large,20px);max-width:420px;width:calc(100% - 32px);box-shadow:0 20px 60px rgba(0,0,0,0.15);animation:ps-slide-up 0.3s ease;left:50%;top:50%;transform:translate(-50%,-50%);color:var(--deep-text,#333);overflow:hidden";

    // 内容区
    var body = document.createElement("div");
    body.style.cssText =
      "padding:24px 28px 28px 28px;display:flex;flex-direction:column;align-items:center;gap:14px";

    // 标题：图标 + 标题（纯色，不用主题色）+ 分隔线（参考 Profile 昵称下方 h-1 w-5 横线）
    var header = document.createElement("div");
    header.style.cssText =
      "display:flex;flex-direction:column;align-items:center;gap:10px;width:100%";
    var headerTitle = document.createElement("div");
    headerTitle.className = "text-90";
    headerTitle.style.cssText = "font-size:1.125rem;font-weight:700";
    headerTitle.innerHTML =
      "<span>" + t("post.rewardSupport", "打赏支持") + "</span>";
    var divider = document.createElement("div");
    divider.className = "h-1 w-5 rounded-full bg-(--primary) transition";
    header.appendChild(headerTitle);
    header.appendChild(divider);

    // 自定义文案
    var desc = document.createElement("p");
    desc.style.cssText =
      "margin:0;font-size:0.875rem;line-height:1.7;color:var(--text-75,#666);text-align:center;white-space:pre-line;word-break:break-word";
    desc.textContent = title;

    // 二维码行（微信 + 支付宝，1:1 正方形）
    var qrRow = document.createElement("div");
    qrRow.style.cssText =
      "display:flex;justify-content:center;gap:14px;width:100%";

    function buildQrItem(label: string, iconCls: string, src: string) {
      var item = document.createElement("div");
      item.className = "card-hover-lift";
      item.style.cssText =
        "flex:1;max-width:148px;display:flex;flex-direction:column;align-items:center;gap:10px;background:#fff;border:1px solid color-mix(in oklab,var(--primary) 18%,transparent);border-radius:14px;padding:12px 12px 10px 12px;transition:transform 0.25s ease,box-shadow 0.25s ease";
      // hover 效果接入项目 card-hover-lift（依赖 body.card-hover-lift-enabled）：
      // translateY(-4px) + 主题色阴影
      var img = document.createElement("img");
      img.src = src;
      img.alt = label;
      img.style.cssText =
        "width:100%;aspect-ratio:1/1;object-fit:contain;border-radius:8px;background:#fff";
      var labelEl = document.createElement("div");
      labelEl.style.cssText =
        "display:flex;align-items:center;gap:5px;font-size:0.8125rem;font-weight:600;color:var(--text-75,#555)";
      labelEl.innerHTML =
        '<span class="' +
        iconCls +
        ' text-[1rem] text-(--primary)"></span><span>' +
        label +
        "</span>";
      item.appendChild(img);
      item.appendChild(labelEl);
      return item;
    }

    if (wechat) {
      qrRow.appendChild(
        buildQrItem(
          t("post.wechat", "微信"),
          "icon-[fa6-brands--weixin]",
          wechat,
        ),
      );
    }
    if (alipay) {
      qrRow.appendChild(
        buildQrItem(
          t("post.alipay", "支付宝"),
          "icon-[fa6-brands--alipay]",
          alipay,
        ),
      );
    }

    // 关闭按钮（右上角，无阴影；hover 图标旋转 90° + 变主题色）
    var closeBtn = document.createElement("button");
    closeBtn.style.cssText =
      "position:absolute;top:12px;right:12px;width:28px;height:28px;display:flex;align-items:center;justify-content:center;border:none;border-radius:0.5rem;background:transparent;color:var(--text-50,#999);cursor:pointer;transition:transform 0.25s ease,color 0.25s ease,background 0.25s ease;z-index:2";
    closeBtn.setAttribute("aria-label", t("common.close", "关闭"));
    closeBtn.innerHTML =
      '<span class="icon-[material-symbols--close-rounded] text-xl leading-none"></span>';
    closeBtn.onmouseenter = function () {
      closeBtn.style.transform = "rotate(90deg)";
      closeBtn.style.color = "var(--primary)";
      closeBtn.style.background = "var(--btn-regular-bg,rgba(0,0,0,0.06))";
    };
    closeBtn.onmouseleave = function () {
      closeBtn.style.transform = "";
      closeBtn.style.color = "var(--text-50,#999)";
      closeBtn.style.background = "transparent";
    };

    body.appendChild(header);
    if (title) body.appendChild(desc);
    body.appendChild(qrRow);
    card.appendChild(closeBtn);
    card.appendChild(body);

    document.body.appendChild(backdrop);
    document.body.appendChild(card);

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

    backdrop.addEventListener("click", close);
    closeBtn.addEventListener("click", close);
    var escHandler = function (e: KeyboardEvent) {
      if (e.key === "Escape") {
        close();
        document.removeEventListener("keydown", escHandler);
      }
    };
    document.addEventListener("keydown", escHandler);
  }

  function bindButton(): boolean {
    var btn = document.getElementById(
      "post-reward-btn",
    ) as HTMLButtonElement | null;
    if (!btn || btn.dataset.rewardBound) return false;
    btn.dataset.rewardBound = "true";
    btn.addEventListener("click", openRewardModal);
    return true;
  }

  // 重试定时器全局唯一，避免 Swup 多次触发叠加
  var retryTimer: ReturnType<typeof setInterval> | null = null;
  var retryCount = 0;

  function clearRetry() {
    if (retryTimer) {
      clearInterval(retryTimer);
      retryTimer = null;
    }
  }

  function safeInit() {
    if (bindButton()) {
      clearRetry();
      return;
    }
    // 按钮可能因 Swup 渲染时机延迟出现，有限重试后放弃
    // （后台关闭打赏时按钮不存在，避免无限轮询）
    if (!retryTimer) {
      retryCount = 0;
      retryTimer = setInterval(function () {
        if (bindButton() || ++retryCount >= RETRY_LIMIT) {
          clearRetry();
        }
      }, 300);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", safeInit);
  } else {
    safeInit();
  }

  // 重新绑定由 SwupScriptsPlugin 重执行覆盖；
  // 原 swup:contentReplaced 监听删除（v3 事件名从未触发）。
})();
