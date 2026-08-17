// @ts-nocheck —— legacy 手写脚本迁入源码目录（保持 ES5 原样，不做类型改造）
// 心愿便签墙交互（Wishboard 插件适配）—— 便签墙视框风格
// 功能：卡片随机散布、拖动（限定画布内）、类型筛选、类型切换、
//       颜色选择、发布便签、AI 润色、字符计数、纪念日计数
(function () {
  var API = "/apis/anonymous.wishboard.aobp.cn/v1alpha1";
  // 便签颜色唯一来源：卡片背景与发布栏颜色圆点共用，避免多处色值不一致
  var CARD_COLORS = {
    green: "rgb(217,242,217)",
    yellow: "rgb(249,247,217)",
    purple: "rgb(229,215,255)",
    pink: "rgb(255,224,227)",
    blue: "rgb(199,240,255)",
    orange: "rgb(255,216,168)",
  };
  var currentFilter = "all";
  var selectedColor = "green";
  var currentType = "";
  var types = [];
  var zCounter = 200;
  var toastTimer = null;
  var initRetries = 0;

  var isMobile =
    /Android|iPhone|iPad|iPod|webOS/i.test(navigator.userAgent) ||
    window.innerWidth < 768;

  // DOM 引用缓存（Swup 换页后由 cacheElements 重新填充）
  var el = {};

  /* ===== i18n：读取 Layout.astro / wishes 页注入的 window.i18nResources ===== */
  function t(key, fallback) {
    var resources =
      typeof window !== "undefined" ? window.i18nResources || {} : {};
    var v = resources[key];
    return v && v.indexOf("#{") === -1 ? v : fallback;
  }

  // 消息参数替换：format("A {0} 天", days)
  function format(template) {
    var args = Array.prototype.slice.call(arguments, 1);
    return String(template).replace(/\{(\d+)\}/g, function (m, i) {
      return args[+i] != null ? args[+i] : m;
    });
  }

  function cacheElements() {
    el.board = document.getElementById("wishBoard");
    el.body = document.querySelector(".wish-board-body");
    el.toast = document.getElementById("wishToast");
    el.contentInput = document.getElementById("wishContentInput");
    el.nickInput = document.getElementById("wishNickInput");
    el.charCounter = document.getElementById("wishCharCounter");
    el.submitBtn = document.getElementById("wishSubmitBtn");
    el.polishBtn = document.getElementById("wishPolishBtn");
    el.typeBtn = document.getElementById("wishTypeBtn");
    el.typeLabel = document.getElementById("wishTypeLabel");
    el.colorPicker = document.getElementById("wishColorPicker");
    el.daysBadge = document.getElementById("wishDaysBadge");
    el.daysContent = document.getElementById("wishDaysContent");
    el.filterEmpty = document.getElementById("wishFilterEmpty");
  }

  // 从筛选标签读取类型列表（服务端渲染）
  function loadTypes() {
    types = [];
    document.querySelectorAll(".wish-tab").forEach(function (btn) {
      var slug = btn.getAttribute("data-wish-filter");
      var name = btn.getAttribute("data-wish-name");
      if (slug && slug !== "all" && name) {
        types.push({ slug: slug, displayName: name });
      }
    });
    return types;
  }

  /* ===== 初始化便签卡片（位置、颜色、拖动） ===== */
  function initCards() {
    var body = el.body;
    if (!body) return;
    var cards = body.querySelectorAll(".wish-card");
    if (cards.length === 0) return;
    var bw = body.clientWidth;
    var bh = body.clientHeight;
    // 画布尚未布局（CSS 未就绪/尺寸为 0）时延迟重试，避免卡片堆叠在左上角；
    // 最多重试 30 次（约 3 秒）后放弃，防止 CSS 资源缺失时无限循环
    if (bw < 100 || bh < 100) {
      if (initRetries++ < 30) {
        setTimeout(initCards, 100);
      }
      return;
    }
    initRetries = 0;
    var cw = 230;
    var margin = 16;
    var topStart = 70; // 避开顶部筛选标签
    var bottomReserve = 190; // 避开底部发布栏

    cards.forEach(function (card, i) {
      if (card.dataset.wishInit) return;
      card.dataset.wishInit = "true";

      var rotation = (Math.random() * 12 - 6).toFixed(2);
      var color = card.getAttribute("data-color") || "green";
      card.style.background = CARD_COLORS[color] || CARD_COLORS.green;

      if (!isMobile) {
        var left = margin + Math.random() * Math.max(bw - cw - margin * 2, 10);
        var top =
          topStart + Math.random() * Math.max(bh - bottomReserve - cw, 80);
        card.style.left = left + "px";
        card.style.top = top + "px";
        card.style.zIndex = zCounter++;
        card.style.transform = "rotate(" + rotation + "deg)";
        initDrag(card);
        card.addEventListener("mousedown", function () {
          card.style.zIndex = ++zCounter;
        });
      } else {
        // 移动端：由 CSS flex 布局，仅添加轻微旋转
        card.style.transform = "rotate(" + rotation + "deg)";
      }
    });
  }

  /* ===== 拖动（限定画布内） ===== */
  function initDrag(card) {
    var header = card.querySelector(".wish-card-header");
    if (!header || header.dataset.wishDragBound) return;
    header.dataset.wishDragBound = "true";
    var body = el.body;
    var startX,
      startY,
      origX,
      origY,
      dragging = false;

    header.addEventListener("mousedown", function (e) {
      if (e.button !== 0) return;
      e.preventDefault();
      dragging = true;
      card.classList.add("dragging");
      card.style.zIndex = ++zCounter;
      startX = e.clientX;
      startY = e.clientY;
      origX = card.offsetLeft;
      origY = card.offsetTop;

      function onMove(ev) {
        if (!dragging) return;
        var nx = origX + ev.clientX - startX;
        var ny = origY + ev.clientY - startY;
        var maxLeft = Math.max(body.clientWidth - card.offsetWidth, 0);
        var maxTop = Math.max(body.clientHeight - card.offsetHeight, 0);
        nx = Math.max(0, Math.min(maxLeft, nx));
        ny = Math.max(0, Math.min(maxTop, ny));
        card.style.left = nx + "px";
        card.style.top = ny + "px";
      }
      function onUp() {
        dragging = false;
        card.classList.remove("dragging");
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
      }
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    });
  }

  /* ===== 筛选 ===== */
  function filterCards() {
    var body = el.body;
    if (!body) return;
    var cards = body.querySelectorAll(".wish-card");
    var visible = 0;
    cards.forEach(function (card) {
      var type = card.getAttribute("data-wish-type");
      var show = currentFilter === "all" || type === currentFilter;
      card.style.display = show ? "" : "none";
      if (show) visible++;
    });
    if (el.filterEmpty) {
      el.filterEmpty.style.display = visible === 0 ? "block" : "none";
    }
  }

  function initTabs() {
    var tabs = document.querySelectorAll(".wish-tab");
    if (tabs.length === 0) return;
    tabs.forEach(function (tab) {
      if (tab.dataset.wishFilterBound) return;
      tab.dataset.wishFilterBound = "true";
      tab.addEventListener("click", function () {
        document.querySelectorAll(".wish-tab").forEach(function (x) {
          x.classList.remove("active");
        });
        tab.classList.add("active");
        currentFilter = tab.getAttribute("data-wish-filter") || "all";
        filterCards();
      });
    });
  }

  /* ===== 类型切换（发布栏） ===== */
  function initTypeToggle() {
    var btn = el.typeBtn;
    var label = el.typeLabel;
    if (!btn || !label) return;
    if (btn.dataset.wishTypeBound) return;
    btn.dataset.wishTypeBound = "true";
    if (types.length > 0) {
      currentType = types[0].slug;
      label.textContent = types[0].displayName;
    }
    btn.addEventListener("click", function () {
      if (types.length === 0) return;
      var idx = -1;
      for (var i = 0; i < types.length; i++) {
        if (types[i].slug === currentType) {
          idx = i;
          break;
        }
      }
      var next = types[(idx + 1) % types.length];
      currentType = next.slug;
      label.textContent = next.displayName;
    });
  }

  /* ===== 颜色选择（圆点背景色由 CSS 定义） ===== */
  function initColorPicker() {
    var picker = el.colorPicker;
    if (!picker) return;
    if (picker.dataset.wishColorBound) return;
    picker.dataset.wishColorBound = "true";
    picker.querySelectorAll(".wish-bar-color").forEach(function (dot) {
      dot.addEventListener("click", function () {
        picker.querySelectorAll(".wish-bar-color").forEach(function (x) {
          x.classList.remove("active");
        });
        dot.classList.add("active");
        selectedColor = dot.getAttribute("data-wish-color") || "green";
      });
    });
  }

  /* ===== 字符计数 ===== */
  function updateCharCounter() {
    var input = el.contentInput;
    var counter = el.charCounter;
    if (!input || !counter) return;
    var max = parseInt(input.getAttribute("maxlength") || "200", 10);
    var len = input.value.length;
    counter.textContent = len + "/" + max;
    counter.classList.toggle("over", len > max);
  }

  function initCharCounter() {
    var input = el.contentInput;
    if (!input) return;
    if (input.dataset.wishCharBound) return;
    input.dataset.wishCharBound = "true";
    input.addEventListener("input", updateCharCounter);
    updateCharCounter();
  }

  /* ===== 发布便签 ===== */
  function initSubmit() {
    var btn = el.submitBtn;
    var input = el.contentInput;
    var nick = el.nickInput;
    if (!btn || !input) return;
    if (btn.dataset.wishSubmitBound) return;
    btn.dataset.wishSubmitBound = "true";

    function doSubmit() {
      var content = input.value.trim();
      var nickname = nick ? nick.value.trim() : "";
      var max = parseInt(input.getAttribute("maxlength") || "200", 10);
      if (!content) {
        toast(t("page.wishes.toastEmpty", "写点什么吧"));
        return;
      }
      if (content.length > max) {
        toast(
          format(t("page.wishes.toastTooLong", "内容超过 {0} 字限制"), max),
        );
        return;
      }
      var originText = btn.textContent;
      btn.disabled = true;
      btn.textContent = t("page.wishes.toastSubmitting", "发布中...");
      fetch(API + "/wishes/-/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: content,
          nickname: nickname || t("page.wishes.anonymous", "匿名"),
          color: selectedColor,
          type: currentType || "treehole",
          anonymous: !nickname,
        }),
      })
        .then(function (r) {
          return r.json().then(function (d) {
            return { ok: r.ok, data: d };
          });
        })
        .then(function (res) {
          if (res.ok) {
            toast(
              res.data.message || t("page.wishes.toastSubmitted", "发布成功"),
            );
            input.value = "";
            updateCharCounter();
            if (res.data.status === "approved") {
              setTimeout(function () {
                location.reload();
              }, 800);
            }
          } else {
            toast(
              res.data.error || t("page.wishes.toastSubmitFail", "提交失败"),
            );
          }
        })
        .catch(function () {
          toast(t("page.wishes.toastNetworkError", "网络错误"));
        })
        .finally(function () {
          btn.disabled = false;
          btn.textContent = originText;
        });
    }

    btn.addEventListener("click", doSubmit);
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        doSubmit();
      }
    });
  }

  /* ===== AI 润色 ===== */
  function initPolish() {
    var btn = el.polishBtn;
    var input = el.contentInput;
    var nick = el.nickInput;
    if (!btn || !input) return;
    if (btn.dataset.wishPolishBound) return;
    btn.dataset.wishPolishBound = "true";
    btn.addEventListener("click", function () {
      var content = input.value.trim();
      if (!content) {
        toast(t("page.wishes.toastPolishFirst", "先写点内容再润色"));
        return;
      }
      var originText = btn.textContent;
      btn.disabled = true;
      btn.textContent = t("page.wishes.toastPolishing", "润色中...");
      fetch(API + "/wishes/-/polish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: content,
          nickname: nick
            ? nick.value.trim()
            : t("page.wishes.anonymous", "匿名"),
        }),
      })
        .then(function (r) {
          return r.json().then(function (d) {
            return { ok: r.ok, data: d };
          });
        })
        .then(function (res) {
          if (!res.ok) {
            toast(
              res.data.error || t("page.wishes.toastPolishFail", "润色失败"),
            );
          } else if (res.data.polished) {
            input.value = res.data.polished;
            updateCharCounter();
            toast(t("page.wishes.toastPolishDone", "润色完成"));
          }
        })
        .catch(function () {
          toast(t("page.wishes.toastPolishFail", "润色失败"));
        })
        .finally(function () {
          btn.disabled = false;
          btn.textContent = originText;
        });
    });
  }

  /* ===== 纪念日计数 ===== */
  function initDaysCounter() {
    var badge = el.daysBadge;
    if (!badge) return;
    var dateStr = badge.getAttribute("data-date");
    var nameA = badge.getAttribute("data-name-a") || "";
    var nameB = badge.getAttribute("data-name-b") || "";
    if (!dateStr) return;
    var start = new Date(dateStr);
    if (isNaN(start.getTime())) return;
    var days = Math.floor((Date.now() - start.getTime()) / 86400000);
    var content = el.daysContent;
    if (!content) return;
    function esc(s) {
      if (!s) return "";
      var d = document.createElement("div");
      d.textContent = s;
      return d.innerHTML;
    }
    var text;
    if (nameA && nameB) {
      text = format(
        t("page.wishes.daysTogetherWith", "{0} & {1} 在一起 {2} 天"),
        esc(nameA),
        esc(nameB),
        '<span class="wish-days-num">' + days + "</span>",
      );
    } else {
      text = format(
        t("page.wishes.daysTogether", "在一起 {0} 天"),
        '<span class="wish-days-num">' + days + "</span>",
      );
    }
    content.innerHTML = text;
  }

  /* ===== Toast ===== */
  function toast(msg) {
    var tEl = el.toast;
    if (!tEl) return;
    tEl.textContent = msg;
    tEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      tEl.classList.remove("show");
    }, 2500);
  }

  /* ===== 主初始化 ===== */
  function init() {
    cacheElements();
    loadTypes();
    initCards();
    initTabs();
    initColorPicker();
    initSubmit();
    initPolish();
    initTypeToggle();
    initCharCounter();
    initDaysCounter();
    filterCards();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
  // 换页后重新初始化由 SwupScriptsPlugin 重执行覆盖；
  // 原 swup:contentReplaced 监听删除（v3 事件名从未触发）。
})();
