import { beforeEach, describe, expect, it } from 'vitest';
import { LocalPlannerRepository } from '../local-planner.repository';
import { createSampleSnapshot } from '../../core/sample-data';
import { DEFAULT_RESERVES } from '../../core/reserves';

class MemoryStorage implements Storage {
  private data = new Map<string, string>();
  get length() { return this.data.size; }
  clear() { this.data.clear(); }
  getItem(key: string) { return this.data.get(key) ?? null; }
  key(index: number) { return [...this.data.keys()][index] ?? null; }
  removeItem(key: string) { this.data.delete(key); }
  setItem(key: string, value: string) { this.data.set(key, value); }
}

const KEY = 'c2c-004.planner';

describe('LocalPlannerRepository', () => {
  const storage = new MemoryStorage();
  beforeEach(() => storage.clear());

  it('round trips a planning snapshot', () => {
    const repo = new LocalPlannerRepository(storage);
    const sample = createSampleSnapshot();
    const snapshot = { ...sample, suitcase: { ...sample.suitcase, length: 61 } };
    repo.save(snapshot);
    expect(repo.load().value.suitcase.length).toBe(61);
  });

  it('returns sample data when storage is empty', () => {
    const result = new LocalPlannerRepository(storage).load();
    expect(result.value.items.length).toBeGreaterThan(0);
    expect(result.warning).toBeUndefined();
  });

  it('returns sample data and a warning for malformed JSON', () => {
    storage.setItem(KEY, '{bad');
    const result = new LocalPlannerRepository(storage).load();
    expect(result.value.items.length).toBeGreaterThan(0);
    expect(result.warning).toContain('已恢复示例');
  });

  it('migrates legacy snapshots without reserves to the original fixed ratios', () => {
    const legacy = createSampleSnapshot() as Partial<ReturnType<typeof createSampleSnapshot>>;
    delete legacy.reserves;
    storage.setItem(KEY, JSON.stringify(legacy));
    const result = new LocalPlannerRepository(storage).load();
    expect(result.value.reserves).toEqual(DEFAULT_RESERVES);
  });

  it('throws instead of persisting reserves outside the allowed range', () => {
    const repo = new LocalPlannerRepository(storage);
    const snapshot = createSampleSnapshot();
    snapshot.reserves.minimal = { spaceReserve: 2, weightReserve: 0 };
    expect(() => repo.save(snapshot)).toThrow(/无法保存/);
    expect(storage.getItem(KEY)).toBeNull();
  });
});
