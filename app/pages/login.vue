<template>
  <div class="mx-auto max-w-md px-4 py-12 h-120 flex flex-col gap-4 justify-center items-center">
    <h1 class="mb-6 font-display text-2xl">{{ t('ui.auth.redirecting') }}</h1>

    <p
      v-if="errorMessage"
      role="alert"
      class="mb-6 rounded border border-danger/40 bg-danger/10 p-3 text-sm text-danger"
    >
      {{ errorMessage }}
    </p>
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n()
const route = useRoute()
const logger = createLogger('[login]')

const errorCode = route.query.error
const hasError = typeof errorCode === 'string'

// 沒帶 ?error= 代表沒事停在這頁，立即導回首頁（不留 timer，避免離頁後 fire 的 race）
if (!hasError) {
  await navigateTo('/', { replace: true })
}

if (hasError) {
  // 前端不解析後端錯誤碼；原始 code 留在 log 供工程師追查，user 看通用訊息
  logger.error('[OAuth redirect error]', { code: errorCode })
}

const errorMessage = computed(() => (hasError ? t('ui.message.systemError') : null))

definePageMeta({ noindex: true })

useHead({ title: t('ui.auth.authResult') })
</script>
