import { describe, expect, it } from 'vitest';
import { generatePlans } from '../plan-service';
import { DEFAULT_RESERVES } from '../reserves';
import type { PackingItem, Suitcase } from '../models';

const box: Suitcase = { length: 10, width: 8, height: 6, maxWeight: 10 };
const item = (id: string, overrides: Partial<PackingItem> = {}): PackingItem => ({ id, name: id, category: '衣物', length: 4, width: 2, height: 2, weight: 1, priority: 1, mustHave: false, ...overrides });

describe('generatePlans', () => {
  it('creates three named strategies', () => {
    const plans = generatePlans(box, [item('coat')], DEFAULT_RESERVES);
    expect(Object.keys(plans)).toEqual(['minimal', 'comfort', 'shopping']);
    expect(Object.values(plans).map((plan) => plan.name)).toEqual(['精简版', '舒适版', '购物版']);
  });

  it('places must-have and high-priority items first', () => {
    const plans = generatePlans(box, [item('low'), item('must', { mustHave: true }), item('high', { priority: 3 })], DEFAULT_RESERVES);
    expect(plans.comfort.placements.map((p) => p.itemId).slice(0, 2)).toEqual(['must', 'high']);
  });

  it('shopping mode reserves more free capacity than comfort mode', () => {
    const items = Array.from({ length: 8 }, (_, index) => item(`item-${index}`, { length: 5, width: 3, height: 2 }));
    const plans = generatePlans(box, items, DEFAULT_RESERVES);
    expect(plans.shopping.usedVolume).toBeLessThanOrEqual(plans.comfort.usedVolume);
    expect(plans.shopping.unplaced.length).toBeGreaterThanOrEqual(plans.comfort.unplaced.length);
  });

  it('honors per-mode space and weight reserves configured independently', () => {
    const reserves = {
      minimal: { spaceReserve: 0, weightReserve: 0.5 },
      comfort: { spaceReserve: 0, weightReserve: 0 },
      shopping: { spaceReserve: 0.5, weightReserve: 0 },
    };

    // 重物 2kg/件：重量预留 50% 把可用承重压到 5kg，空间完全不预留。
    const heavyItems = Array.from({ length: 8 }, (_, index) => item(`heavy-${index}`, { weight: 2 }));
    const heavyPlans = generatePlans(box, heavyItems, reserves);
    expect(heavyPlans.minimal.totalWeight).toBeLessThanOrEqual(5);
    expect(heavyPlans.minimal.unplaced.some((entry) => entry.cause === 'weight-reserve')).toBe(true);

    // 轻物 0.1kg/件、共 20 件（320cm³ > 50% 预留后的 240cm³ 可用额度），重量永不触顶。
    const lightItems = Array.from({ length: 20 }, (_, index) => item(`light-${index}`, { weight: 0.1 }));
    const lightPlans = generatePlans(box, lightItems, reserves);
    expect(lightPlans.shopping.unplaced.length).toBeGreaterThan(0);
    expect(lightPlans.shopping.unplaced.every((entry) => entry.cause !== 'weight-reserve')).toBe(true);
    expect(lightPlans.shopping.unplaced.some((entry) => entry.cause === 'volume-reserve')).toBe(true);
  });
});
