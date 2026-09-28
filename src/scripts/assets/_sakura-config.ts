// 共享：樱花特效参数与类型
// 主脚本 sakura.ts 消费 SAKURA_CONFIG 并经 Worker init 消息传给 sakura-worker.ts；
// Worker 仅 import type（类型编译期消除）。参数为内置默认（后台只开关、不暴露调参），
// 调整时两处生效路径都要考虑：主线程回退版直接读本模块，Worker 版读消息里的 config。
export interface SakuraConfig {
  /** 樱花数量 */
  sakuraNum: number;
  /** 樱花越界限制次数，-1 为无限循环 */
  limitTimes: number;
  /** 樱花尺寸倍数区间 */
  size: { min: number; max: number };
  /** 不透明度区间 */
  opacity: { min: number; max: number };
  /** 移动速度 */
  speed: {
    horizontal: { min: number; max: number };
    vertical: { min: number; max: number };
    rotation: number;
    fadeSpeed: number;
  };
  /** 层级，确保樱花浮于内容之上 */
  zIndex: number;
}

export const SAKURA_CONFIG: SakuraConfig = {
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
