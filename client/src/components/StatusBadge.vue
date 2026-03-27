<script setup lang="ts">
import { computed } from 'vue';
import { TruckStatus } from '../types/truck';

const props = defineProps<{ status: TruckStatus }>();

const colorMap: Record<TruckStatus, string> = {
  [TruckStatus.OutOfService]: '#ef4444',
  [TruckStatus.Loading]: '#f59e0b',
  [TruckStatus.ToJob]: '#3b82f6',
  [TruckStatus.AtJob]: '#8b5cf6',
  [TruckStatus.Returning]: '#10b981',
};

const color = computed(() => colorMap[props.status] ?? '#6b7280');
</script>

<template>
  <span class="status-badge" :style="{ backgroundColor: color }">
    {{ status }}
  </span>
</template>

<style>
.status-badge {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 12px;
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
}
</style>
