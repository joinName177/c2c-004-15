<script setup lang="ts">
import type { PackingItem, PackingPlan, Risk, Suitcase } from '../../core/models';
defineProps<{ suitcase: Suitcase; items: PackingItem[]; plan: PackingPlan; risks: Risk[] }>();
const liters = (cm3: number) => (cm3 / 1000).toFixed(1);
</script>

<template><section class="print-sheet"><h1>行李箱空间规划单</h1><p>{{ suitcase.length }} × {{ suitcase.width }} × {{ suitcase.height }} cm · 限重 {{ suitcase.maxWeight }} kg</p><h2>{{ plan.name }}</h2><p>预留：空间 {{ Math.round(plan.reserve.space * 100) }}% · 重量 {{ Math.round(plan.reserve.weight * 100) }}%；额度：空间 已用 {{ liters(plan.usedVolume) }} / {{ liters(plan.volumeAllowance) }} L（余 {{ liters(plan.volumeAllowance - plan.usedVolume) }} L）· 承重 已用 {{ plan.totalWeight.toFixed(1) }} / {{ plan.weightAllowance.toFixed(1) }} kg（余 {{ (plan.weightAllowance - plan.totalWeight).toFixed(1) }} kg）</p><ol><li v-for="item in items" :key="item.id">{{ plan.placements.some(p => p.itemId === item.id) ? '□' : '×' }} {{ item.name }} — {{ item.weight }} kg</li></ol><template v-if="plan.unplaced.length"><h3>未装入物品</h3><p v-for="entry in plan.unplaced" :key="entry.item.id">{{ entry.item.name }}：{{ entry.reason }}</p></template><h3>风险提示</h3><p v-for="risk in risks" :key="risk.id">{{ risk.title }}：{{ risk.message }}</p></section></template>
