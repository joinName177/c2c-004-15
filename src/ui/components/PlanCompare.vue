<script setup lang="ts">
import type { PackingPlan, PlanMode, Suitcase } from '../../core/models';
import { formatVolume, formatWeight } from '../format';

defineProps<{ plans: Record<PlanMode, PackingPlan>; selected: PlanMode; suitcase: Suitcase }>();
const emit = defineEmits<{ select: [mode: PlanMode] }>();
</script>

<template>
  <div class="plan-tabs">
    <button v-for="plan in plans" :key="plan.id" type="button" :data-plan="plan.id" :class="{ active: plan.id === selected }" @click="emit('select', plan.id)">
      <span>{{ plan.id === 'minimal' ? 'LIGHT' : plan.id === 'comfort' ? 'BALANCED' : 'RESERVE' }}</span>
      <strong>{{ plan.name }}</strong>
      <small>{{ plan.placements.length }} 件装入 · {{ plan.unplaced.length }} 件未装</small>
      <small class="quota">空间 用 {{ formatVolume(plan.usedVolume) }} / 留 {{ formatVolume(plan.reservedVolume) }} / 余 {{ formatVolume(Math.max(0, plan.usableVolume - plan.usedVolume)) }}</small>
      <small class="quota">承重 用 {{ formatWeight(plan.totalWeight) }} / 留 {{ formatWeight(plan.reservedWeight) }} / 余 {{ formatWeight(Math.max(0, plan.usableWeight - plan.totalWeight)) }}</small>
    </button>
  </div>
</template>
