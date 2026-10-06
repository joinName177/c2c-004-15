<script setup lang="ts">
import type { PackingPlan, PlanMode, PlanReserve, PlanReserves, Suitcase } from '../../core/models';
defineProps<{ plans: Record<PlanMode, PackingPlan>; reserves: PlanReserves; selected: PlanMode; suitcase: Suitcase }>();
const emit = defineEmits<{ select: [mode: PlanMode]; updateReserve: [mode: PlanMode, patch: Partial<PlanReserve>] }>();
const liters = (cm3: number) => (cm3 / 1000).toFixed(1);
const percentOf = (ratio: number) => Math.round(ratio * 100);
function onReserve(mode: PlanMode, key: keyof PlanReserve, event: Event) {
  const value = Number((event.target as HTMLInputElement).value) / 100;
  emit('updateReserve', mode, key === 'space' ? { space: value } : { weight: value });
}
</script>

<template>
  <div class="plan-tabs">
    <article v-for="plan in plans" :key="plan.id" class="plan-card" :class="{ active: plan.id === selected }" :data-plan="plan.id" role="button" tabindex="0" @click="emit('select', plan.id)" @keydown.enter="emit('select', plan.id)">
      <header class="plan-head">
        <span>{{ plan.id === 'minimal' ? 'LIGHT' : plan.id === 'comfort' ? 'BALANCED' : 'RESERVE' }}</span>
        <strong>{{ plan.name }}</strong>
        <small>{{ plan.placements.length }} 件装入 · {{ plan.unplaced.length }} 件未装</small>
      </header>
      <dl class="plan-quotas">
        <div><dt>空间</dt><dd>已用 {{ liters(plan.usedVolume) }} / {{ liters(plan.volumeAllowance) }} L · 余 {{ liters(plan.volumeAllowance - plan.usedVolume) }} L</dd></div>
        <div><dt>承重</dt><dd>已用 {{ plan.totalWeight.toFixed(1) }} / {{ plan.weightAllowance.toFixed(1) }} kg · 余 {{ (plan.weightAllowance - plan.totalWeight).toFixed(1) }} kg</dd></div>
      </dl>
      <div class="reserve-inputs" @click.stop @keydown.stop>
        <label>空间预留<span>%</span><input :aria-label="`${plan.name}空间预留`" type="number" min="0" max="100" step="5" :value="percentOf(reserves[plan.id].space)" @input="onReserve(plan.id, 'space', $event)" /></label>
        <label>重量预留<span>%</span><input :aria-label="`${plan.name}重量预留`" type="number" min="0" max="100" step="5" :value="percentOf(reserves[plan.id].weight)" @input="onReserve(plan.id, 'weight', $event)" /></label>
      </div>
    </article>
  </div>
</template>
