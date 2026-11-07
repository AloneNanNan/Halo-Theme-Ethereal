// 弹层滚动锁：锁 <html>，不要锁 <body>（原因与复现条件见 AGENTS「滚动锁与弹层」：
// 自定义滚动条接管后 html 才是滚动视口，锁 body 会让 body 自成滚动容器 → 背景回顶）。
// 用法：打开弹层前 lockPageScroll()，关闭后 unlockPageScroll()；
// Swup 换页调 resetPageScrollLock()，避免残留锁死滚动。
const LOCK_CLASS = "modal-scroll-locked";

let locked = false;

export function lockPageScroll(): void {
  if (locked) return;
  locked = true;
  document.documentElement.classList.add(LOCK_CLASS);
}

export function unlockPageScroll(): void {
  if (!locked) return;
  locked = false;
  document.documentElement.classList.remove(LOCK_CLASS);
}

/** 换页复位：弹层随页面失效，直接清掉锁（不依赖调用方成对 unlock） */
export function resetPageScrollLock(): void {
  locked = false;
  document.documentElement.classList.remove(LOCK_CLASS);
}
