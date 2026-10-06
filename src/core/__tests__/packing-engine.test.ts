import { describe, expect, it } from 'vitest';
import { packItems, validateReserve, validateSuitcase } from '../packing-engine';
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
    const plan = packItems(suitcase({ maxWeight: 2 }), [item('a'), item('b')], 'comfort');
    expect(plan.placements).toHaveLength(2);
    expect(plan.totalWeight).toBe(2);
  });

  it('uses rotation when the original orientation does not fit', () => {
    const plan = packItems(suitcase({ length: 4, width: 3, height: 2 }), [item('rotated', { length: 2, width: 4, height: 3 })], 'comfort');
    expect(plan.placements[0]?.dimensions).toEqual({ length: 4, width: 3, height: 2 });
  });

  it('keeps placements inside bounds and non-overlapping', () => {
    const plan = packItems(suitcase(), [item('a'), item('b'), item('c')], 'comfort');
    expect(plan.placements.every((p) => p.x + p.dimensions.length <= 10 && p.y + p.dimensions.width <= 8 && p.z + p.dimensions.height <= 6)).toBe(true);
    expect(new Set(plan.placements.map((p) => `${p.x}:${p.y}:${p.z}`)).size).toBe(3);
  });

  it('returns deterministic coordinates and an unplaced reason', () => {
    const inputs = [item('a'), item('huge', { length: 30 })];
    expect(packItems(suitcase(), inputs, 'comfort')).toEqual(packItems(suitcase(), inputs, 'comfort'));
    expect(packItems(suitcase(), inputs, 'comfort').unplaced[0]?.reason).toContain('空间');
  });
});

describe('validateReserve', () => {
  it('accepts the boundary values 0 and 1', () => {
    expect(validateReserve({ space: 0, weight: 1 })).toEqual([]);
  });

  it('rejects out-of-range and non-finite ratios', () => {
    expect(validateReserve({ space: -0.1, weight: 0.5 })).toContain('空间预留比例必须在 0% 到 100% 之间');
    expect(validateReserve({ space: 0.5, weight: 1.2 })).toContain('重量预留比例必须在 0% 到 100% 之间');
    expect(validateReserve({ space: Number.NaN, weight: 0.5 })).toContain('空间预留比例必须在 0% 到 100% 之间');
  });
});

describe('packItems reserves', () => {
  it('deducts space reserve from volume only, never from weight allowance', () => {
    const plan = packItems(suitcase({ maxWeight: 10 }), [item('heavy', { weight: 9 })], 'comfort', { space: 0.9, weight: 0 });
    expect(plan.weightAllowance).toBe(10);
    expect(plan.volumeAllowance).toBeCloseTo(48);
    expect(plan.placements.map((p) => p.itemId)).toEqual(['heavy']);
  });

  it('deducts weight reserve from weight only, never from volume allowance', () => {
    const plan = packItems(suitcase(), [item('a'), item('b')], 'comfort', { space: 0, weight: 0.95 });
    expect(plan.volumeAllowance).toBe(480);
    expect(plan.weightAllowance).toBeCloseTo(0.5);
    expect(plan.placements).toHaveLength(0);
    expect(plan.unplaced.every((entry) => entry.reason.includes('受重量预留限制'))).toBe(true);
  });

  it('packs everything with zero reserve and nothing with full reserve', () => {
    const items = [item('a'), item('b')];
    expect(packItems(suitcase(), items, 'comfort', { space: 0, weight: 0 }).placements).toHaveLength(2);
    const full = packItems(suitcase(), items, 'comfort', { space: 1, weight: 1 });
    expect(full.placements).toHaveLength(0);
    expect(full.unplaced).toHaveLength(2);
    expect(full.weightAllowance).toBe(0);
    expect(full.volumeAllowance).toBe(0);
  });

  it('does not let must-have items bypass the reserve', () => {
    const required = item('must', { mustHave: true, weight: 8 });
    const plan = packItems(suitcase({ maxWeight: 10 }), [required], 'comfort', { space: 0, weight: 0.5 });
    expect(plan.placements).toHaveLength(0);
    expect(plan.unplaced[0]?.item.id).toBe('must');
    expect(plan.unplaced[0]?.reason).toContain('受重量预留限制');
  });

  it('distinguishes reserve limits from suitcase limits in unplaced reasons', () => {
    const overReserve = item('reserved', { weight: 8 });
    const overBox = item('impossible', { weight: 12 });
    const plan = packItems(suitcase({ maxWeight: 10 }), [overReserve, overBox], 'comfort', { space: 0, weight: 0.5 });
    const reasons = new Map(plan.unplaced.map((entry) => [entry.item.id, entry.reason]));
    expect(reasons.get('reserved')).toContain('受重量预留限制');
    expect(reasons.get('impossible')).toContain('箱体承重本身不足');
  });

  it('distinguishes space reserve limits from suitcase volume limits', () => {
    const overReserve = item('reserved', { length: 4, width: 4, height: 4 });
    const overBox = item('impossible', { length: 9, width: 9, height: 9 });
    const plan = packItems(suitcase(), [overReserve, overBox], 'comfort', { space: 0.9, weight: 0 });
    const reasons = new Map(plan.unplaced.map((entry) => [entry.item.id, entry.reason]));
    expect(reasons.get('reserved')).toContain('受空间预留限制');
    expect(reasons.get('impossible')).toContain('箱体空间本身不足');
  });
});
