import { describe, expect, it } from 'vitest';
import { packItems, validateSuitcase } from '../packing-engine';
import { DEFAULT_RESERVES } from '../reserves';
import type { PackingItem, Suitcase } from '../models';

const suitcase = (overrides: Partial<Suitcase> = {}): Suitcase => ({ length: 10, width: 8, height: 6, maxWeight: 10, ...overrides });
const item = (id: string, overrides: Partial<PackingItem> = {}): PackingItem => ({
  id, name: id, category: '衣物', length: 3, width: 2, height: 1, weight: 1, priority: 2, mustHave: false, ...overrides,
});

describe('validateSuitcase', () => {
  it('rejects each non-positive capacity', () => {
    expect(validateSuitcase(suitcase({ height: 0 }))).toContain('行李箱高度必须大于 0');
    expect(validateSuitcase(suitcase({ maxWeight: -1 }))).toContain('承重必须大于 0');
  });
});

describe('packItems', () => {
  it('allows total weight exactly at the suitcase limit', () => {
    const plan = packItems(suitcase({ maxWeight: 2 }), [item('a'), item('b')], 'comfort', DEFAULT_RESERVES.comfort);
    expect(plan.placements).toHaveLength(2);
    expect(plan.totalWeight).toBe(2);
  });

  it('uses rotation when the original orientation does not fit', () => {
    const plan = packItems(suitcase({ length: 4, width: 3, height: 2 }), [item('rotated', { length: 2, width: 4, height: 3 })], 'comfort', DEFAULT_RESERVES.comfort);
    expect(plan.placements[0]?.dimensions).toEqual({ length: 4, width: 3, height: 2 });
  });

  it('keeps placements inside bounds and non-overlapping', () => {
    const plan = packItems(suitcase(), [item('a'), item('b'), item('c')], 'comfort', DEFAULT_RESERVES.comfort);
    expect(plan.placements.every((p) => p.x + p.dimensions.length <= 10 && p.y + p.dimensions.width <= 8 && p.z + p.dimensions.height <= 6)).toBe(true);
    expect(new Set(plan.placements.map((p) => `${p.x}:${p.y}:${p.z}`)).size).toBe(3);
  });

  it('returns deterministic coordinates and an unplaced reason', () => {
    const inputs = [item('a'), item('huge', { length: 30 })];
    expect(packItems(suitcase(), inputs, 'comfort', DEFAULT_RESERVES.comfort)).toEqual(packItems(suitcase(), inputs, 'comfort', DEFAULT_RESERVES.comfort));
    expect(packItems(suitcase(), inputs, 'comfort', DEFAULT_RESERVES.comfort).unplaced[0]?.reason).toContain('箱体');
  });

  it('applies space and weight reserves independently without cross-using ratios', () => {
    // 空间预留 0、重量预留 50%：重量按 5kg 截断，容积仍可用满。
    const heavy = item('heavy', { weight: 6 });
    const plan = packItems(suitcase(), [heavy], 'minimal', { spaceReserve: 0, weightReserve: 0.5 });
    expect(plan.unplaced[0]?.cause).toBe('weight-reserve');
    expect(plan.usableWeight).toBe(5);
    expect(plan.usableVolume).toBe(480);
    expect(plan.placements).toHaveLength(0);
  });

  it('uses full capacity at zero reserve and packs nothing at full reserve', () => {
    const inputs = [item('a')];
    const full = packItems(suitcase(), inputs, 'comfort', { spaceReserve: 0, weightReserve: 0 });
    expect(full.usableVolume).toBe(480);
    expect(full.usableWeight).toBe(10);
    expect(full.placements).toHaveLength(1);

    const allSpace = packItems(suitcase(), inputs, 'comfort', { spaceReserve: 1, weightReserve: 0 });
    expect(allSpace.placements).toHaveLength(0);
    expect(allSpace.unplaced[0]?.cause).toBe('volume-reserve');

    const allWeight = packItems(suitcase(), inputs, 'comfort', { spaceReserve: 0, weightReserve: 1 });
    expect(allWeight.placements).toHaveLength(0);
    expect(allWeight.unplaced[0]?.cause).toBe('weight-reserve');
  });

  it('does not let must-have items break through reserves', () => {
    const required = item('must', { weight: 6, mustHave: true });
    const plan = packItems(suitcase({ maxWeight: 10 }), [required], 'shopping', { spaceReserve: 0, weightReserve: 0.5 });
    expect(plan.placements).toHaveLength(0);
    expect(plan.unplaced[0]).toMatchObject({ cause: 'weight-reserve' });
  });

  it('distinguishes box-limit failures from reserve-limit failures', () => {
    const huge = item('huge', { length: 30, mustHave: true });
    const reservePlan = packItems(suitcase(), [huge], 'minimal', { spaceReserve: 0.2, weightReserve: 0.2 });
    expect(reservePlan.unplaced[0]?.cause).toBe('box-limit');

    // 物品本身能进空箱，但预留占满全部空间时归因于预留限制。
    const normal = item('normal', { length: 4 });
    const blocked = packItems(suitcase(), [normal], 'minimal', { spaceReserve: 1, weightReserve: 0 });
    expect(blocked.unplaced[0]?.cause).toBe('volume-reserve');
  });

  it('reports used, reserved and remaining quotas on the plan', () => {
    const plan = packItems(suitcase(), [item('a')], 'shopping', { spaceReserve: 0.35, weightReserve: 0.35 });
    expect(plan.reservedVolume).toBeCloseTo(480 * 0.35);
    expect(plan.reservedWeight).toBeCloseTo(3.5);
    expect(plan.usableVolume + plan.reservedVolume).toBeCloseTo(480);
    expect(plan.usableWeight + plan.reservedWeight).toBeCloseTo(10);
    expect(plan.usableVolume - plan.usedVolume).toBeGreaterThan(0);
  });
});
