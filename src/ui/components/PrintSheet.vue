<script setup lang="ts">
import type { PackingItem, PackingPlan, Risk, Suitcase } from '../../core/models';
import { formatVolume, formatWeight } from '../format';

defineProps<{ suitcase: Suitcase; items: PackingItem[]; plan: PackingPlan; risks: Risk[] }>();
</script>

<template><section class="print-sheet">
  <h1>行李箱空间规划单</h1>
  <p>{{ suitcase.length }} × {{ suitcase.width }} × {{ suitcase.height }} cm · 箱体限重 {{ suitcase.maxWeight }} kg</p>
  <h2>{{ plan.name }}</h2>
  <p class="print-quota">
    空间预留 {{ Math.round(plan.reserves.spaceReserve * 100) }}%（{{ formatVolume(plan.reservedVolume) }}），
    可用 {{ formatVolume(plan.usableVolume) }}；已用 {{ formatVolume(plan.usedVolume) }}，剩余 {{ formatVolume(Math.max(0, plan.usableVolume - plan.usedVolume)) }}。<br>
    重量预留 {{ Math.round(plan.reserves.weightReserve * 100) }}%（{{ formatWeight(plan.reservedWeight) }}），
    可用 {{ formatWeight(plan.usableWeight) }}；已用 {{ formatWeight(plan.totalWeight) }}，剩余 {{ formatWeight(Math.max(0, plan.usableWeight - plan.totalWeight)) }}。
  </p>
  <h3>装入清单（{{ plan.placements.length }} 件）</h3>
  <ol>
    <li v-for="item in items.filter(i => plan.placements.some(p => p.itemId === i.id))" :key="item.id">□ {{ item.name }} — {{ item.weight }} kg</li>
  </ol>
  <h3 v-if="plan.unplaced.length">未装入（{{ plan.unplaced.length }} 件）</h3>
  <p v-for="entry in plan.unplaced" :key="entry.item.id">× {{ entry.item.name }} — {{ entry.reason }}</p>
  <h3>风险提示</h3>
  <p v-for="risk in risks" :key="risk.id">{{ risk.title }}：{{ risk.message }}</p>
</section></template>
