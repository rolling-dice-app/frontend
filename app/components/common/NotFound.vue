<template>
  <div class="flex flex-col items-center gap-4 py-16">
    <p class="text-content-muted">{{ message ?? t('ui.notFound.resource') }}</p>
    <NuxtLink
      :to="backTo"
      class="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-content-inverse transition-colors hover:bg-primary-hover"
    >
      {{ backLabel ?? t('ui.notFound.backToHome') }}
    </NuxtLink>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    message?: string
    backTo?: string
    backLabel?: string
  }>(),
  {
    message: undefined,
    backTo: '/',
    backLabel: undefined,
  },
)

const { t } = useI18n()
</script>
