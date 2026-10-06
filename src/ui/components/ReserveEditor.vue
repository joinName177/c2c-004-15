<script setup lang="ts">
import { computed } from 'vue';
import { PLAN_MODES } from '../../core/reserves';
import type { PlanMode, PlanReserveSet } from '../../core/models';

const props = defineProps<{ reserves: PlanReserveSet; errors: string[] }>();
const emit = defineEmits<{ update: [next: PlanReserveSet] }>();

const rows = computed(() => PLAN_MODES.map((mode: PlanMode) => ({ mode, ...props.reserves[mode] })));

function patch(mode: PlanMode, key: 'spaceReserve' | 'weightReserve', event: Event) {
  const ratio = Number((event.target as HTMLInputElement).value) / 100;
  emit('update', {
    ...props.reserves,
    [mode]: { ...props.reserves[mode], [key]: ratio },
  });
}
</script>

<template>
  <section class="panel reserve-editor">
    <div class="section-title">
      <div><span>02 / RESERVES</span><h2>预留设置</h2></div>
      <b>空间 / 重量独立</b>
    </div>
    <p class="reserve-hint">空间与重量分别预留，互不折算；0% 可用满，100% 不装任何物品。</p>
    <div v-for="row in rows" :key="row.mode" class="reserve-row" :data-plan="row.mode">
      <strong>{{ { minimal: '精简版', comfort: '舒适版', shopping: '购物版' }[row.mode] }}</strong>
      <label>空间预留 <span>{{ Math.round(row.spaceReserve * 100) }}%</span>
        <input type="range" min="0" max="100" step="1" :value="Math.round(row.spaceReserve * 100)" :aria-label="`${row.mode}空间预留百分比`" @input="patch(row.mode, 'spaceReserve', $event)" />
      </label>
      <label>重量预留 <span>{{ Math.round(row.weightReserve * 100) }}%</span>
        <input type="range" min="0" max="100" step="1" :value="Math.round(row.weightReserve * 100)" :aria-label="`${row.mode}重量预留百分比`" @input="patch(row.mode, 'weightReserve', $event)" />
      </label>
    </div>
    <p v-for="error in errors" :key="error" class="field-error">{{ error }}</p>
  </section>
</template>
