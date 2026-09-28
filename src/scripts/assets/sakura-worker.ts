// 樱花特效 Worker：在 Dedicated Worker 内用 OffscreenCanvas 绘制樱花，
// 绘制循环脱离主线程（换页 / 滚动时主线程阻塞不导致掉帧）。
//
// 构建产物 public/assets/sakura-worker.js（源码在 src/scripts/assets/，
// esbuild 编译为 IIFE 经典脚本，主脚本 sakura.ts 以经典 Worker 方式加载）。
// 通信协议（与主脚本约定）：
//   主 → Worker：{ type:"init", config, canvas, width, height, imgUrl }
//              / { type:"resize", width, height }
//              / { type:"visibilitychange", hidden }
//   Worker → 主：{ type:"error", message }
// 停止不走消息：主线程 stop() 直接 terminate，Worker 资源的回收由 terminate 承担。
import type { SakuraConfig } from "./_sakura-config";
import {
  createSakuraList,
  type Sakura,
  type SakuraContext,
  type SakuraViewport,
} from "./_sakura-core";

/** Worker 作用域收窄（DOM lib 下 self 类型为 Window，postMessage 签名与 Worker 不同） */
const workerScope = self as unknown as {
  postMessage: (message: unknown, transfer?: Transferable[]) => void;
  addEventListener: (
    type: "message",
    listener: (event: MessageEvent) => void,
  ) => void;
};

interface SakuraInitMessage {
  type: "init";
  config: SakuraConfig;
  canvas: OffscreenCanvas;
  width: number;
  height: number;
  imgUrl: string;
}
interface SakuraResizeMessage {
  type: "resize";
  width: number;
  height: number;
}
interface SakuraVisibilityMessage {
  type: "visibilitychange";
  hidden: boolean;
}
type SakuraInboundMessage =
  SakuraInitMessage | SakuraResizeMessage | SakuraVisibilityMessage;

/* ── 模块状态 ── */
let canvas: OffscreenCanvas | null = null;
let ctx: SakuraContext | null = null;
let sakuraList: Sakura[] = [];
let rafId: number | null = null;
let img: ImageBitmap | null = null;
let isRunning = false;
let isHidden = false; // 页面可见性：隐藏时暂停绘制循环（主线程通过 visibilitychange 消息同步）
const viewport: SakuraViewport = { width: 0, height: 0 };

function reportError(scope: string, err: unknown): void {
  const message =
    err instanceof Error
      ? `${scope}: ${err.message}`
      : `${scope}: ${String(err)}`;
  workerScope.postMessage({ type: "error", message });
}

function cancelAnimation(): void {
  if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
}

function clearCanvas(): void {
  if (ctx && canvas) ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function startAnimation(): void {
  const c = ctx;
  const cv = canvas;
  if (!c || !cv || isHidden || rafId !== null) return;
  const loop = (): void => {
    try {
      c.clearRect(0, 0, cv.width, cv.height);
      for (let i = 0; i < sakuraList.length; i++) {
        sakuraList[i].update();
        sakuraList[i].draw(c);
      }
      rafId = requestAnimationFrame(loop);
    } catch (err) {
      reportError("animate", err);
      cancelAnimation();
    }
  };
  rafId = requestAnimationFrame(loop);
}

function cleanup(): void {
  cancelAnimation();
  clearCanvas();
  if (img) {
    // ImageBitmap 持有位图资源，需显式释放；重复调用可能抛错，忽略
    try {
      img.close();
    } catch {
      /* 忽略 */
    }
    img = null;
  }
  sakuraList = [];
  ctx = null;
  canvas = null;
  isRunning = false;
}

async function loadImage(url: string): Promise<ImageBitmap> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`图片加载失败: ${response.status} ${response.statusText}`);
  }
  const blob = await response.blob();
  return createImageBitmap(blob);
}

async function handleInit(msg: SakuraInitMessage): Promise<void> {
  try {
    // 用局部常量贯穿初始化：模块状态可能被其它消息路径改写，局部引用更稳
    const cfg = msg.config;
    const cv = msg.canvas;
    canvas = cv;
    viewport.width = msg.width;
    viewport.height = msg.height;
    cv.width = viewport.width;
    cv.height = viewport.height;
    const c = cv.getContext("2d");
    if (!c) throw new Error("无法获取 OffscreenCanvas 2D 上下文");
    ctx = c;

    const image = await loadImage(msg.imgUrl);
    img = image;

    sakuraList = createSakuraList(cfg, image, viewport, c);
    isRunning = true;
    if (!isHidden) startAnimation();
  } catch (err) {
    reportError("init", err);
    // 清理已分配资源（尤其是 ImageBitmap）；主线程收到 error 后会 stop() terminate
    cleanup();
  }
}

async function handleMessage(msg: SakuraInboundMessage): Promise<void> {
  switch (msg.type) {
    case "init":
      await handleInit(msg);
      break;
    case "resize":
      viewport.width = msg.width;
      viewport.height = msg.height;
      if (canvas) {
        canvas.width = viewport.width;
        canvas.height = viewport.height;
      }
      break;
    case "visibilitychange":
      isHidden = msg.hidden;
      if (isHidden) {
        cancelAnimation();
      } else if (isRunning && rafId === null) {
        startAnimation();
      }
      break;
    default:
      break;
  }
}

workerScope.addEventListener("message", (e: MessageEvent) => {
  void handleMessage(e.data as SakuraInboundMessage);
});
