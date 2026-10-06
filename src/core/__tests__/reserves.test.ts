import { describe, expect, it } from 'vitest';
import { DEFAULT_RESERVES, normalizeReserves, validateReserves } from '../reserves';
import type { PlanReserveSet } from '../models';

describe('normalizeReserves', () => {
  it('uses legacy fixed ratios when reserves are missing', () => {
    expect(normalizeReserves(undefined)).toEqual(DEFAULT_RESERVES);
  });

  it('keeps valid per-mode values and only backfills missing ones', () => {
    const normalized = normalizeReserves({
      minimal: { spaceReserve: 0.1 },
      shopping: { spaceReserve: 0.6, weightReserve: 0.2 },
    });
    expect(normalized.minimal.spaceReserve).toBe(0.1);
    expect(normalized.minimal.weightReserve).toBe(DEFAULT_RESERVES.minimal.weightReserve);
    expect(normalized.comfort).toEqual(DEFAULT_RESERVES.comfort);
    expect(normalized.shopping).toEqual({ spaceReserve: 0.6, weightReserve: 0.2 });
  });

  it.each([-0.01, 1.01, NaN, '0.2', null])('falls back to the default for out-of-range value %s', (bad) => {
    const normalized = normalizeReserves({ comfort: { spaceReserve: bad as number, weightReserve: bad as number } });
    expect(normalized.comfort).toEqual(DEFAULT_RESERVES.comfort);
  });

  it('accepts the full range including both endpoints', () => {
    const normalized = normalizeReserves({ comfort: { spaceReserve: 0, weightReserve: 1 } });
    expect(normalized.comfort).toEqual({ spaceReserve: 0, weightReserve: 1 });
  });
});

describe('validateReserves', () => {
  it('accepts the default reserve set', () => {
    expect(validateReserves(DEFAULT_RESERVES)).toEqual([]);
  });

  it('rejects values outside 0–1 with a per-plan message', () => {
    const bad = { ...DEFAULT_RESERVES, shopping: { spaceReserve: 1.2, weightReserve: -0.4 } } as unknown as PlanReserveSet;
    expect(validateReserves(bad)).toEqual(expect.arrayContaining(['购物版空间预留必须在 0–100% 之间', '购物版重量预留必须在 0–100% 之间']));
  });
});
