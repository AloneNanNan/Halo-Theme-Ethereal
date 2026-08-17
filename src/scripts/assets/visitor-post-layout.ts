// @ts-nocheck —— legacy 手写脚本迁入源码目录（保持 ES5 原样，不做类型改造）
// 访客文章布局覆盖（显示设置面板「列表/网格」切换）
// 同步脚本（无 defer/async）：在 PostList 容器解析后立即执行，首帧绘制前完成换类；
// Swup 换页后由 SwupScriptsPlugin 重执行（同 post-list-layout.js / collapse.js）。
// 执行顺序约定：必须先于 post-list-layout.js（PostList.astro 中标签顺序保证），
// 使瀑布流初始化直接读取覆盖后的布局类。
(function () {
  var container = document.getElementById("post-list-container");
  if (!container) return;

  // 记录服务端渲染的初始布局，供面板「恢复默认」还原；
  // 已记录则跳过（防止同容器重复执行时把覆盖后的类误当默认值）
  if (!container.dataset.serverLayout) {
    container.dataset.serverLayout = container.classList.contains(
      "post-grid-mode",
    )
      ? "grid"
      : "list";
  }

  // 开关关闭（或总开关关闭）时忽略并清理访客选择，与 fixed 色调语义一致
  var carrier = document.getElementById("config-carrier");
  var switchable =
    (!carrier || carrier.dataset.visitorEnable !== "false") &&
    (!carrier || carrier.dataset.visitorLayout !== "false");
  if (!switchable) {
    localStorage.removeItem("postListLayout");
    return;
  }

  var mode = localStorage.getItem("postListLayout");
  if (mode !== "list" && mode !== "grid") return;
  if (mode === container.dataset.serverLayout) return;

  container.classList.toggle("post-grid-mode", mode === "grid");
  container.classList.toggle("post-list-mode", mode === "list");

  // 布局类变化后触发瀑布流重排/复位（post-list-layout.js 暴露的入口，
  // 首载时其尚未执行、由它自己的 init 读取已覆盖的类，此处调用为空操作）
  if (typeof window.__postListRelayout === "function") {
    window.__postListRelayout();
  }
})();

// 瀑布流覆盖：data-masonry 属性跟随访客选择（仅网格布局下由瀑布流脚本生效，
// 列表布局下该属性无效果）。开关关闭时忽略并清理，与其它访客键语义一致。
// 瀑布流随「卡片样式切换」开关联动（同卡片样式区内的其它开关）。
(function () {
  var container = document.getElementById("post-list-container");
  if (!container) return;
  var carrier = document.getElementById("config-carrier");
  var switchable =
    (!carrier || carrier.dataset.visitorEnable !== "false") &&
    (!carrier || carrier.dataset.visitorCardStyle !== "false");
  if (!switchable) {
    localStorage.removeItem("postListMasonry");
    return;
  }
  var masonry = localStorage.getItem("postListMasonry");
  if (masonry === "true" || masonry === "false") {
    container.setAttribute("data-masonry", masonry);
  }
})();
