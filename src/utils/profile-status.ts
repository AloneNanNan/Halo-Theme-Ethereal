/**
 * 个人简介小组件"在线状态"功能。
 *
 * 原理：状态值存在主题全局配置（sidebar.profile.statusSettings），页面服务端渲染，
 * 因此切换后当前页面立即更新、其他访客刷新页面即可看到新状态。
 *
 * 交互：
 * - 前台：鼠标悬停状态表情显示状态文案气泡（data-tooltip + CSS 伪元素）。
 * - 点击表情弹出主题风格模态框（参考外链跳转 / 友链申请 / 打赏模态框）：
 *   - 管理员：GET 主题配置探测登录态（/apis/api.console.halo.run，同源 Cookie 自动携带），
 *     成功则展示状态选项列表 + 自定义文案输入框；
 *   - 访客（401/403）：模态框内提示「暂无权限切换」。
 *
 * PUT 为整体替换，因此必须先 GET 完整配置再改字段再 PUT，避免冲掉其他后台配置。
 *
 * ⚠️ 状态集合维护须知：新增/修改状态需同步 4 处 ——
 * ① settings.yaml (select 选项 + 文案字段 + value)
 * ② Profile.astro (th:case 分支)
 * ③ 本文件的 STATUS_OPTIONS
 * ④ src/types/config.ts (SidebarProfileStatusText)
 */

import { getThemeConfig, setThemeConfig } from "./theme-config";

export interface StatusOption {
  key: string;
  label: string;
  /** 默认状态文案（后台 statusText 留空时使用） */
  defaultText: string;
  /** Iconify Tailwind 图标类（MingCute fill 风格） */
  iconClass: string;
  /** 图标颜色类 */
  colorClass: string;
  /** CSS 微动效类（见 components.css 的 status-* 动画） */
  animClass: string;
}

/**
 * 状态集合：与 settings.yaml / Profile.astro 服务端渲染保持一致。
 * 图标使用 MingCute 图标集（圆润现代，Apache 2.0），配合 status-* 微动效类实现轻量动态效果。
 * ⚠️ 加/改状态必须同步上述 4 处，漏改会导致显示不一致。
 */
export const STATUS_OPTIONS: StatusOption[] = [
  {
    key: "online",
    label: "在线",
    defaultText: "在线中",
    iconClass: "icon-[mingcute--leaf-fill]",
    colorClass: "text-green-500",
    animClass: "status-pulse",
  },
  {
    key: "energetic",
    label: "元气满满",
    defaultText: "元气满满",
    iconClass: "icon-[mingcute--sun-fill]",
    colorClass: "text-amber-500",
    animClass: "status-spin",
  },
  {
    key: "emo",
    label: "emo",
    defaultText: "emo中",
    iconClass: "icon-[mingcute--sad-fill]",
    colorClass: "text-violet-400",
    animClass: "status-float",
  },
  {
    key: "study",
    label: "学习中",
    defaultText: "学习中",
    iconClass: "icon-[mingcute--book-2-fill]",
    colorClass: "text-sky-500",
    animClass: "status-drift",
  },
  {
    key: "busy",
    label: "忙碌",
    defaultText: "忙碌中",
    iconClass: "icon-[mingcute--fire-fill]",
    colorClass: "text-orange-500",
    animClass: "status-wiggle",
  },
  {
    key: "dnd",
    label: "勿扰",
    defaultText: "请勿打扰",
    iconClass: "icon-[mingcute--moon-fill]",
    colorClass: "text-indigo-400",
    animClass: "status-float",
  },
  {
    key: "sleep",
    label: "睡觉",
    defaultText: "睡觉中",
    iconClass: "icon-[mingcute--moon-stars-fill]",
    colorClass: "text-blue-500",
    animClass: "status-pulse",
  },
  {
    key: "away",
    label: "离开",
    defaultText: "暂时离开",
    iconClass: "icon-[mingcute--cloud-fill]",
    colorClass: "text-neutral-400",
    animClass: "status-drift",
  },
];

const BADGE_SELECTOR = "#profile-status-badge";
const MODAL_ID = "status-modal";

let bound = false;
let modalEventsBound = false;

/** 打开模态框时缓存的最新完整配置（选择状态时直接修改后 PUT） */
let pendingConfig: Record<string, unknown> | null = null;

/** 模态框内当前选中的状态 key（点「确认切换」时应用） */
let selectedKey = "online";

// ── 工具 ──────────────────────────────────────────────

/** 根据 key 获取状态选项，未找到返回 undefined */
function getOption(key: string): StatusOption | undefined {
  return STATUS_OPTIONS.find((o) => o.key === key);
}

/** 清空 statusSettings 中所有状态的文案（含历史嵌套 statusText），用于切换后清理残留 */
function clearStatusTexts(settings: Record<string, unknown>) {
  STATUS_OPTIONS.forEach((o) => {
    settings[o.key] = "";
  });
  delete settings.statusText;
}

function getThemeName(): string {
  const el = document.getElementById("config-carrier");
  return el?.getAttribute("data-theme-name") || "Ethereal";
}

function getJsonConfigUrl(): string {
  return `/apis/api.console.halo.run/v1alpha1/themes/${getThemeName()}/json-config`;
}

function getCurrentStatus(): string {
  const badge = document.querySelector(BADGE_SELECTOR);
  return badge?.getAttribute("data-status") || "online";
}

/** 读取某状态的展示文案：后台自定义优先，留空用默认 */
function getStatusText(key: string): string {
  const opt = getOption(key);
  if (!opt) return "";
  const custom = getCustomText(key);
  return custom.trim() ? custom.trim() : opt.defaultText;
}

/** HTML 转义（用于输入框 value 属性，防引号/尖括号破坏结构） */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** 读取某状态在配置中已保存的自定义文案（可能为空字符串）。
 *  后台设置与前台切换均保存为平级字段（statusSettings.online 等）；
 *  为兼容历史数据，回退读取嵌套的 statusText.online。 */
function getCustomText(key: string): string {
  const config = getThemeConfig() as {
    sidebar?: {
      profile?: {
        statusSettings?: Record<string, unknown> & {
          statusText?: Record<string, string>;
        };
      };
    };
  } | null;
  const settings = config?.sidebar?.profile?.statusSettings;
  if (!settings) return "";
  const flat = settings[key];
  if (typeof flat === "string") return flat;
  const nested = settings.statusText?.[key];
  return typeof nested === "string" ? nested : "";
}

/** 同步悬浮气泡文案（移除原生 title 避免双提示） */
function syncTooltip() {
  const badge = document.querySelector(BADGE_SELECTOR);
  if (!badge) return;
  const status = getCurrentStatus();
  const opt = getOption(status) || STATUS_OPTIONS[0];
  badge.setAttribute("data-tooltip", getStatusText(opt.key));
  badge.removeAttribute("title");
}

/** 更新状态图标 DOM（无需刷新页面），并同步气泡文案 */
function setBadgeStatus(status: string) {
  const badge = document.querySelector(BADGE_SELECTOR);
  if (!badge) return;
  const opt = getOption(status) || STATUS_OPTIONS[0];
  badge.setAttribute("data-status", opt.key);
  // 与服务端渲染结构保持一致：无背景、彩色图标 + 微动效类直接内联
  badge.innerHTML = `<span class="${opt.iconClass} ${opt.colorClass} ${opt.animClass}"></span>`;
  syncTooltip();
}

// ── API ───────────────────────────────────────────────

type FetchResult =
  | { ok: true; config: Record<string, unknown> }
  | { ok: false; reason: "unauthorized" | "network" };

async function fetchJsonConfig(): Promise<FetchResult> {
  try {
    const resp = await fetch(getJsonConfigUrl(), {
      credentials: "same-origin",
    });
    if (resp.status === 401 || resp.status === 403) {
      return { ok: false, reason: "unauthorized" };
    }
    if (!resp.ok) return { ok: false, reason: "network" };
    const config = (await resp.json()) as Record<string, unknown>;
    return { ok: true, config };
  } catch {
    return { ok: false, reason: "network" };
  }
}

// ── 模态框（复用 DOM，参考 external-link 模态框模式）──

function getModal(): HTMLElement {
  let modal = document.getElementById(MODAL_ID) as HTMLElement | null;
  if (!modal) {
    modal = buildModal();
    document.body.appendChild(modal);
  }
  return modal;
}

function buildModal(): HTMLElement {
  const modal = document.createElement("div");
  modal.id = MODAL_ID;

  const backdrop = document.createElement("div");
  backdrop.className = "status-backdrop";
  modal.appendChild(backdrop);

  const card = document.createElement("div");
  card.className = "status-card";

  // 标题区：居中标题 + 主题色小横线 + 右上角关闭按钮
  const header = document.createElement("div");
  header.className = "status-header";

  const close = document.createElement("button");
  close.type = "button";
  close.className = "status-close";
  close.setAttribute("aria-label", "关闭");
  const closeIcon = document.createElement("span");
  closeIcon.className = "icon-[material-symbols--close-rounded]";
  close.appendChild(closeIcon);
  header.appendChild(close);

  const title = document.createElement("div");
  title.className = "status-title";
  title.textContent = "切换当前状态";
  header.appendChild(title);

  const divider = document.createElement("div");
  divider.className = "status-title-divider";
  header.appendChild(divider);

  card.appendChild(header);

  const body = document.createElement("div");
  body.className = "status-body";
  card.appendChild(body);

  const footer = document.createElement("div");
  footer.className = "status-footer";
  card.appendChild(footer);

  modal.appendChild(card);
  return modal;
}

function showModal(contentHtml: string, footerHtml: string) {
  const modal = getModal();
  const body = modal.querySelector<HTMLElement>(".status-body");
  const footer = modal.querySelector<HTMLElement>(".status-footer");
  if (body) body.innerHTML = contentHtml;
  if (footer) {
    footer.innerHTML = footerHtml;
    footer.style.display = footerHtml ? "" : "none";
  }
  modal.classList.add("is-open");
  document.body.style.overflow = "hidden";
}

let closing = false;

function hideModal() {
  const modal = getModal();
  if (!modal.classList.contains("is-open") || closing) return;
  closing = true;
  const card = modal.querySelector<HTMLElement>(".status-card");
  const backdrop = modal.querySelector<HTMLElement>(".status-backdrop");
  if (card) {
    card.style.transition = "opacity .15s ease, transform .15s ease";
    card.style.opacity = "0";
    card.style.transform = "translateY(8px) scale(.98)";
  }
  if (backdrop) {
    backdrop.style.transition = "opacity .15s ease";
    backdrop.style.opacity = "0";
  }
  setTimeout(() => {
    modal.classList.remove("is-open");
    if (card) {
      card.style.opacity = "";
      card.style.transform = "";
      card.style.transition = "";
    }
    if (backdrop) {
      backdrop.style.opacity = "";
      backdrop.style.transition = "";
    }
    closing = false;
    document.body.style.overflow = "";
  }, 150);
}

/** 绑定不随内容变化的监听器（仅一次）：关闭按钮、背景点击、内容区委托 */
function bindModalEvents(modal: HTMLElement) {
  if (modalEventsBound) return;
  modalEventsBound = true;

  modal.querySelector(".status-backdrop")?.addEventListener("click", hideModal);
  modal.querySelector(".status-close")?.addEventListener("click", hideModal);

  modal.addEventListener("click", (e) => {
    const target = e.target as Element | null;
    if (!target || !(target instanceof Element)) return;
    // 关闭 / 知道了（footer 按钮或无 footer 时无此按钮，保留兼容）
    if (target.closest("#status-btn-close")) {
      hideModal();
      return;
    }
    // 状态卡片：仅切换选中态，不立即应用
    const opt = target.closest<HTMLElement>(".status-option[data-status]");
    if (opt) {
      selectOption(opt.getAttribute("data-status") || "");
      return;
    }
    // 确认按钮：应用当前选中状态
    if (target.closest("#status-btn-confirm")) {
      void applyStatus();
    }
  });
}

/**
 * 渲染提示型模态框。
 * - unauthorized 或 network 且无 extraMsg → 统一提示「暂无权限切换」（无底部按钮，
 *   network 合并为"暂无权限"是产品决策：访客无法操作，网络失败也应引导登录）；
 * - network + 带 extraMsg（如 PUT 失败 HTTP 500）→ 展示具体错误信息 +「知道了」按钮。
 */
function showTipModal(reason: "unauthorized" | "network", extraMsg?: string) {
  const isPermission = reason === "unauthorized" || !extraMsg;
  const iconClass = isPermission
    ? "icon-[material-symbols--lock-rounded] text-(--primary)"
    : "icon-[mdi--cloud-off-outline] text-neutral-400";
  const text = isPermission
    ? "暂无权限切换，请先登录管理员账号后再操作。"
    : extraMsg;
  // 权限提示不显示任何底部按钮（右上角关闭即可）；错误提示保留「知道了」
  const footerHtml = isPermission
    ? ""
    : '<button type="button" class="status-btn-primary" id="status-btn-close">知道了</button>';
  showModal(
    `<div class="status-tip"><span class="status-tip-icon ${iconClass}"></span><p class="status-tip-text">${text}</p></div>`,
    footerHtml,
  );
}

/** 选择状态卡片：更新选中高亮，并将自定义文案输入框同步为对应状态的已有文案 */
function selectOption(key: string) {
  if (!getOption(key)) return;
  selectedKey = key;
  const modal = getModal();
  modal.querySelectorAll<HTMLElement>(".status-option").forEach((el) => {
    el.classList.toggle("is-active", el.getAttribute("data-status") === key);
  });
  const input = modal.querySelector<HTMLInputElement>("#status-text-input");
  if (input) input.value = getCustomText(key);
}

// ── 交互 ──────────────────────────────────────────────

/**
 * 自动清理"非当前状态"的文案残留（含历史嵌套 statusText 结构）并写回。
 * 配合 applyStatus 的清空逻辑，保证文案只属于当前状态：
 * 后台切换状态保存后，旧状态文案即使残留在配置里，打开模态框时也会被清空，
 * 前台不再显示旧文案（无需刷新、无需手动删除）。
 */
async function cleanupStaleStatusText(
  config: Record<string, unknown>,
  currentKey: string,
) {
  const sidebar = (config.sidebar ??= {}) as Record<string, unknown>;
  const profile = (sidebar.profile ??= {}) as Record<string, unknown>;
  const settings = (profile.statusSettings ??= {}) as Record<string, unknown>;
  let dirty = false;
  for (const o of STATUS_OPTIONS) {
    if (o.key === currentKey) continue;
    if (settings[o.key] !== undefined) {
      settings[o.key] = "";
      dirty = true;
    }
  }
  if (settings.statusText !== undefined) {
    delete settings.statusText;
    dirty = true;
  }
  if (!dirty) return;
  try {
    const resp = await fetch(getJsonConfigUrl(), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
      credentials: "same-origin",
    });
    if (resp.ok || resp.status === 204) {
      setThemeConfig(config);
    }
  } catch {
    // 清理失败不影响本次使用（下次打开再试）
  }
}

/** 点击状态表情：探测登录态后打开对应模态框 */
async function openStatusModal() {
  const result = await fetchJsonConfig();
  if (!result.ok) {
    showTipModal(result.reason);
    return;
  }
  pendingConfig = result.config;

  selectedKey = getCurrentStatus();

  // 自动清理非当前状态的文案残留（后台切换状态后留下的旧文案）
  await cleanupStaleStatusText(result.config, selectedKey);

  // 卡片网格：选中态由 is-active 控制，勾选标记常驻（CSS 显隐）；
  // card-hover-lift 接入后台「卡片悬浮效果」开关（hover 上移 + 主题色阴影）
  const itemsHtml = STATUS_OPTIONS.map((o) => {
    const active = o.key === selectedKey;
    return (
      `<button type="button" class="status-option card-hover-lift${active ? " is-active" : ""}" data-status="${o.key}">` +
      `<span class="status-option-icon ${o.iconClass} ${o.colorClass} ${o.animClass}"></span>` +
      `<span class="status-option-label">${getStatusText(o.key)}</span>` +
      `<span class="status-option-check icon-[material-symbols--check-rounded]"></span>` +
      `</button>`
    );
  }).join("");

  // 自定义文案输入框：跟随选中状态，留空用默认，限 10 字
  const customText = getCustomText(selectedKey);
  const textFieldHtml =
    `<div class="status-custom-text">` +
    `<input type="text" id="status-text-input" class="status-text-input" maxlength="10" ` +
    `placeholder="自定义文案（留空用默认，限 10 字）" value="${escapeHtml(customText)}">` +
    `</div>`;

  showModal(
    `<div class="status-options">${itemsHtml}</div>${textFieldHtml}`,
    '<button type="button" class="status-btn-primary" id="status-btn-confirm">确认切换</button>',
  );
}

/** 确认切换：将当前选中状态修改到缓存配置并 PUT 写回 */
async function applyStatus() {
  const key = selectedKey;
  if (!getOption(key)) return;
  // 无缓存（异常场景）时重新 GET
  if (!pendingConfig) {
    const result = await fetchJsonConfig();
    if (!result.ok) {
      showTipModal(result.reason);
      return;
    }
    pendingConfig = result.config;
  }

  const config = pendingConfig;
  const sidebar = (config.sidebar ??= {}) as Record<string, unknown>;
  const profile = (sidebar.profile ??= {}) as Record<string, unknown>;
  const statusSettings = (profile.statusSettings ??= {}) as Record<
    string,
    unknown
  >;
  statusSettings.status = key;
  // 自定义文案：只保留当前状态的文案，其余状态清空（与后台设置一致），
  // 同时清理历史嵌套 statusText 结构；避免切换状态后旧状态文案残留。
  const textInput =
    getModal().querySelector<HTMLInputElement>("#status-text-input");
  const text = textInput ? textInput.value.trim().slice(0, 10) : "";
  clearStatusTexts(statusSettings);
  statusSettings[key] = text;

  try {
    const resp = await fetch(getJsonConfigUrl(), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
      credentials: "same-origin",
    });
    if (resp.ok || resp.status === 204) {
      // 同步前端配置缓存，同会话内立即生效（无需刷新页面）
      setThemeConfig(config);
      pendingConfig = null;
      setBadgeStatus(key);
      hideModal();
      return;
    }
    if (resp.status === 401 || resp.status === 403) {
      showTipModal("unauthorized");
      return;
    }
    showTipModal("network", `保存失败（HTTP ${resp.status}），请稍后再试`);
  } catch {
    showTipModal("network");
  }
}

export function initProfileStatus(): void {
  if (bound) return;
  bound = true;

  // 首次加载同步气泡文案（后续由 Swup page:view 与 setBadgeStatus 维持）
  syncTooltip();

  // Swup 换页会重建 badge DOM，需重新同步气泡文案
  const bindSwup = () => {
    const swup = (
      window as unknown as {
        swup?: { hooks?: { on: (...args: unknown[]) => void } };
      }
    ).swup;
    if (
      swup?.hooks &&
      !(window as unknown as { __profileStatusSwupBound?: boolean })
        .__profileStatusSwupBound
    ) {
      (
        window as unknown as { __profileStatusSwupBound: boolean }
      ).__profileStatusSwupBound = true;
      swup.hooks.on("page:view", syncTooltip);
    }
  };
  if ((window as unknown as { swup?: { hooks?: unknown } }).swup?.hooks) {
    bindSwup();
  } else {
    document.addEventListener("swup:enable", bindSwup);
  }

  // document 级事件委托：badge 跨页面持久，一次绑定终身有效
  document.addEventListener("click", (e) => {
    const target = e.target as Element | null;
    if (!target || !(target instanceof Element)) return;

    const badge = target.closest(BADGE_SELECTOR);
    if (!badge) return;
    e.preventDefault();
    e.stopPropagation();

    const modal = getModal();
    bindModalEvents(modal);
    if (modal.classList.contains("is-open")) {
      hideModal();
    } else {
      void openStatusModal();
    }
  });
}
