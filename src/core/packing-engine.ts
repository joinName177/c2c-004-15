import { intersects, rotationsOf } from './geometry';
import { PLAN_NAMES } from './reserves';
import { itemVolume, suitcaseVolume, type PackingItem, type PackingPlan, type Placement, type PlanMode, type PlanReserves, type Suitcase, type UnplacedCause, type UnplacedItem } from './models';

export function validateSuitcase(suitcase: Suitcase): string[] {
  const errors: string[] = [];
  if (!(suitcase.length > 0)) errors.push('行李箱长度必须大于 0');
  if (!(suitcase.width > 0)) errors.push('行李箱宽度必须大于 0');
  if (!(suitcase.height > 0)) errors.push('行李箱高度必须大于 0');
  if (!(suitcase.maxWeight > 0)) errors.push('承重必须大于 0');
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

function fitsEmptyBox(dimensions: Placement['dimensions'], suitcase: Suitcase): boolean {
  return dimensions.length <= suitcase.length && dimensions.width <= suitcase.width && dimensions.height <= suitcase.height;
}

/**
 * 空间预留与重量预留独立计算：分别从箱体总容积、最大承重中扣除各自比例，
 * 绝不用空间比例折算重量。必带物品同样受两套额度约束，不会被破例装入。
 */
export function packItems(suitcase: Suitcase, items: PackingItem[], mode: PlanMode, reserves: PlanReserves): PackingPlan {
  const placements: Placement[] = [];
  const unplaced: UnplacedItem[] = [];
  const fail = (item: PackingItem, reason: string, cause: UnplacedCause): UnplacedItem => ({ item, reason, cause });

  const boxVolume = suitcaseVolume(suitcase);
  const reservedVolume = boxVolume * reserves.spaceReserve;
  const reservedWeight = suitcase.maxWeight * reserves.weightReserve;
  const usableVolume = boxVolume - reservedVolume;
  const usableWeight = suitcase.maxWeight - reservedWeight;
  let totalWeight = 0;
  let usedVolume = 0;

  for (const item of ordered(items, mode)) {
    if ([item.length, item.width, item.height, item.weight].some((value) => !(value > 0))) {
      unplaced.push(fail(item, '尺寸或重量无效', 'invalid'));
      continue;
    }
    if (totalWeight + item.weight > usableWeight) {
      unplaced.push(fail(item, `重量预留限制：当前方案预留 ${Math.round(reserves.weightReserve * 100)}% 承重，可用额度不足`, 'weight-reserve'));
      continue;
    }
    if (usedVolume + itemVolume(item) > usableVolume) {
      unplaced.push(fail(item, `空间预留限制：当前方案预留 ${Math.round(reserves.spaceReserve * 100)}% 容积，可用额度不足`, 'volume-reserve'));
      continue;
    }

    let placement: Placement | undefined;
    for (const point of candidatePoints(placements)) {
      for (const dimensions of rotationsOf(item)) {
        const candidate: Placement = { itemId: item.id, ...point, dimensions };
        if (fitsEmptyBox(dimensions, suitcase) && placements.every((placed) => !intersects(candidate, placed))) {
          placement = candidate;
          break;
        }
      }
      if (placement) break;
    }

    if (!placement) {
      // 任意旋转都无法进入空箱体，是箱体本身不足；否则是预留额度下剩余空间被切碎。
      const physicallyFits = rotationsOf(item).some((dimensions) => fitsEmptyBox(dimensions, suitcase));
      if (!physicallyFits) {
        unplaced.push(fail(item, '箱体本身不足：任意旋转方向都无法放入当前行李箱', 'box-limit'));
      } else if (reserves.spaceReserve > 0) {
        unplaced.push(fail(item, `空间预留限制：预留 ${Math.round(reserves.spaceReserve * 100)}% 后没有连续空间可用`, 'volume-reserve'));
      } else {
        unplaced.push(fail(item, '箱体本身不足：没有可用的连续空间', 'box-limit'));
      }
      continue;
    }
    placements.push(placement);
    totalWeight += item.weight;
    usedVolume += itemVolume(item);
  }

  return {
    id: mode,
    name: PLAN_NAMES[mode],
    placements,
    unplaced,
    totalWeight,
    usedVolume,
    capacityRatio: boxVolume ? usedVolume / boxVolume : 0,
    reserves,
    usableVolume,
    usableWeight,
    reservedVolume,
    reservedWeight,
    usableVolumeRatio: usableVolume > 0 ? usedVolume / usableVolume : 0,
    usableWeightRatio: usableWeight > 0 ? totalWeight / usableWeight : 0,
  };
}
