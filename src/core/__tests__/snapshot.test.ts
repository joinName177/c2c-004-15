import { describe, expect, it } from 'vitest';
import { normalizeSnapshot } from '../snapshot';
import { createSampleSnapshot } from '../sample-data';
import { DEFAULT_RESERVES } from '../reserves';

describe('normalizeSnapshot', () => {
  it('migrates legacy snapshots without reserves using the old fixed ratios', () => {
    const legacy = { ...createSampleSnapshot() } as Partial<ReturnType<typeof createSampleSnapshot>>;
    delete legacy.reserves;
    const { value, warning } = normalizeSnapshot(legacy);
    expect(warning).toBeUndefined();
    expect(value.reserves).toEqual(DEFAULT_RESERVES);
  });

  it('keeps custom reserves from new snapshots', () => {
    const current = createSampleSnapshot();
    current.reserves.shopping = { spaceReserve: 0.5, weightReserve: 0.1 };
    expect(normalizeSnapshot(current).value.reserves.shopping).toEqual({ spaceReserve: 0.5, weightReserve: 0.1 });
  });

  it('falls back to the sample with a warning when the structure is broken', () => {
    const result = normalizeSnapshot({ suitcase: null, items: [] });
    expect(result.warning).toContain('已恢复示例');
    expect(result.value.reserves).toEqual(DEFAULT_RESERVES);
  });

  it('falls back when JSON payload is not an object', () => {
    expect(normalizeSnapshot(42).warning).toContain('无法识别');
  });

  it('resets an unknown selected plan to comfort', () => {
    const legacy = { ...createSampleSnapshot(), selectedPlan: 'turbo' };
    expect(normalizeSnapshot(legacy).value.selectedPlan).toBe('comfort');
  });
});
