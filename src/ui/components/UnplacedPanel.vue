<script setup lang="ts">
import type { PackingPlan } from '../../core/models';

defineProps<{ plan: PackingPlan }>();
</script>

<template>
  <section class="panel unplaced-panel">
    <div class="section-title">
      <div><span>UNPLACED</span><h2>未装入说明</h2></div>
      <b>{{ plan.unplaced.length }} 件</b>
    </div>
    <p v-if="plan.unplaced.length === 0" class="unplaced-empty">全部物品均已装入当前方案。</p>
    <ul v-else class="unplaced-list">
      <li v-for="entry in plan.unplaced" :key="entry.item.id" :data-cause="entry.cause">
        <strong>{{ entry.item.name }}</strong>
        <em :class="entry.cause.startsWith('box') || entry.cause === 'invalid' ? 'tag box' : 'tag reserve'">
          {{ entry.cause.startsWith('weight') ? '重量预留' : entry.cause.startsWith('volume') ? '空间预留' : entry.cause === 'invalid' ? '物品无效' : '箱体不足' }}
        </em>
        <span>{{ entry.reason }}</span>
      </li>
    </ul>
  </section>
</template>
