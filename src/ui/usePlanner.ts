import { computed, reactive, ref } from 'vue';
import { createSampleSnapshot } from '../core/sample-data';
import { generatePlans } from '../core/plan-service';
import { detectRisks } from '../core/risk-engine';
import { validateReserves } from '../core/reserves';
import type { PackingItem, PackingSnapshot, PlanMode, PlanReserveSet, Suitcase } from '../core/models';
import type { PlannerRepository } from '../ports/planner-repository.port';
import type { PrintPort } from '../ports/print.port';

export interface PlannerDependencies { repository: PlannerRepository; printPort: PrintPort }

export function usePlanner({ repository, printPort }: PlannerDependencies) {
  const loaded = repository.load();
  const state = reactive<PackingSnapshot>(loaded.value);
  const notice = ref(loaded.warning ?? '');
  const isStale = ref(false);
  const plans = ref(generatePlans(state.suitcase, state.items, state.reserves));
  const currentPlan = computed(() => plans.value[state.selectedPlan]);
  const risks = computed(() => detectRisks(currentPlan.value, state.suitcase, state.items));
  const reserveErrors = computed(() => validateReserves(state.reserves));

  const save = () => repository.save(JSON.parse(JSON.stringify(state)) as PackingSnapshot);
  const markStale = () => { isStale.value = true; if (reserveErrors.value.length === 0) save(); };

  function addItem(item: PackingItem) { state.items.push(item); markStale(); }
  function updateItem(id: string, patch: Partial<PackingItem>) {
    const index = state.items.findIndex((item) => item.id === id);
    if (index >= 0) state.items[index] = { ...state.items[index], ...patch } as PackingItem;
    markStale();
  }
  function removeItem(id: string) { state.items = state.items.filter((item) => item.id !== id); markStale(); }
  function updateSuitcase(patch: Partial<Suitcase>) { Object.assign(state.suitcase, patch); markStale(); }
  function updateReserves(next: PlanReserveSet) {
    // 越界值不进入状态也不允许保存。
    if (validateReserves(next).length > 0) {
      notice.value = '预留比例必须在 0–100% 之间，修改未保存';
      return;
    }
    state.reserves = next;
    markStale();
  }
  function regenerate() {
    if (reserveErrors.value.length > 0) {
      notice.value = reserveErrors.value[0];
      return;
    }
    plans.value = generatePlans(state.suitcase, state.items, state.reserves);
    isStale.value = false; notice.value = '三套方案已重新计算'; save();
  }
  function selectPlan(mode: PlanMode) { state.selectedPlan = mode; save(); }
  function resetSample() {
    const sample = createSampleSnapshot();
    Object.assign(state, sample);
    plans.value = generatePlans(state.suitcase, state.items, state.reserves);
    isStale.value = false;
    notice.value = '已恢复登机箱示例';
    save();
  }

  return {
    state, notice, isStale, plans, currentPlan, risks, reserveErrors,
    addItem, updateItem, removeItem, updateSuitcase, updateReserves,
    regenerate, selectPlan, resetSample,
    print: () => printPort.print(),
  };
}
