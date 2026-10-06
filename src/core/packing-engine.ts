import { intersects, rotationsOf } from './geometry';
import { itemVolume, suitcaseVolume, type PackingItem, type PackingPlan, type Placement, type PlanMode, type PlanReserve, type PlanReserves, type Suitcase } from './models';

export const PLAN_NAMES: Record<PlanMode, string> = { minimal: '精简版', comfort: '舒适版', shopping: '购物版' };

/** 默认预留沿用旧版同一比例：精简版 20%、舒适版 0%、购物版 35% */
export const DEFAULT_RESERVES: PlanReserves = {
  minimal: { space: 0.2, weight: 0.2 },
  comfort: { space: 0, weight: 0 },
  shopping: { space: 0.35, weight: 0.35 },
};

export function createDefaultReserves(): PlanReserves {
  return {
    minimal: { ...DEFAULT_RESERVES.minimal },
    comfort: { ...DEFAULT_RESERVES.comfort },
    shopping: { ...DEFAULT_RESERVES.shopping },
  };
}

export function validateSuitcase(suitcase: Suitcase): string[] {
  const errors: string[] = [];
  if (!(suitcase.length > 0)) errors.push('行李箱长度必须大于 0');
  if (!(suitcase.width > 0)) errors.push('行李箱宽度必须大于 0');
  if (!(suitcase.height > 0)) errors.push('行李箱高度必须大于 0');
  if (!(suitcase.maxWeight > 0)) errors.push('承重必须大于 0');
  return errors;
}

export function validateReserve(reserve: PlanReserve): string[] {
  const errors: string[] = [];
  if (!Number.isFinite(reserve.space) || reserve.space < 0 || reserve.space > 1) errors.push('空间预留比例必须在 0% 到 100% 之间');
  if (!Number.isFinite(reserve.weight) || reserve.weight < 0 || reserve.weight > 1) errors.push('重量预留比例必须在 0% 到 100% 之间');
  return errors;
}

function ordered(items: PackingItem[], mode: PlanMode): PackingItem[] {
  return [...items].sort((a, b) => {
    const required = Number(b.mustHave) - Number(a.mustHave);
    if (required) return required;
    const priority = b.priority - a.priority;
    if (priority) return priority;
    return mode === 'shopping' ? a.weight - b.weight : itemVolume(b) - itemVolume(a) || a.id.localeCompare(b.id);
  });
}

function candidatePoints(placements: Placement[]) {
  const points = [{ x: 0, y: 0, z: 0 }];
  for (const p of placements) {
    points.push(
      { x: p.x + p.dimensions.length, y: p.y, z: p.z },
      { x: p.x, y: p.y + p.dimensions.width, z: p.z },
      { x: p.x, y: p.y, z: p.z + p.dimensions.height },
    );
  }
  return points.sort((a, b) => a.z - b.z || a.y - b.y || a.x - b.x);
}

const liters = (cm3: number) => (cm3 / 1000).toFixed(1);
const percent = (ratio: number) => Math.round(ratio * 100);

export function packItems(suitcase: Suitcase, items: PackingItem[], mode: PlanMode, reserve: PlanReserve = DEFAULT_RESERVES[mode]): PackingPlan {
  const placements: Placement[] = [];
  const unplaced: PackingPlan['unplaced'] = [];
  const totalVolume = suitcaseVolume(suitcase);
  // 空间预留只扣容积，重量预留只扣承重，两者独立计算
  const volumeAllowance = totalVolume * (1 - reserve.space);
  const weightAllowance = suitcase.maxWeight * (1 - reserve.weight);
  let totalWeight = 0;
  let usedVolume = 0;

  for (const item of ordered(items, mode)) {
    if ([item.length, item.width, item.height, item.weight].some((value) => !(value > 0))) {
      unplaced.push({ item, reason: '尺寸或重量无效' });
      continue;
    }
    if (totalWeight + item.weight > weightAllowance) {
      unplaced.push({
        item,
        reason: totalWeight + item.weight > suitcase.maxWeight
          ? `箱体承重本身不足（限重 ${suitcase.maxWeight} kg，已装 ${totalWeight.toFixed(1)} kg）`
          : `受重量预留限制（预留 ${percent(reserve.weight)}%，额度剩 ${(weightAllowance - totalWeight).toFixed(1)} kg）`,
      });
      continue;
    }
    if (usedVolume + itemVolume(item) > volumeAllowance) {
      unplaced.push({
        item,
        reason: usedVolume + itemVolume(item) > totalVolume
          ? `箱体空间本身不足（容积 ${liters(totalVolume)} L，已用 ${liters(usedVolume)} L）`
          : `受空间预留限制（预留 ${percent(reserve.space)}%，额度剩 ${liters(volumeAllowance - usedVolume)} L）`,
      });
      continue;
    }

    let placement: Placement | undefined;
    for (const point of candidatePoints(placements)) {
      for (const dimensions of rotationsOf(item)) {
        const candidate: Placement = { itemId: item.id, ...point, dimensions };
        const inBounds = candidate.x + dimensions.length <= suitcase.length
          && candidate.y + dimensions.width <= suitcase.width
          && candidate.z + dimensions.height <= suitcase.height;
        if (inBounds && placements.every((placed) => !intersects(candidate, placed))) {
          placement = candidate;
          break;
        }
      }
      if (placement) break;
    }

    if (!placement) {
      unplaced.push({ item, reason: '没有可用的连续空间' });
      continue;
    }
    placements.push(placement);
    totalWeight += item.weight;
    usedVolume += itemVolume(item);
  }

  return {
    id: mode,
    name: PLAN_NAMES[mode],
    reserve: { ...reserve },
    placements,
    unplaced,
    totalWeight,
    usedVolume,
    weightAllowance,
    volumeAllowance,
    capacityRatio: totalVolume ? usedVolume / totalVolume : 0,
  };
}
