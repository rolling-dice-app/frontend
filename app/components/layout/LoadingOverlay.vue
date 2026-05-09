<template>
  <div
    v-if="isLoading"
    role="progressbar"
    :aria-valuenow="progress"
    aria-valuemin="0"
    aria-valuemax="100"
    :aria-label="t('ui.aria.pageLoading')"
    class="fixed left-0 top-0 z-9999 h-0.5 bg-primary transition-all duration-300 ease-out"
    :style="{ width: `${progress}%` }"
  />
</template>

<script setup lang="ts">
const { t } = useI18n()
const { isLoading, progress } = useLoadingIndicator()
</script>
