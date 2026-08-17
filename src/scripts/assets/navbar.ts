// @ts-nocheck —— legacy 手写脚本迁入源码目录（保持 ES5 原样，不做类型改造）
// 导航栏面板切换：document 级事件委托，替代原先按钮上的内联 onclick（CSP 友好）。
// 移动端菜单支持两种模式（布局设置 → 菜单栏设置 → 菜单样式）：
//  - drawer（抽屉）：右侧滑出圆角卡片，子菜单平铺；开关由 body.nav-menu-open 驱动
//  - accordion（手风琴，默认）：导航栏下方下拉面板，子菜单手风琴折叠；
//    开关切换 #nav-menu-panel 的 float-panel-closed 类（与原版一致）
// 模式由 DOM 判定：#nav-menu-root 存在即为抽屉模式。
// 导航栏位于 Swup 容器之外，脚本只执行一次（defer），window 标志防重复绑定。
if (!window.__navbarPanelToggleBound) {
  window.__navbarPanelToggleBound = true;

  // ===== 模式判定 =====
  // 模式由后台配置决定、页面加载后不变，缓存一次避免每次点击查 DOM
  var drawerMode = !!document.getElementById("nav-menu-root");

  // ===== 抽屉模式逻辑 =====
  // 把整个抽屉 root（#nav-menu-root，内含遮罩 + 面板）挂到 body 直接子级。
  // 与模态框（外链跳转/友情链接）同款：天然位于 OverlayScrollbars 滚动容器
  // 之外，backdrop-filter 按真实视口采样。
  // 关键：页面加载（脚本执行）时立即挂载，而不是首次打开时才挂载——若首次
  // 打开才 appendChild 移动 root，同帧内"移动 DOM + 触发 CSS 动画"会让浏览器
  // 对刚插入的子树延迟启动动画（首次打开生硬无动画，二次正常）。
  var navPanelRootMoved = false;

  function ensureNavPanelInBody() {
    var root = document.getElementById("nav-menu-root");
    if (!root) return;
    // 仅在 root 不在 body 直接子级时才移动：appendChild 对已在目标下的节点
    // 不是"无操作"而是"移动到末尾"——每次无条件 appendChild 会导致每次移动
    // DOM，中断菜单项 CSS 动画（表现为完全无动画）
    if (root.parentElement !== document.body) {
      document.body.appendChild(root);
    }
    if (!navPanelRootMoved) {
      navPanelRootMoved = true;
      // OS 懒加载初始化（等入场动画结束）可能晚于脚本执行，挂载时会包裹
      // body 子元素；监听 body childList 变化，把 root 移回 body 直接子级。
      // OS 只在初始化时包裹一次，root 移回后即可断开，避免长期监听。
      var observer = new MutationObserver(function () {
        if (root.parentElement !== document.body) {
          document.body.appendChild(root);
          observer.disconnect();
        }
      });
      observer.observe(document.body, { childList: true });
    }
  }

  // 切换抽屉模式开关；滚动锁定与模态框同款（仅 body overflow hidden）
  function setNavMenuOpen(open) {
    if (open) {
      // 顺序关键：先挂载 root 到 body 再添加 nav-menu-open 触发动画——
      // 若同帧"移动 DOM + 触发 CSS 动画"，浏览器对刚插入的子树会延迟启动
      // 动画（首次打开生硬无动画、二次正常）。root 已在 body 时无副作用。
      ensureNavPanelInBody();
    }
    document.body.classList.toggle("nav-menu-open", open);
    if (open) {
      document.body.style.overflow = "hidden";
      // 打开瞬间为菜单项设置递增 animation-delay，配合 CSS 渐入动画逐项浮现
      var panel = document.getElementById("nav-menu-panel");
      if (panel) {
        var links = panel.querySelectorAll(".nav-drawer-link");
        links.forEach(function (link, i) {
          link.style.animationDelay = i * 35 + "ms";
        });
      }
    } else {
      document.body.style.overflow = "";
    }
  }

  // ===== 手风琴模式逻辑 =====
  // 切换面板开关（float-panel-closed），与原版 navbar.js 一致
  function toggleAccordionPanel(force) {
    var panel = document.getElementById("nav-menu-panel");
    if (!panel) return;
    if (typeof force === "boolean") {
      panel.classList.toggle("float-panel-closed", !force);
    } else {
      panel.classList.toggle("float-panel-closed");
    }
  }

  // 手风琴子菜单切换（同时只展开一个），逻辑与原版 NavMenuPanel 内联脚本一致
  function toggleSubmenu(buttonEl, submenuId) {
    var submenu = document.getElementById(submenuId);
    if (!submenu) return;
    var arrow = buttonEl.querySelector("span");
    var isExpanded = !submenu.classList.contains("hidden");

    // 收起其他已展开的子菜单
    var panel = document.getElementById("nav-menu-panel");
    if (panel) {
      var openSubmenus = panel.querySelectorAll(
        '[id^="submenu-"]:not(.hidden)',
      );
      openSubmenus.forEach(function (openSm) {
        if (openSm.id !== submenuId) {
          openSm.classList.add("hidden");
          var flexDiv = openSm.previousElementSibling;
          if (flexDiv) {
            var toggleBtn = flexDiv.querySelector(".submenu-toggle");
            if (toggleBtn) {
              var btnArrow = toggleBtn.querySelector("span");
              if (btnArrow) btnArrow.classList.remove("rotate-90");
              toggleBtn.setAttribute("aria-expanded", "false");
            }
          }
        }
      });
    }

    submenu.classList.toggle("hidden");
    if (arrow) arrow.classList.toggle("rotate-90");
    buttonEl.setAttribute("aria-expanded", String(!isExpanded));
  }

  // 计算当前路径下应高亮的抽屉菜单链接（仅抽屉模式有 data-nav-link）
  function updateNavMenuActive() {
    var panel = document.getElementById("nav-menu-panel");
    if (!panel) return;
    var path = window.location.pathname;
    var links = panel.querySelectorAll("a[data-nav-link]");
    links.forEach(function (link) {
      var href = link.getAttribute("href");
      var match = false;
      if (href) {
        // 跳过占位链接（#、纯锚点）与空链接
        if (href !== "#" && href.charAt(0) !== "#") {
          try {
            match = new URL(href, window.location.origin).pathname === path;
          } catch (e) {
            match = false;
          }
        }
      }
      link.classList.toggle("nav-drawer-link-active", match);
    });
  }

  // ===== 统一事件委托 =====
  // 页面加载即挂载 root（抽屉模式）：此时菜单未打开、无动画在播放，
  // 移动 DOM 无副作用；OS 懒加载若把 root 包进滚动容器，MutationObserver 兜底移回。
  // 这样首次打开时 root 已在 body 直接子级，无 DOM 移动，渐入动画正常。
  ensureNavPanelInBody();

  document.addEventListener("click", function (e) {
    var target =
      e.target && e.target.closest
        ? e.target.closest("#display-settings-switch, #nav-menu-switch")
        : null;
    if (target) {
      if (target.id === "display-settings-switch") {
        var panel = document.getElementById("display-setting");
        if (panel) panel.classList.toggle("float-panel-closed");
      } else if (drawerMode) {
        // 汉堡按钮：切换抽屉
        setNavMenuOpen(!document.body.classList.contains("nav-menu-open"));
      } else {
        // 汉堡按钮：切换手风琴面板
        toggleAccordionPanel();
      }
      return;
    }

    // 手风琴模式：子菜单展开按钮（先于外部关闭判断处理）
    if (!drawerMode) {
      var toggleBtn =
        e.target && e.target.closest
          ? e.target.closest(".submenu-toggle")
          : null;
      if (toggleBtn) {
        var submenuId = toggleBtn.getAttribute("data-submenu-id");
        if (submenuId) toggleSubmenu(toggleBtn, submenuId);
        return;
      }
      // 手风琴模式：点击面板内链接后关闭面板
      if (e.target && e.target.closest("#nav-menu-panel a")) {
        toggleAccordionPanel(false);
        return;
      }
      // 手风琴模式：点击面板外关闭（替代 app.ts 的 setClickOutsideToClose）。
      // 注：此处 e.target 必非汉堡按钮（上方已 return），无需再排除
      if (
        e.target &&
        e.target.closest &&
        !e.target.closest("#nav-menu-panel")
      ) {
        var ap = document.getElementById("nav-menu-panel");
        if (ap && !ap.classList.contains("float-panel-closed")) {
          toggleAccordionPanel(false);
        }
      }
      return;
    }

    // 抽屉模式：点击遮罩关闭
    if (e.target && e.target.closest && e.target.closest("#nav-menu-overlay")) {
      setNavMenuOpen(false);
      return;
    }
    // 抽屉模式：点击抽屉内关闭按钮或菜单链接关闭
    if (
      e.target &&
      e.target.closest &&
      e.target.closest("#nav-menu-close, #nav-menu-panel a[data-nav-link]")
    ) {
      setNavMenuOpen(false);
    }
  });

  // 初始高亮（抽屉模式才有 data-nav-link，手风琴模式无匹配，天然跳过）
  if (drawerMode) updateNavMenuActive();

  // ESC 关闭抽屉
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && drawerMode) {
      if (document.body.classList.contains("nav-menu-open")) {
        setNavMenuOpen(false);
      }
    }
  });

  // 换页后刷新抽屉高亮并收起抽屉：Swup 初始化完成后绑定（与 app.ts 同一模式）
  function bindSwupHooks() {
    if (!window.swup || !window.swup.hooks) return;
    window.swup.hooks.on("page:view", function () {
      if (drawerMode) {
        updateNavMenuActive();
        setNavMenuOpen(false);
      }
    });
  }
  if (window.swup && window.swup.hooks) {
    bindSwupHooks();
  } else {
    document.addEventListener("swup:enable", bindSwupHooks);
  }
}

// 桌面导航在触屏设备上的子菜单展开（与移动/平板抽屉菜单无关）。
// 断点与 Navbar.astro 的桌面菜单栏一致（lg，≥1024px）：
// <1024px 时桌面导航栏被 invisible 隐藏，无需此交互，显式跳过避免误判
(function () {
  if (!window.matchMedia("(pointer: coarse)").matches) return;
  if (window.matchMedia("(max-width: 1023px)").matches) return;

  function closeAll() {
    document.querySelectorAll(".group.submenu-open").forEach(function (g) {
      g.classList.remove("submenu-open");
    });
  }

  // window + capture 级别拦截，在 Swup 之前执行
  window.addEventListener(
    "click",
    function (e) {
      // 子菜单内的链接正常跳转，只关闭面板
      if (e.target.closest(".submenu-panel")) {
        closeAll();
        return;
      }

      // 检查是否点击了导航栏中有子菜单的一级链接
      var group = e.target.closest("#navbar .group");
      if (!group) {
        closeAll();
        return;
      }
      if (!group.querySelector(":scope > .submenu-panel")) return;

      // 拦截：阻止跳转和 Swup 处理
      e.preventDefault();
      e.stopImmediatePropagation();

      var isOpen = group.classList.contains("submenu-open");
      closeAll();
      if (!isOpen) group.classList.add("submenu-open");
    },
    { capture: true },
  );
})();
