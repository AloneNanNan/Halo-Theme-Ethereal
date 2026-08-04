// 导航栏面板切换：document 级事件委托，替代原先按钮上的内联 onclick（CSP 友好）。
// 面板 id 由开关按钮 id 推导；导航栏位于 Swup 容器之外，脚本只执行一次（defer），
// window 标志仅作防重复绑定的兜底（与 BackToTop/NavMenuPanel 的委托写法保持一致）。
if (!window.__navbarPanelToggleBound) {
  window.__navbarPanelToggleBound = true;
  document.addEventListener("click", function (e) {
    var target =
      e.target && e.target.closest
        ? e.target.closest("#display-settings-switch, #nav-menu-switch")
        : null;
    if (!target) return;
    var panelId =
      target.id === "display-settings-switch"
        ? "display-setting"
        : "nav-menu-panel";
    var panel = document.getElementById(panelId);
    if (panel) panel.classList.toggle("float-panel-closed");
  });
}

// 移动端导航栏子菜单交互
(function () {
  if (!window.matchMedia("(pointer: coarse)").matches) return;

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
