// 共享：樱花绘制核心（单片 Sakura 与随机工具）
// 被主线程回退实现（sakura.ts）与 Worker 实现（sakura-worker.ts）共同引用，
// esbuild 编译时内联进各入口。上下文取联合类型兼容主线程 / OffscreenCanvas，
// 贴图取 CanvasImageSource（HTMLImageElement / ImageBitmap 均兼容）。
import type { SakuraConfig } from "./_sakura-config";

/** 绘制上下文：主线程 Canvas 2D 与 OffscreenCanvas 2D 兼容 */
export type SakuraContext =
  CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

/** 贴图：主线程 HTMLImageElement 与 Worker ImageBitmap 均满足 */
export type SakuraImage = CanvasImageSource;

/** 视口尺寸（对象引用共享：resize 时由持有方更新字段，Sakura 实时读取） */
export interface SakuraViewport {
  width: number;
  height: number;
}

function randMax(range: number): number {
  return Math.random() * range;
}

// 以下为模块内部工具（仅 Sakura 类使用，不对外导出）
function randSize(cfg: SakuraConfig): number {
  return cfg.size.min + Math.random() * (cfg.size.max - cfg.size.min);
}

function randAlpha(cfg: SakuraConfig): number {
  return cfg.opacity.min + Math.random() * (cfg.opacity.max - cfg.opacity.min);
}

function makeFnx(cfg: SakuraConfig): (x: number, y: number) => number {
  const v =
    cfg.speed.horizontal.min +
    Math.random() * (cfg.speed.horizontal.max - cfg.speed.horizontal.min);
  return (x: number) => x + v;
}

function makeFny(cfg: SakuraConfig): (x: number, y: number) => number {
  const v =
    cfg.speed.vertical.min +
    Math.random() * (cfg.speed.vertical.max - cfg.speed.vertical.min);
  return (_x: number, y: number) => y + v;
}

function makeFnr(cfg: SakuraConfig): (r: number) => number {
  return (r: number) => r + cfg.speed.rotation;
}

function makeFna(cfg: SakuraConfig): (a: number) => number {
  return (a: number) => a - cfg.speed.fadeSpeed * 0.01;
}

/** 单片樱花：位置 / 尺寸 / 旋转 / 透明度 + 各自独立的速度函数 */
export class Sakura {
  x: number;
  y: number;
  s: number;
  r: number;
  a: number;
  idx: number;
  image: SakuraImage;
  limitArray: number[];
  cfg: SakuraConfig;
  viewport: SakuraViewport;
  private fnx: (x: number, y: number) => number;
  private fny: (x: number, y: number) => number;
  private fnr: (r: number) => number;
  private fna: (a: number) => number;

  constructor(
    idx: number,
    image: SakuraImage,
    limitArray: number[],
    cfg: SakuraConfig,
    viewport: SakuraViewport,
  ) {
    this.idx = idx;
    this.image = image;
    this.limitArray = limitArray;
    this.cfg = cfg;
    this.viewport = viewport;
    this.x = randMax(viewport.width);
    this.y = randMax(viewport.height);
    this.s = randSize(cfg);
    this.r = randMax(6);
    this.a = randAlpha(cfg);
    this.fnx = makeFnx(cfg);
    this.fny = makeFny(cfg);
    this.fnr = makeFnr(cfg);
    this.fna = makeFna(cfg);
  }

  draw(ctx: SakuraContext): void {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.r);
    ctx.globalAlpha = this.a;
    ctx.drawImage(this.image, 0, 0, 40 * this.s, 40 * this.s);
    ctx.restore();
  }

  update(): void {
    this.x = this.fnx(this.x, this.y);
    this.y = this.fny(this.x, this.y);
    this.r = this.fnr(this.r);
    this.a = this.fna(this.a);
    // 越界（或淡出殆尽）后按 limitTimes 重置：-1 无限循环，其余值耗尽后停用不再复活
    if (
      this.x > this.viewport.width ||
      this.x < 0 ||
      this.y > this.viewport.height ||
      this.y < 0 ||
      this.a <= 0
    ) {
      const limit = this.limitArray[this.idx];
      if (limit === -1) {
        this.resetPosition();
      } else if (limit > 0) {
        this.resetPosition();
        this.limitArray[this.idx] = limit - 1;
      }
    }
  }

  private resetPosition(): void {
    // 大多数从顶部落下，少数从右侧飘入（与 Firefly 原实现一致）
    if (Math.random() > 0.4) {
      this.x = randMax(this.viewport.width);
      this.y = 0;
    } else {
      this.x = this.viewport.width;
      this.y = randMax(this.viewport.height);
    }
    this.s = randSize(this.cfg);
    this.r = randMax(6);
    this.a = randAlpha(this.cfg);
  }
}

/** 创建樱花列表（主线程 / Worker 共用）：limitArray 为各片花瓣的越界配额。
 *  创建时先画一帧，避免等待第一个 rAF 期间画面空白 */
export function createSakuraList(
  cfg: SakuraConfig,
  image: SakuraImage,
  viewport: SakuraViewport,
  ctx: SakuraContext,
): Sakura[] {
  const limitArray = new Array<number>(cfg.sakuraNum).fill(cfg.limitTimes);
  const list: Sakura[] = [];
  for (let i = 0; i < cfg.sakuraNum; i++) {
    const sakura = new Sakura(i, image, limitArray, cfg, viewport);
    sakura.draw(ctx);
    list.push(sakura);
  }
  return list;
}
