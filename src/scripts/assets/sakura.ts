// 樱花特效主脚本：优先 OffscreenCanvas + Web Worker（绘制循环脱离主线程，
// 换页 / 滚动时主线程阻塞不导致掉帧），不支持时回退主线程 Canvas 2D。
//
// 构建产物 public/assets/sakura.js（源码在 src/scripts/assets/，esbuild 编译，勿手改产物）。
// 开关链路（与 setting-utils.ts / Layout.astro 启动脚本同步）：
//   · 后台「样式开关 → 全局樱花特效」= 全站默认值（ConfigCarrier data-sakura-default）；
//   · 访客在显示设置面板切换（localStorage 键 sakuraEnabled），
//     setSakuraEnabled / resetSakura 派发 sakuraToggle 事件实时启停本脚本；
//   · 「访客样式切换 → 特效切换」关闭时忽略 localStorage，跟随全局默认。
// 图片 / Worker 路径从本脚本自身 src 推导（构建后自动带 /themes/Ethereal 前缀，勿硬编码），
// 并把脚本 URL 的查询串（?v=版本号）透传下去做缓存失效，主题升级换图 / 换 worker 后不吃旧缓存。
// Swup 换页会克隆重跑本脚本：window 守卫保证只初始化一次；canvas 动态挂 body
// （Swup 容器外），动画跨页持续。

import { SAKURA_CONFIG } from "./_sakura-config";
import {
  createSakuraList,
  type Sakura,
  type SakuraContext,
  type SakuraViewport,
} from "./_sakura-core";

interface SakuraManagerLike {
  init: () => void;
  stop: () => void;
  getIsRunning: () => boolean;
}

/** 脚本自身 URL：Swup 克隆重跑时 currentScript 仍指向被执行的脚本；按 src 查找作兜底 */
const currentScript =
  (document.currentScript as HTMLScriptElement | null) ??
  document.querySelector<HTMLScriptElement>('script[src*="/assets/sakura.js"]');
const scriptUrl = currentScript?.src ?? "";
const queryIndex = scriptUrl.indexOf("?");
const scriptQuery = queryIndex >= 0 ? scriptUrl.slice(queryIndex) : "";
const baseDir = scriptUrl ? scriptUrl.replace(/[^/]*$/, "") : "";
const IMG_URL = `${baseDir}images/effects/sakura.png${scriptQuery}`;
const WORKER_URL = `${baseDir}sakura-worker.js${scriptQuery}`;

/* ── 开关判定（与 setting-utils.ts 的 getStoredSakuraEnabled 语义一致：
 *    不可切换时忽略 localStorage，跟随全局默认） ── */

function getCarrierData(): DOMStringMap {
  return document.getElementById("config-carrier")?.dataset ?? {};
}

function getDefaultEnabled(): boolean {
  return getCarrierData().sakuraDefault === "true";
}

function isVisitorSwitchable(): boolean {
  const d = getCarrierData();
  return d.visitorEnable !== "false" && d.visitorEffects !== "false";
}

function getEnabledOnLoad(): boolean {
  const def = getDefaultEnabled();
  if (!isVisitorSwitchable()) return def;
  const stored = localStorage.getItem("sakuraEnabled");
  return stored == null ? def : stored === "true";
}

/* ── 共享工具 ── */

/** 创建樱花画布（fixed 全屏、不响应指针、层级取配置）：主线程 / Worker 两套实现共用 */
function createSakuraCanvas(): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.id = "canvas_sakura";
  canvas.setAttribute(
    "style",
    `position: fixed; left: 0; top: 0; pointer-events: none; z-index: ${SAKURA_CONFIG.zIndex}; transform: translateZ(0);`,
  );
  document.body.appendChild(canvas);
  return canvas;
}

/* ── 主线程回退实现（不支持 OffscreenCanvas 时使用） ── */

class MainThreadSakuraManager implements SakuraManagerLike {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: SakuraContext | null = null;
  private list: Sakura[] = [];
  private img: HTMLImageElement | null = null;
  private rafId: number | null = null;
  private resizeRafId: number | null = null;
  private running = false;
  /** init / stop 周期代际标记：stop 自增，使图片加载期间被取消的 init 失效（防重复建 canvas） */
  private generation = 0;
  private readonly viewport: SakuraViewport = {
    width: window.innerWidth,
    height: window.innerHeight,
  };

  private readonly onResize = (): void => {
    // rAF 节流：resize 高频触发时只处理最后一帧（重置尺寸会清空画布）
    if (this.resizeRafId !== null) return;
    this.resizeRafId = requestAnimationFrame(() => {
      this.resizeRafId = null;
      this.viewport.width = window.innerWidth;
      this.viewport.height = window.innerHeight;
      if (this.canvas) {
        this.canvas.width = this.viewport.width;
        this.canvas.height = this.viewport.height;
      }
    });
  };

  init(): void {
    if (this.running) return;
    this.running = true; // 提前标记：防图片加载期间重入导致重复创建 canvas
    const gen = ++this.generation;

    const image = new Image();
    image.onload = () => {
      if (gen !== this.generation) return; // 期间被 stop，丢弃本次初始化
      this.img = image;
      this.createCanvas();
      this.createList();
      this.startAnimation();
    };
    image.onerror = () => {
      console.warn("[Sakura] 樱花图片加载失败，特效未启动");
      if (gen === this.generation) this.stop();
    };
    image.src = IMG_URL;
  }

  private createCanvas(): void {
    const canvas = createSakuraCanvas();
    canvas.width = this.viewport.width;
    canvas.height = this.viewport.height;
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    window.addEventListener("resize", this.onResize);
  }

  private createList(): void {
    const image = this.img;
    const c = this.ctx;
    if (!image || !c) return;
    this.list = createSakuraList(SAKURA_CONFIG, image, this.viewport, c);
  }

  private startAnimation(): void {
    const c = this.ctx;
    const canvas = this.canvas;
    if (!c || !canvas) return;
    const loop = (): void => {
      c.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < this.list.length; i++) {
        this.list[i].update();
        this.list[i].draw(c);
      }
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  stop(): void {
    this.generation++; // 使进行中的 init 失效，避免其在加载完成后继续创建资源
    if (this.resizeRafId !== null) {
      cancelAnimationFrame(this.resizeRafId);
      this.resizeRafId = null;
    }
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.canvas) {
      this.canvas.remove();
      this.canvas = null;
    }
    window.removeEventListener("resize", this.onResize);
    this.img = null;
    this.ctx = null;
    this.list = [];
    this.running = false;
  }

  getIsRunning(): boolean {
    return this.running;
  }
}

/* ── Worker 实现（优先使用，绘制循环脱离主线程） ── */

class WorkerSakuraManager implements SakuraManagerLike {
  private canvas: HTMLCanvasElement | null = null;
  private worker: Worker | null = null;
  private resizeRafId: number | null = null;
  private running = false;

  private readonly onResize = (): void => {
    // rAF 节流：避免高频 resize 向 Worker 发送大量跨线程消息
    if (this.resizeRafId !== null) return;
    this.resizeRafId = requestAnimationFrame(() => {
      this.resizeRafId = null;
      this.worker?.postMessage({
        type: "resize",
        width: window.innerWidth,
        height: window.innerHeight,
      });
    });
  };

  private readonly onVisibilityChange = (): void => {
    this.worker?.postMessage({
      type: "visibilitychange",
      hidden: document.hidden,
    });
  };

  init(): void {
    if (this.running) return;
    this.running = true;

    try {
      const canvas = createSakuraCanvas();
      this.canvas = canvas;

      // OffscreenCanvas 所有权转移给 Worker（转移后主线程不能再获取其上下文）
      const offscreen = canvas.transferControlToOffscreen();
      const worker = new Worker(WORKER_URL);
      this.worker = worker;

      // 无论 init 还是运行期出错都整体回滚（清 canvas / terminate），状态归零后
      // 用户重新开启即可重建；避免「面板显示已开却无效果」的状态脱节
      worker.onerror = () => {
        console.warn("[Sakura] Worker 出错，樱花特效已停止");
        this.stop();
      };
      worker.onmessage = (
        e: MessageEvent<{ type?: string; message?: string }>,
      ) => {
        const data = e.data ?? {};
        if (data.type === "error") {
          console.warn("[Sakura]", data.message ?? "worker error");
          this.stop();
        }
      };

      worker.postMessage(
        {
          type: "init",
          config: SAKURA_CONFIG,
          canvas: offscreen,
          width: window.innerWidth,
          height: window.innerHeight,
          imgUrl: IMG_URL,
        },
        [offscreen],
      );

      window.addEventListener("resize", this.onResize);
      document.addEventListener("visibilitychange", this.onVisibilityChange);
    } catch (err) {
      console.warn("[Sakura] Worker 初始化异常：", err);
      this.stop();
    }
  }

  stop(): void {
    if (this.resizeRafId !== null) {
      cancelAnimationFrame(this.resizeRafId);
      this.resizeRafId = null;
    }
    if (this.worker) {
      // terminate 立即回收 Worker 整个 JS 堆（含 ImageBitmap），无需再发 stop 消息
      this.worker.terminate();
      this.worker = null;
    }
    window.removeEventListener("resize", this.onResize);
    document.removeEventListener("visibilitychange", this.onVisibilityChange);
    if (this.canvas) {
      this.canvas.remove();
      this.canvas = null;
    }
    this.running = false;
  }

  getIsRunning(): boolean {
    return this.running;
  }
}

/* ── 特性检测 + 入口 ── */

function supportsWorkerSakura(): boolean {
  // 有 Worker 且 canvas 支持转移所有权即可；transferControlToOffscreen 存在
  // 即意味着 OffscreenCanvas 构造器可用，无需再重复检查
  return (
    typeof Worker !== "undefined" &&
    "transferControlToOffscreen" in HTMLCanvasElement.prototype
  );
}

(function setupSakura(): void {
  if (window.__sakuraInitialized) return; // Swup 换页重跑：守卫保证只初始化一次
  window.__sakuraInitialized = true;

  const manager: SakuraManagerLike = supportsWorkerSakura()
    ? new WorkerSakuraManager()
    : new MainThreadSakuraManager();

  // 调试 / 扩展入口（供未来其它特效面板调用；类型声明见 global.d.ts）
  window.__etherealSakura = {
    init: () => {
      if (!manager.getIsRunning()) manager.init();
    },
    stop: () => manager.stop(),
    getIsRunning: () => manager.getIsRunning(),
  };

  // 首载：按「可切换时 localStorage 优先，否则全局默认」决定是否启动
  if (getEnabledOnLoad()) manager.init();

  // 显示设置面板实时启停（setSakuraEnabled / resetSakura 派发 sakuraToggle）
  window.addEventListener("sakuraToggle", (e: Event) => {
    const detail = (e as CustomEvent<{ enabled?: boolean }>).detail;
    if (!detail || typeof detail.enabled !== "boolean") return;
    if (detail.enabled) {
      if (!manager.getIsRunning()) manager.init();
    } else if (manager.getIsRunning()) {
      manager.stop();
    }
  });
})();
