// @ts-nocheck —— execCommand 剪贴板兜底已被 TS 标记 deprecated（会让 astro check 失败），
// 故与其它资产脚本一样跳过类型检查
// 经典浏览器脚本（SwupScriptsPlugin 换页重执行，data-copy-bound 幂等）
// 瞬间卡片：复制链接按钮（MomentCard.astro 的 .moment-copy-btn）
//
// 契约：
// - 目标地址由 data-copy-path（Thymeleaf 生成的相对路径，如 /moments/xxx）在点击时
//   解析为绝对地址：不依赖站点域名变量，任意域名 / 子路径部署都正确；
// - 反馈：按钮加 .is-copied（链环图标切对勾，CSS 在 components.css，1.5s 后移除）；
// - 幂等：data-copy-bound 守卫；Swup 换页后由 ScriptsPlugin 重执行重新绑定。
(function () {
  function fallbackCopy(text: string): boolean {
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.top = "0";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    var ok = false;
    try {
      ok = document.execCommand("copy");
    } catch (e) {
      ok = false;
    }
    document.body.removeChild(ta);
    return ok;
  }

  function copyText(text: string): Promise<void> {
    // 非安全上下文（http 内网站点）没有 navigator.clipboard，退回 execCommand
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    }
    return fallbackCopy(text)
      ? Promise.resolve()
      : Promise.reject(new Error("copy failed"));
  }

  function flashCopied(btn: HTMLElement) {
    btn.classList.add("is-copied");
    window.setTimeout(function () {
      btn.classList.remove("is-copied");
    }, 1500);
  }

  function init() {
    document
      .querySelectorAll<HTMLButtonElement>(".moment-copy-btn")
      .forEach(function (btn) {
        if (btn.dataset.copyBound) return;
        btn.dataset.copyBound = "true";
        btn.addEventListener("click", function () {
          var path = btn.getAttribute("data-copy-path") || "";
          var url = path
            ? new URL(path, window.location.href).href
            : window.location.href;
          copyText(url)
            .then(function () {
              flashCopied(btn);
            })
            .catch(function (e) {
              console.warn("[MomentCopy] 复制失败", e);
            });
        });
      });
  }

  init();
})();
