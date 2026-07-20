<template>
  <!-- 純視覺（數值另以文字呈現），對 AT 隱藏 -->
  <div
    class="relative h-2 overflow-hidden rounded-full border border-border-soft bg-canvas-inset"
    aria-hidden="true"
  >
    <div
      class="absolute inset-y-0 left-0 rounded-sm"
      :class="fillClass"
      :style="{ width: `${fillPercent}%` }"
    />
    <div
      v-if="tempPercent > 0"
      class="absolute inset-y-0 right-0 bg-info opacity-85"
      :style="{ width: `${tempPercent}%` }"
    />
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  currentHp: number
  maxHp: number
  tempHp: number
}>()

const fillPercent = computed(() => {
  if (props.maxHp <= 0) return 0
  return Math.min(Math.max((props.currentHp / props.maxHp) * 100, 0), 100)
})

// 臨時 HP 從右側疊入、封頂 40% 寬，只作份量提示不與主條同尺度
const tempPercent = computed(() => {
  if (props.maxHp <= 0 || props.tempHp <= 0) return 0
  return Math.min((props.tempHp / props.maxHp) * 100, 40)
})

const fillClass = computed(() => {
  const tier = hpRatioTier(props.currentHp, props.maxHp)
  if (tier === 'crit') return 'bg-danger'
  if (tier === 'low') return 'bg-warning'
  return 'bg-success'
})
</script>
