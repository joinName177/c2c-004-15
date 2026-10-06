import { createSampleSnapshot } from './sample-data';
import { normalizeReserves } from './reserves';
import type { PackingItem, PackingSnapshot, PlanMode, Suitcase } from './models';

const PLAN_MODES: PlanMode[] = ['minimal', 'comfort', 'shopping'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function normalizeSuitcase(value: unknown): Suitcase | null {
  if (!isRecord(value)) return null;
  const dims = [value.length, value.width, value.height, value.maxWeight];
  if (!dims.every(isFiniteNumber)) return null;
  const [length, width, height, maxWeight] = dims as [number, number, number, number];
  return { length, width, height, maxWeight };
}

function normalizeItems(value: unknown): PackingItem[] | null {
  if (!Array.isArray(value)) return null;
  const items: PackingItem[] = [];
  for (const entry of value) {
    if (!isRecord(entry)) return null;
    if (typeof entry.id !== 'string' || typeof entry.name !== 'string' || typeof entry.category !== 'string') return null;
    const dims = [entry.length, entry.width, entry.height, entry.weight];
    if (!dims.every(isFiniteNumber)) return null;
    if (entry.priority !== 1 && entry.priority !== 2 && entry.priority !== 3) return null;
    const [length, width, height, weight] = dims as [number, number, number, number];
    items.push({
      id: entry.id, name: entry.name, category: entry.category,
      length, width, height, weight,
      priority: entry.priority,
      mustHave: Boolean(entry.mustHave),
      ...(typeof entry.fragile === 'boolean' ? { fragile: entry.fragile } : {}),
    });
  }
  return items;
}

/**
 * 规整持久化快照。旧数据没有 reserves 字段（或字段残缺/越界）时，
 * 对应项沿用历史固定比例迁移，保证旧方案的装箱结果与之前一致。
 * 整体结构损坏（箱体/物品/方案不可识别）时回退示例数据并给出警告。
 */
export function normalizeSnapshot(raw: unknown): { value: PackingSnapshot; warning?: string } {
  if (!isRecord(raw)) return { value: createSampleSnapshot(), warning: '本地数据格式无法识别，已恢复示例。' };

  const suitcase = normalizeSuitcase(raw.suitcase);
  const items = normalizeItems(raw.items);
  if (!suitcase || !items) return { value: createSampleSnapshot(), warning: '本地数据无法读取，已恢复示例。' };

  const selectedPlan = PLAN_MODES.includes(raw.selectedPlan as PlanMode)
    ? raw.selectedPlan as PlanMode
    : 'comfort';

  return {
    value: {
      suitcase,
      items,
      selectedPlan,
      reserves: normalizeReserves(raw.reserves),
    },
  };
}
