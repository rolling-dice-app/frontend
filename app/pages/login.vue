<template>
  <div class="mx-auto max-w-md px-4 py-12 h-120 flex flex-col justify-center items-center">
    <h1 class="mb-6 font-display text-2xl">跳轉中...</h1>

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
import { isOAuthErrorCode } from '@rolling-dice-app/core'
import { OAUTH_ERROR_MESSAGES, OAUTH_ERROR_FALLBACK_MESSAGE } from '~/constants/auth-error-messages'

const route = useRoute()

const errorMessage = computed(() => {
  const code = route.query.error
  if (typeof code !== 'string') return null
  if (isOAuthErrorCode(code)) return OAUTH_ERROR_MESSAGES[code]
  console.warn('[login] unknown OAuth error code:', code)
  return OAUTH_ERROR_FALLBACK_MESSAGE
})

// 沒帶 ?error= 進來代表沒事在這頁，導回首頁
// if (typeof route.query.error !== 'string') {
setTimeout(async () => await navigateTo('/', { replace: true }), 1000)

// }

useHead({ title: '登入結果' })
</script>
