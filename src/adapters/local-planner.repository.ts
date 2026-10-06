import { createSampleSnapshot } from '../core/sample-data';
import { createDefaultReserves, validateReserve } from '../core/packing-engine';
import type { PackingSnapshot, PlanMode, PlanReserve, PlanReserves } from '../core/models';
import type { LoadResult, PlannerRepository } from '../ports/planner-repository.port';

const KEY = 'c2c-004.planner';
const MODES: PlanMode[] = ['minimal', 'comfort', 'shopping'];

/** 旧快照没有 reserves 字段时沿用原比例；字段缺失或越界的方案回退默认值 */
function normalizeReserves(raw: unknown): PlanReserves {
  const reserves = createDefaultReserves();
  if (!raw || typeof raw !== 'object') return reserves;
  const source = raw as Partial<Record<PlanMode, Partial<PlanReserve>>>;
  for (const mode of MODES) {
    const candidate = source[mode];
    if (!candidate) continue;
    const reserve = { space: Number(candidate.space), weight: Number(candidate.weight) };
    if (validateReserve(reserve).length === 0) reserves[mode] = reserve;
  }
  return reserves;
}

export class LocalPlannerRepository implements PlannerRepository {
  constructor(private readonly storage: Storage) {}

  load(): LoadResult<PackingSnapshot> {
    const raw = this.storage.getItem(KEY);
    if (!raw) return { value: createSampleSnapshot() };
    try {
      const parsed = JSON.parse(raw) as PackingSnapshot;
      return { value: { ...parsed, reserves: normalizeReserves(parsed.reserves) } };
    } catch {
      return { value: createSampleSnapshot(), warning: '本地数据无法读取，已恢复示例。' };
    }
  }

  save(snapshot: PackingSnapshot): void {
    this.storage.setItem(KEY, JSON.stringify(snapshot));
  }
}
