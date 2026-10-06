import type { PlanMode, PlanReserves, PlanReserveSet } from './models';

export const PLAN_NAMES: Record<PlanMode, string> = {
  minimal: '精简版',
  comfort: '舒适版',
  shopping: '购物版',
};

export const PLAN_MODES: PlanMode[] = ['minimal', 'comfort', 'shopping'];

/**
 * 默认预留沿用旧版固定比例（精简 20%、舒适 0%、购物 35%）。
 * 旧数据没有独立预留字段时，按这套比例迁移，保证历史快照的计算结果不变。
 */
export const DEFAULT_RESERVES: PlanReserveSet = {
  minimal: { spaceReserve: 0.2, weightReserve: 0.2 },
  comfort: { spaceReserve: 0, weightReserve: 0 },
  shopping: { spaceReserve: 0.35, weightReserve: 0.35 },
};

function isRatio(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1;
}

export function normalizeReserves(value: unknown): PlanReserveSet {
  const source = (value ?? {}) as Partial<Record<PlanMode, Partial<PlanReserves>>>;
  const result = {} as PlanReserveSet;
  for (const mode of PLAN_MODES) {
    const entry = source[mode] ?? {};
    result[mode] = {
      spaceReserve: isRatio(entry.spaceReserve) ? entry.spaceReserve : DEFAULT_RESERVES[mode].spaceReserve,
      weightReserve: isRatio(entry.weightReserve) ? entry.weightReserve : DEFAULT_RESERVES[mode].weightReserve,
    };
  }
  return result;
}

/** 预留比例只允许落在 0–1（含端点）；越界时给出明确错误，调用方不得保存。 */
export function validateReserves(reserves: PlanReserveSet): string[] {
  const errors: string[] = [];
  for (const mode of PLAN_MODES) {
    const { spaceReserve, weightReserve } = reserves[mode];
    if (!isRatio(spaceReserve)) errors.push(`${PLAN_NAMES[mode]}空间预留必须在 0–100% 之间`);
    if (!isRatio(weightReserve)) errors.push(`${PLAN_NAMES[mode]}重量预留必须在 0–100% 之间`);
  }
  return errors;
}
