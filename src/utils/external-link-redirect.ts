// 外链跳转提示（模态框方案）
import { getThemeConfig } from "./theme-config";
import type { ExternalLink } from "../types/config";

let extLinkInited = false;

function getConfig(): ExternalLink | null {
  return (getThemeConfig()?.external_link as ExternalLink) || null;
}

function isWhitelisted(hostname: string, list?: string): boolean {
  if (!list || !hostname) return false;
  // 确保 hostname 是合法域名格式，防止畸形 URL 绕过
  if (
    !/^([a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/.test(
      hostname,
    ) &&
    hostname !== "localhost"
  ) {
    return false;
  }
  return list.split("\n").some((line) => {
    const p = line.trim();
    if (!p) return false;
    if (p === hostname) return true;
    if (p.startsWith("*.")) {
      const d = p.slice(2);
      return hostname === d || hostname.endsWith("." + d);
    }
    return false;
  });
}

/** 复用已创建的模态框 DOM 节点（仅更新文本内容），避免每次重建 */
function createOrUpdateModal(targetUrl: string) {
  const config = getConfig();
  const delay = config?.redirect_delay ?? 5;
  const openNew = config?.open_new_window ?? false;
  const avatarUrl = config?.avatar || "";
  const displayUrl =
    targetUrl.length > 70 ? targetUrl.slice(0, 70) + "..." : targetUrl;

  let siteName = "";
  try {
    siteName = new URL(targetUrl).hostname;
  } catch {
    siteName = targetUrl;
  }

  // 如果已存在模态框，仅更新动态内容
  const existing = document.getElementById("ext-link-modal");
  if (existing) {
    // 更新显示
    const siteEl = existing.querySelector(".ext-site");
    if (siteEl) siteEl.textContent = siteName;
    const urlText = existing.querySelector(".ext-url-text");
    if (urlText) urlText.textContent = displayUrl;
    const descEl = existing.querySelector(".ext-desc");
    if (descEl)
      descEl.textContent =
        config?.redirect_prompt ||
        "您即将访问外部链接，请注意保护个人隐私和信息安全";
    const copyBtn = existing.querySelector<HTMLButtonElement>("#ext-copy-btn");
    if (copyBtn) copyBtn.setAttribute("data-copy-text", targetUrl);
    // 重置倒计时显示
    const countdownEl = existing.querySelector<HTMLElement>("#ext-countdown");
    const progressBar =
      existing.querySelector<HTMLElement>("#ext-progress-bar");
    const progressFill =
      existing.querySelector<HTMLElement>("#ext-progress-fill");
    if (countdownEl) countdownEl.textContent = delay + " 秒后自动跳转";
    if (countdownEl) countdownEl.style.display = delay > 0 ? "block" : "none";
    if (progressBar) progressBar.style.display = delay > 0 ? "block" : "none";
    if (progressFill) {
      progressFill.style.transition = "none";
      progressFill.style.width = "100%";
      requestAnimationFrame(() => {
        progressFill.style.transition = `width ${delay}s linear`;
        progressFill.style.width = "0%";
      });
    }
    setupModalBehavior(existing, targetUrl, delay, openNew);
    return;
  }

  const avatarHTML = avatarUrl
    ? `<img src="${avatarUrl}" alt="" />`
    : `<span class="icon-[material-symbols--open-in-new-rounded]" style="font-size:28px"></span>`;

  const modal = document.createElement("div");
  modal.id = "ext-link-modal";
  modal.innerHTML = `
    <div id="ext-link-backdrop"></div>
    <div id="ext-link-card">
      <div class="ext-avatar">${avatarHTML}</div>
      <div class="ext-title">即将离开本站</div>
      <div class="ext-desc">${config?.redirect_prompt || "您即将访问外部链接，请注意保护个人隐私和信息安全"}</div>
      <div class="ext-site">${siteName}</div>
      <div class="ext-url-box">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
        <span class="ext-url-text">${displayUrl}</span>
        <button class="ext-copy" id="ext-copy-btn" title="复制" data-copy-text="${targetUrl}">
          <span class="icon-[material-symbols--content-copy-outline-rounded]" style="font-size:13px;line-height:1"></span>
          <span>复制</span>
        </button>
      </div>
      <div class="ext-progress-bar" id="ext-progress-bar" style="display:none">
        <div class="ext-progress-fill" id="ext-progress-fill"></div>
      </div>
      <div class="ext-btns">
        <button class="ext-btn-back" id="ext-btn-back">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>返回
        </button>
        <button class="ext-btn-go" id="ext-btn-go">
          继续访问<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
        </button>
      </div>
      <div class="ext-countdown" id="ext-countdown" style="display:none">${delay} 秒后自动跳转</div>
    </div>
  `;
  document.body.appendChild(modal);

  // 只绑定一次事件监听器（利用 DOM 持久化）
  bindStaticListeners(modal);

  setupModalBehavior(modal, targetUrl, delay, openNew);
}

/** 绑定不随内容变化的事件监听器（back，backdrop，copy，continue） */
let staticListenersBound = false;
function bindStaticListeners(modal: HTMLElement) {
  if (staticListenersBound) return;
  staticListenersBound = true;

  // Copy button - 委托到 modal
  modal.addEventListener("click", function (e) {
    const copyBtn = (e.target as HTMLElement).closest<HTMLButtonElement>(
      "#ext-copy-btn",
    );
    if (!copyBtn) return;
    const text = copyBtn.getAttribute("data-copy-text");
    if (!text) return;
    const icon = copyBtn.querySelector("span:first-child");
    const label = copyBtn.querySelector(
      "span:last-child",
    ) as HTMLElement | null;
    if (icon) icon.className = "icon-[material-symbols--check-rounded]";
    if (label) {
      label.style.cssText = "";
      label.textContent = "已复制";
    }
    copyBtn.style.color = "var(--primary)";
    copyBtn.disabled = true;
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setTimeout(() => {
          if (icon)
            icon.className =
              "icon-[material-symbols--content-copy-outline-rounded]";
          if (label) label.textContent = "复制";
          copyBtn.style.color = "";
          copyBtn.disabled = false;
        }, 2000);
      })
      .catch(() => {
        console.warn("[ExternalLink] Clipboard write failed");
        setTimeout(() => {
          if (icon)
            icon.className =
              "icon-[material-symbols--content-copy-outline-rounded]";
          if (label) label.textContent = "复制";
          copyBtn.style.color = "";
          copyBtn.disabled = false;
        }, 2000);
      });
  });

  // Back button
  modal.querySelector("#ext-btn-back")?.addEventListener("click", () => {
    closeModal(modal);
  });

  // Backdrop click
  modal.querySelector("#ext-link-backdrop")?.addEventListener("click", () => {
    closeModal(modal);
  });
}

let activeTimer: ReturnType<typeof setInterval> | null = null;
function clearActiveTimer() {
  if (activeTimer) {
    clearInterval(activeTimer);
    activeTimer = null;
  }
}

function closeModal(modal: HTMLElement) {
  clearActiveTimer();
  document.body.style.overflow = "";
  const card = modal.querySelector<HTMLElement>("#ext-link-card");
  const backdrop = modal.querySelector<HTMLElement>("#ext-link-backdrop");
  if (card) {
    card.style.transition = "opacity .15s ease, transform .15s ease";
    card.style.opacity = "0";
    card.style.transform = "translateY(8px) scale(.98)";
  }
  if (backdrop) {
    backdrop.style.transition = "opacity .15s ease";
    backdrop.style.opacity = "0";
  }
  // 不清除 DOM，仅隐藏；下次 show 时复用
  setTimeout(() => {
    if (modal.parentElement) {
      modal.style.display = "none";
    }
  }, 150);
}

function setupModalBehavior(
  modal: HTMLElement,
  targetUrl: string,
  delay: number,
  openNew: boolean,
) {
  let dismissed = false;
  clearActiveTimer();

  // 显示模态框
  modal.style.display = "";
  document.body.style.overflow = "hidden";

  // 恢复 card/backdrop 透明度
  const card = modal.querySelector<HTMLElement>("#ext-link-card");
  const backdrop = modal.querySelector<HTMLElement>("#ext-link-backdrop");
  if (card) {
    card.style.opacity = "1";
    card.style.transform = "translateY(0) scale(1)";
  }
  if (backdrop) {
    backdrop.style.opacity = "1";
  }

  function goToTarget() {
    if (dismissed) return;
    dismissed = true;
    clearActiveTimer();
    if (openNew) {
      window.open(targetUrl, "_blank", "noopener,noreferrer");
    } else {
      window.location.href = targetUrl;
    }
    modal.style.display = "none";
    document.body.style.overflow = "";
  }

  // Bind continue button (may have been replaced by Swup)
  const goBtn = modal.querySelector<HTMLElement>("#ext-btn-go");
  if (goBtn) {
    // Remove old listener by cloning
    const newGoBtn = goBtn.cloneNode(true) as HTMLElement;
    goBtn.parentNode?.replaceChild(newGoBtn, goBtn);
    newGoBtn.addEventListener("click", (e) => {
      e.preventDefault();
      goToTarget();
    });
  }

  // Countdown
  if (delay > 0) {
    let remaining = delay;
    const totalDelay = delay;
    const countdownEl = modal.querySelector<HTMLElement>("#ext-countdown");
    const progressFill = modal.querySelector<HTMLElement>("#ext-progress-fill");
    const progressBar = modal.querySelector<HTMLElement>("#ext-progress-bar");
    if (countdownEl) countdownEl.style.display = "block";
    if (progressBar) progressBar.style.display = "block";
    if (countdownEl) countdownEl.textContent = remaining + " 秒后自动跳转";
    if (progressFill) {
      progressFill.style.transition = "none";
      progressFill.style.width = "100%";
      requestAnimationFrame(() => {
        progressFill.style.transition = `width ${totalDelay}s linear`;
        progressFill.style.width = "0%";
      });
    }
    function tick() {
      remaining--;
      if (remaining <= 0) {
        goToTarget();
      } else {
        if (countdownEl) countdownEl.textContent = remaining + " 秒后自动跳转";
      }
    }
    activeTimer = setInterval(tick, 1000);
  }
}

export function initExternalLinkRedirect() {
  if (extLinkInited) return;
  extLinkInited = true;

  document.addEventListener(
    "click",
    (e) => {
      const config = getConfig();
      if (!config?.enable_redirect) return;

      const path = e.composedPath();
      const anchor = path.find(
        (el) => el instanceof HTMLElement && el.tagName === "A",
      ) as HTMLAnchorElement | undefined;
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href) return;
      const s = href.substring(0, 11).toLowerCase();
      if (
        s === "javascript:" ||
        s === "mailto:" ||
        href.charAt(0) === "#" ||
        s === "tel:"
      )
        return;

      let hostname: string | undefined;
      try {
        const a = document.createElement("a");
        a.href = href;
        hostname = a.hostname;
      } catch {
        return;
      }
      if (!hostname || hostname === window.location.hostname) return;
      if (isWhitelisted(hostname, config.whitelist)) return;

      e.preventDefault();
      e.stopPropagation();
      createOrUpdateModal(href);
    },
    true,
  );
}
