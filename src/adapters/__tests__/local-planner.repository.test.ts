import { beforeEach, describe, expect, it } from 'vitest';
import { LocalPlannerRepository } from '../local-planner.repository';
import { createSampleSnapshot } from '../../core/sample-data';

class MemoryStorage implements Storage {
  private data = new Map<string, string>();
  get length() { return this.data.size; }
  clear() { this.data.clear(); }
  getItem(key: string) { return this.data.get(key) ?? null; }
  key(index: number) { return [...this.data.keys()][index] ?? null; }
  removeItem(key: string) { this.data.delete(key); }
  setItem(key: string, value: string) { this.data.set(key, value); }
}

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
    storage.setItem('c2c-004.planner', '{bad');
    const result = new LocalPlannerRepository(storage).load();
    expect(result.value.items.length).toBeGreaterThan(0);
    expect(result.warning).toContain('已恢复示例');
  });

  it('keeps the legacy ratios for snapshots saved before reserves existed', () => {
    const sample = createSampleSnapshot();
    const legacy = { suitcase: sample.suitcase, items: sample.items, selectedPlan: sample.selectedPlan };
    storage.setItem('c2c-004.planner', JSON.stringify(legacy));
    const result = new LocalPlannerRepository(storage).load();
    expect(result.value.reserves).toEqual({
      minimal: { space: 0.2, weight: 0.2 },
      comfort: { space: 0, weight: 0 },
      shopping: { space: 0.35, weight: 0.35 },
    });
  });

  it('falls back to the default ratio for out-of-range stored reserves', () => {
    const sample = createSampleSnapshot();
    const stored = { ...sample, reserves: { ...sample.reserves, shopping: { space: 1.5, weight: -0.2 } } };
    storage.setItem('c2c-004.planner', JSON.stringify(stored));
    const result = new LocalPlannerRepository(storage).load();
    expect(result.value.reserves.shopping).toEqual({ space: 0.35, weight: 0.35 });
    expect(result.value.reserves.minimal).toEqual({ space: 0.2, weight: 0.2 });
  });
});
