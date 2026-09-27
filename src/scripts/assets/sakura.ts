// 樱花飘落特效（自 Firefly SakuraEffect 迁移，2026-09-23）
// 仅迁移主线程 Canvas 2D 实现（Halo esbuild 管线不打包 Web Worker）；
// 配置来源：后台 settings.yaml → theme.config.effects.sakura（经 #theme-config JSON），
// 与 wave.ts 同契约（getThemeConfig() 共享解析缓存）。
import { getThemeConfig } from "./_theme-config";

// ===== 配置（与 Firefly effectsConfig.sakuraConfig 一致，enable 默认 false 与设置默认对齐）=====
type SakuraConfig = {
  enable: boolean;
  sakuraNum: number;
  limitTimes: number;
  size: { min: number; max: number };
  opacity: { min: number; max: number };
  speed: {
    horizontal: { min: number; max: number };
    vertical: { min: number; max: number };
    rotation: number;
    fadeSpeed: number;
  };
  zIndex: number;
};

const DEFAULT_CONFIG: SakuraConfig = {
  enable: false,
  sakuraNum: 21,
  limitTimes: -1,
  size: { min: 0.5, max: 1.1 },
  opacity: { min: 0.3, max: 0.9 },
  speed: {
    horizontal: { min: -1.7, max: -1.2 },
    vertical: { min: 1.5, max: 2.2 },
    rotation: 0.03,
    fadeSpeed: 0.03,
  },
  zIndex: 100,
};

function resolveConfig(): SakuraConfig {
  const themeConfig = getThemeConfig() as {
    effects?: { sakura?: Partial<SakuraConfig> };
  } | null;
  const cfg = themeConfig?.effects?.sakura ?? {};
  const resolved: SakuraConfig = {
    ...DEFAULT_CONFIG,
    ...cfg,
    size: { ...DEFAULT_CONFIG.size, ...cfg.size },
    opacity: { ...DEFAULT_CONFIG.opacity, ...cfg.opacity },
    speed: {
      ...DEFAULT_CONFIG.speed,
      ...cfg.speed,
      horizontal: {
        ...DEFAULT_CONFIG.speed.horizontal,
        ...cfg.speed?.horizontal,
      },
      vertical: { ...DEFAULT_CONFIG.speed.vertical, ...cfg.speed?.vertical },
    },
  };
  // 访客面板开关（localStorage sakuraEnabled）优先于后台默认
  const stored = readStoredEnabled();
  if (stored !== null) {
    resolved.enable = stored;
  }
  return resolved;
}

function readStoredEnabled(): boolean | null {
  try {
    const v = localStorage.getItem("sakuraEnabled");
    if (v === null) return null;
    return v === "true";
  } catch {
    return null;
  }
}

// sakura.js 位于 /themes/{name}/assets/，花瓣图片在同目录 images/effects/ 下。
// 注意：只能在脚本首次执行时计算（document.currentScript 仅执行期有效），
// 缓存到模块级常量——事件回调（sakuraToggle）里 currentScript 为 null，
// 若此时再调用会拿到错误 fallback 路径导致重启失败。
const SAKURA_IMAGE_URL = (() => {
  const scriptSrc = (document.currentScript as HTMLScriptElement | null)?.src;
  if (scriptSrc) {
    const base = scriptSrc.substring(0, scriptSrc.lastIndexOf("/"));
    return base + "/images/effects/sakura.png";
  }
  return "/assets/images/effects/sakura.png";
})();

let windowWidth = window.innerWidth;
let windowHeight = window.innerHeight;

function getRandomMainThread(
  option: "x" | "y" | "s" | "r" | "a",
  cfg: SakuraConfig,
): number;
function getRandomMainThread(
  option: "fnx" | "fny",
  cfg: SakuraConfig,
): (x: number, y: number) => number;
function getRandomMainThread(
  option: "fnr",
  cfg: SakuraConfig,
): (r: number) => number;
function getRandomMainThread(
  option: "fna",
  cfg: SakuraConfig,
): (a: number) => number;
function getRandomMainThread(option: string, cfg: SakuraConfig): unknown {
  switch (option) {
    case "x":
      return Math.random() * windowWidth;
    case "y":
      return Math.random() * windowHeight;
    case "s":
      return cfg.size.min + Math.random() * (cfg.size.max - cfg.size.min);
    case "r":
      return Math.random() * 6;
    case "a":
      return (
        cfg.opacity.min + Math.random() * (cfg.opacity.max - cfg.opacity.min)
      );
    case "fnx": {
      const random =
        cfg.speed.horizontal.min +
        Math.random() * (cfg.speed.horizontal.max - cfg.speed.horizontal.min);
      return (x: number, _y: number) => x + random;
    }
    case "fny": {
      const random =
        cfg.speed.vertical.min +
        Math.random() * (cfg.speed.vertical.max - cfg.speed.vertical.min);
      return (_x: number, y: number) => y + random;
    }
    case "fnr":
      return (r: number) => r + cfg.speed.rotation;
    case "fna":
      return (alpha: number) => alpha - cfg.speed.fadeSpeed * 0.01;
    default:
      return undefined;
  }
}

interface MainThreadSakuraFns {
  x: (x: number, y: number) => number;
  y: (x: number, y: number) => number;
  r: (r: number) => number;
  a: (a: number) => number;
}

class MainThreadSakura {
  x: number;
  y: number;
  s: number;
  r: number;
  a: number;
  fn: MainThreadSakuraFns;
  idx: number;
  img: HTMLImageElement;
  limitArray: number[];
  config: SakuraConfig;

  constructor(
    x: number,
    y: number,
    s: number,
    r: number,
    a: number,
    fn: MainThreadSakuraFns,
    idx: number,
    img: HTMLImageElement,
    limitArray: number[],
    config: SakuraConfig,
  ) {
    this.x = x;
    this.y = y;
    this.s = s;
    this.r = r;
    this.a = a;
    this.fn = fn;
    this.idx = idx;
    this.img = img;
    this.limitArray = limitArray;
    this.config = config;
  }

  draw(cxt: CanvasRenderingContext2D) {
    cxt.save();
    cxt.translate(this.x, this.y);
    cxt.rotate(this.r);
    cxt.globalAlpha = this.a;
    cxt.drawImage(this.img, 0, 0, 40 * this.s, 40 * this.s);
    cxt.restore();
  }

  update() {
    this.x = this.fn.x(this.x, this.y);
    this.y = this.fn.y(this.x, this.y);
    this.r = this.fn.r(this.r);
    this.a = this.fn.a(this.a);
    if (
      this.x > windowWidth ||
      this.x < 0 ||
      this.y > windowHeight ||
      this.y < 0 ||
      this.a <= 0
    ) {
      if (this.limitArray[this.idx] === -1) {
        this.resetPosition();
      } else if (this.limitArray[this.idx] > 0) {
        this.resetPosition();
        this.limitArray[this.idx]--;
      }
    }
  }

  resetPosition() {
    if (Math.random() > 0.4) {
      this.x = getRandomMainThread("x", this.config);
      this.y = 0;
      this.s = getRandomMainThread("s", this.config);
      this.r = getRandomMainThread("r", this.config);
      this.a = getRandomMainThread("a", this.config);
    } else {
      this.x = windowWidth;
      this.y = getRandomMainThread("y", this.config);
      this.s = getRandomMainThread("s", this.config);
      this.r = getRandomMainThread("r", this.config);
      this.a = getRandomMainThread("a", this.config);
    }
  }
}

class MainThreadSakuraList {
  list: MainThreadSakura[] = [];

  push(sakura: MainThreadSakura) {
    this.list.push(sakura);
  }

  update() {
    for (let i = 0, len = this.list.length; i < len; i++) {
      this.list[i].update();
    }
  }

  draw(cxt: CanvasRenderingContext2D) {
    for (let i = 0, len = this.list.length; i < len; i++) {
      this.list[i].draw(cxt);
    }
  }
}

interface SakuraManagerLike {
  config: SakuraConfig;
  isRunning: boolean;
  init(): Promise<void>;
  stop(): void;
  getIsRunning(): boolean;
}

class MainThreadSakuraManager implements SakuraManagerLike {
  config: SakuraConfig;
  canvas: HTMLCanvasElement | null = null;
  ctx: CanvasRenderingContext2D | null = null;
  sakuraList: MainThreadSakuraList | null = null;
  animationId: number | null = null;
  img: HTMLImageElement | null = null;
  isRunning = false;
  private boundHandleResize: (() => void) | null = null;
  private resizeRafId: number | null = null;
  /** init/stop 周期代际标记：避免 await 图片加载期间用户切换导致重复创建 canvas */
  private initGeneration = 0;

  constructor(config: SakuraConfig) {
    this.config = config;
  }

  async init() {
    if (!this.config.enable || this.isRunning) {
      return;
    }
    this.isRunning = true;
    const gen = ++this.initGeneration;

    try {
      this.img = new Image();
      this.img.src = SAKURA_IMAGE_URL;

      await new Promise<void>((resolve, reject) => {
        if (!this.img) {
          reject(new Error("Failed to create sakura image"));
          return;
        }
        this.img.onload = () => resolve();
        this.img.onerror = () =>
          reject(new Error("Failed to load sakura image"));
      });

      if (gen !== this.initGeneration) {
        return;
      }
      this.createCanvas();
      this.createSakuraList();
      this.startAnimation();
    } catch (err) {
      console.warn("[Sakura] init failed:", err);
      if (gen === this.initGeneration) {
        this.stop();
      }
    }
  }

  createCanvas() {
    this.canvas = document.createElement("canvas");
    this.canvas.height = windowHeight;
    this.canvas.width = windowWidth;
    this.canvas.setAttribute(
      "style",
      `position: fixed; left: 0; top: 0; pointer-events: none; z-index: ${this.config.zIndex}; transform: translateZ(0);`,
    );
    this.canvas.setAttribute("id", "canvas_sakura");
    document.body.appendChild(this.canvas);
    this.ctx = this.canvas.getContext("2d");

    this.boundHandleResize = this.handleResize.bind(this);
    window.addEventListener("resize", this.boundHandleResize);
  }

  createSakuraList() {
    if (!this.img || !this.ctx) return;

    this.sakuraList = new MainThreadSakuraList();
    const limitArray = new Array(this.config.sakuraNum).fill(
      this.config.limitTimes,
    );

    for (let i = 0; i < this.config.sakuraNum; i++) {
      const sakura = new MainThreadSakura(
        getRandomMainThread("x", this.config),
        getRandomMainThread("y", this.config),
        getRandomMainThread("s", this.config),
        getRandomMainThread("r", this.config),
        getRandomMainThread("a", this.config),
        {
          x: getRandomMainThread("fnx", this.config),
          y: getRandomMainThread("fny", this.config),
          r: getRandomMainThread("fnr", this.config),
          a: getRandomMainThread("fna", this.config),
        },
        i,
        this.img,
        limitArray,
        this.config,
      );

      sakura.draw(this.ctx);
      this.sakuraList.push(sakura);
    }
  }

  startAnimation() {
    if (!this.ctx || !this.canvas || !this.sakuraList) return;

    const animate = () => {
      if (!this.ctx || !this.canvas || !this.sakuraList) return;
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.sakuraList.update();
      this.sakuraList.draw(this.ctx);
      this.animationId = requestAnimationFrame(animate);
    };

    this.animationId = requestAnimationFrame(animate);
  }

  handleResize() {
    // rAF 节流，避免 resize 高频触发频繁重置 canvas
    if (this.resizeRafId !== null) return;
    this.resizeRafId = requestAnimationFrame(() => {
      this.resizeRafId = null;
      windowWidth = window.innerWidth;
      windowHeight = window.innerHeight;
      if (this.canvas) {
        this.canvas.width = windowWidth;
        this.canvas.height = windowHeight;
      }
    });
  }

  stop() {
    this.initGeneration++;
    if (this.resizeRafId !== null) {
      cancelAnimationFrame(this.resizeRafId);
      this.resizeRafId = null;
    }
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    if (this.canvas) {
      document.body.removeChild(this.canvas);
      this.canvas = null;
    }
    if (this.boundHandleResize) {
      window.removeEventListener("resize", this.boundHandleResize);
      this.boundHandleResize = null;
    }
    this.img = null;
    this.sakuraList = null;
    this.ctx = null;
    this.isRunning = false;
  }

  getIsRunning() {
    return this.isRunning;
  }
}

let globalSakuraManager: SakuraManagerLike | null = null;

function initSakura(cfg: SakuraConfig) {
  if (globalSakuraManager) {
    const wasRunning = globalSakuraManager.isRunning;
    if (wasRunning) {
      globalSakuraManager.stop();
    }
    globalSakuraManager.config = cfg;
    if (cfg.enable) {
      void globalSakuraManager.init();
    }
  } else {
    globalSakuraManager = new MainThreadSakuraManager(cfg);
    (window as unknown as { sakuraManager?: SakuraManagerLike }).sakuraManager =
      globalSakuraManager;
    if (cfg.enable) {
      void globalSakuraManager.init();
    }
  }
}

// 入口：幂等初始化 + 监听前台显示设置面板的樱花切换事件（Firefly 契约：
// DisplaySettings 写 localStorage sakuraEnabled 并派发 sakuraToggle）
(function setupSakura() {
  const w = window as unknown as { sakuraInitialized?: boolean };
  if (w.sakuraInitialized) {
    return;
  }
  w.sakuraInitialized = true;

  const cfg = resolveConfig();
  initSakura(cfg);

  window.addEventListener("sakuraToggle", (e: Event) => {
    const detail = (e as CustomEvent<{ enabled: boolean }>).detail;
    if (!detail) return;
    const mgr = globalSakuraManager;
    if (!mgr) return;
    if (detail.enabled && !mgr.getIsRunning()) {
      mgr.config.enable = true;
      void mgr.init();
    } else if (!detail.enabled && mgr.getIsRunning()) {
      mgr.stop();
    }
  });
})();
