import { createDefaultReserves, packItems } from './packing-engine';
import type { PackingItem, PackingPlan, PlanMode, PlanReserves, Suitcase } from './models';

export function generatePlans(suitcase: Suitcase, items: PackingItem[], reserves: PlanReserves = createDefaultReserves()): Record<PlanMode, PackingPlan> {
  return {
    minimal: packItems(suitcase, items, 'minimal', reserves.minimal),
    comfort: packItems(suitcase, items, 'comfort', reserves.comfort),
    shopping: packItems(suitcase, items, 'shopping', reserves.shopping),
  };
}
