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

/** 创建命名空间（SVG）元素 */
function svgEl(tag: string, attrs: Record<string, string>): SVGElement {
  const svgNs = "http://www.w3.org/2000/svg";
  const node = document.createElementNS(svgNs, tag);
  for (const [key, value] of Object.entries(attrs)) {
    node.setAttribute(key, value);
  }
  return node;
}

/** 外链图标（地球） */
function buildGlobeIcon(): SVGSVGElement {
  const svg = svgEl("svg", {
    width: "14",
    height: "14",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    "stroke-width": "2",
  }) as SVGSVGElement;
  svg.style.flexShrink = "0";
  svg.appendChild(svgEl("circle", { cx: "12", cy: "12", r: "10" }));
  svg.appendChild(svgEl("line", { x1: "2", y1: "12", x2: "22", y2: "12" }));
  svg.appendChild(
    svgEl("path", {
      d: "M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z",
    }),
  );
  return svg;
}

/** 返回按钮图标（关闭叉） */
function buildCloseIcon(): SVGSVGElement {
  const svg = svgEl("svg", {
    width: "15",
    height: "15",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    "stroke-width": "2",
  }) as SVGSVGElement;
  svg.appendChild(svgEl("line", { x1: "18", y1: "6", x2: "6", y2: "18" }));
  svg.appendChild(svgEl("line", { x1: "6", y1: "6", x2: "18", y2: "18" }));
  return svg;
}

/** 继续访问图标（右箭头） */
function buildArrowIcon(): SVGSVGElement {
  const svg = svgEl("svg", {
    width: "15",
    height: "15",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    "stroke-width": "2",
  }) as SVGSVGElement;
  svg.appendChild(svgEl("line", { x1: "5", y1: "12", x2: "19", y2: "12" }));
  svg.appendChild(svgEl("polyline", { points: "12 5 19 12 12 19" }));
  return svg;
}

/**
 * 构建模态框静态骨架。
 * 注意：骨架中不含任何动态数据（外链 URL、站点名等全部留空），
 * 动态内容一律在 createOrUpdateModal 中通过 textContent/setAttribute 写入，
 * 从根本上杜绝 HTML 注入。
 */
function buildModal(): HTMLElement {
  const modal = document.createElement("div");
  modal.id = "ext-link-modal";

  const backdrop = document.createElement("div");
  backdrop.id = "ext-link-backdrop";
  modal.appendChild(backdrop);

  const card = document.createElement("div");
  card.id = "ext-link-card";

  const avatar = document.createElement("div");
  avatar.className = "ext-avatar";
  card.appendChild(avatar);

  const title = document.createElement("div");
  title.className = "ext-title";
  title.textContent = "即将离开本站";
  card.appendChild(title);

  const desc = document.createElement("div");
  desc.className = "ext-desc";
  card.appendChild(desc);

  const site = document.createElement("div");
  site.className = "ext-site";
  card.appendChild(site);

  // URL 行：图标 + 文本 + 复制按钮
  const urlBox = document.createElement("div");
  urlBox.className = "ext-url-box";
  urlBox.appendChild(buildGlobeIcon());
  const urlText = document.createElement("span");
  urlText.className = "ext-url-text";
  urlBox.appendChild(urlText);
  const copyBtn = document.createElement("button");
  copyBtn.className = "ext-copy";
  copyBtn.id = "ext-copy-btn";
  copyBtn.title = "复制";
  const copyIcon = document.createElement("span");
  copyIcon.className = "icon-[material-symbols--content-copy-outline-rounded]";
  copyIcon.style.cssText = "font-size:13px;line-height:1";
  copyBtn.appendChild(copyIcon);
  copyBtn.appendChild(document.createTextNode("复制"));
  urlBox.appendChild(copyBtn);
  card.appendChild(urlBox);

  // 进度条
  const progressBar = document.createElement("div");
  progressBar.className = "ext-progress-bar";
  progressBar.id = "ext-progress-bar";
  progressBar.style.display = "none";
  const progressFill = document.createElement("div");
  progressFill.className = "ext-progress-fill";
  progressFill.id = "ext-progress-fill";
  progressBar.appendChild(progressFill);
  card.appendChild(progressBar);

  // 按钮行
  const btns = document.createElement("div");
  btns.className = "ext-btns";
  const backBtn = document.createElement("button");
  backBtn.className = "ext-btn-back";
  backBtn.id = "ext-btn-back";
  backBtn.appendChild(buildCloseIcon());
  backBtn.appendChild(document.createTextNode("返回"));
  btns.appendChild(backBtn);
  const goBtn = document.createElement("button");
  goBtn.className = "ext-btn-go";
  goBtn.id = "ext-btn-go";
  goBtn.appendChild(document.createTextNode("继续访问"));
  goBtn.appendChild(buildArrowIcon());
  btns.appendChild(goBtn);
  card.appendChild(btns);

  // 倒计时
  const countdown = document.createElement("div");
  countdown.className = "ext-countdown";
  countdown.id = "ext-countdown";
  countdown.style.display = "none";
  card.appendChild(countdown);

  modal.appendChild(card);
  return modal;
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

  // 已存在则复用 DOM，否则创建一次静态骨架（事件监听器只绑定一次）
  let modal = document.getElementById("ext-link-modal") as HTMLElement | null;
  if (!modal) {
    modal = buildModal();
    document.body.appendChild(modal);
    bindStaticListeners(modal);
  }

  // 更新动态内容：全部走 textContent / setAttribute，杜绝 HTML 注入
  const siteEl = modal.querySelector(".ext-site");
  if (siteEl) siteEl.textContent = siteName;
  const urlText = modal.querySelector(".ext-url-text");
  if (urlText) urlText.textContent = displayUrl;
  const descEl = modal.querySelector(".ext-desc");
  if (descEl)
    descEl.textContent =
      config?.redirect_prompt ||
      "您即将访问外部链接，请注意保护个人隐私和信息安全";
  const copyBtn = modal.querySelector<HTMLButtonElement>("#ext-copy-btn");
  if (copyBtn) copyBtn.setAttribute("data-copy-text", targetUrl);

  // 头像：优先配置图片，否则用默认图标
  const avatarEl = modal.querySelector(".ext-avatar");
  if (avatarEl) {
    avatarEl.textContent = "";
    if (avatarUrl) {
      const img = document.createElement("img");
      img.src = avatarUrl;
      img.alt = "";
      avatarEl.appendChild(img);
    } else {
      const icon = document.createElement("span");
      icon.className = "icon-[material-symbols--open-in-new-rounded]";
      icon.style.fontSize = "28px";
      avatarEl.appendChild(icon);
    }
  }

  // 重置倒计时显示
  const countdownEl = modal.querySelector<HTMLElement>("#ext-countdown");
  const progressBar = modal.querySelector<HTMLElement>("#ext-progress-bar");
  const progressFill = modal.querySelector<HTMLElement>("#ext-progress-fill");
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
