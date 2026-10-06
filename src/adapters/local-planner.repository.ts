import { createSampleSnapshot } from '../core/sample-data';
import { normalizeSnapshot } from '../core/snapshot';
import { validateReserves } from '../core/reserves';
import type { PackingSnapshot } from '../core/models';
import type { LoadResult, PlannerRepository } from '../ports/planner-repository.port';

const KEY = 'c2c-004.planner';

export class LocalPlannerRepository implements PlannerRepository {
  constructor(private readonly storage: Storage) {}

  load(): LoadResult<PackingSnapshot> {
    const raw = this.storage.getItem(KEY);
    if (!raw) return { value: createSampleSnapshot() };
    try {
      return normalizeSnapshot(JSON.parse(raw));
    } catch {
      return { value: createSampleSnapshot(), warning: '本地数据无法读取，已恢复示例。' };
    }
  }

  save(snapshot: PackingSnapshot): void {
    // 越界预留不允许落盘，防止下一次加载时出现非法额度。
    if (validateReserves(snapshot.reserves).length > 0) {
      throw new Error('预留比例超出 0–100% 范围，无法保存');
    }
    this.storage.setItem(KEY, JSON.stringify(snapshot));
  }
}
