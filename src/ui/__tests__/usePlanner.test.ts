import { describe, expect, it } from 'vitest';
import { createSampleSnapshot } from '../../core/sample-data';
import { DEFAULT_RESERVES } from '../../core/reserves';
import { usePlanner } from '../usePlanner';
import type { PackingSnapshot, PlanReserveSet } from '../../core/models';
import type { PlannerRepository } from '../../ports/planner-repository.port';

class MemoryRepository implements PlannerRepository {
  saved?: PackingSnapshot;
  constructor(private snapshot = createSampleSnapshot()) {}
  load() { return { value: structuredClone(this.snapshot) }; }
  save(snapshot: PackingSnapshot) { this.saved = structuredClone(snapshot); }
}

describe('usePlanner', () => {
  it('adds, updates and removes items while marking results stale', () => {
    const repository = new MemoryRepository();
    const planner = usePlanner({ repository, printPort: { print() {} } });
    const initial = planner.state.items.length;
    planner.addItem({ id: 'new', name: '帽子', category: '衣物', length: 12, width: 12, height: 5, weight: 0.2, priority: 2, mustHave: false });
    expect(planner.state.items).toHaveLength(initial + 1);
    expect(planner.isStale.value).toBe(true);
    planner.updateItem('new', { name: '遮阳帽' });
    expect(planner.state.items.find((item) => item.id === 'new')?.name).toBe('遮阳帽');
    planner.removeItem('new');
    expect(planner.state.items).toHaveLength(initial);
  });

  it('regenerates plans and persists the selected mode', () => {
    const repository = new MemoryRepository();
    const planner = usePlanner({ repository, printPort: { print() {} } });
    planner.updateSuitcase({ maxWeight: 12 });
    expect(planner.isStale.value).toBe(true);
    planner.regenerate();
    planner.selectPlan('shopping');
    expect(planner.isStale.value).toBe(false);
    expect(planner.plans.value.shopping.name).toBe('购物版');
    expect(repository.saved?.selectedPlan).toBe('shopping');
  });

  it('updates space and weight reserves independently and recomputes plan quotas', () => {
    const repository = new MemoryRepository();
    const planner = usePlanner({ repository, printPort: { print() {} } });
    const next: PlanReserveSet = structuredClone(DEFAULT_RESERVES);
    next.shopping = { spaceReserve: 0.5, weightReserve: 0.1 };
    planner.updateReserves(next);
    expect(planner.state.reserves.shopping).toEqual({ spaceReserve: 0.5, weightReserve: 0.1 });
    expect(planner.isStale.value).toBe(true);
    expect(repository.saved?.reserves.shopping).toEqual({ spaceReserve: 0.5, weightReserve: 0.1 });

    planner.regenerate();
    const shopping = planner.plans.value.shopping;
    expect(shopping.usableWeightRatio === 0 || shopping.totalWeight / shopping.usableWeight).toBeGreaterThan(0);
    expect(shopping.reserves).toEqual({ spaceReserve: 0.5, weightReserve: 0.1 });
  });

  it('refuses to save reserves outside the 0–1 range', () => {
    const repository = new MemoryRepository();
    const planner = usePlanner({ repository, printPort: { print() {} } });
    const bad = structuredClone(DEFAULT_RESERVES) as PlanReserveSet;
    bad.comfort = { spaceReserve: 1.5, weightReserve: 0 };
    planner.updateReserves(bad);
    expect(planner.state.reserves.comfort).toEqual(DEFAULT_RESERVES.comfort);
    expect(planner.reserveErrors.value).toEqual([]);
    expect(planner.notice.value).toContain('0–100%');
  });
});
