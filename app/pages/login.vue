<template>
  <div class="mx-auto max-w-md px-4 py-12">
    <h1 class="mb-6 font-display text-2xl">登入</h1>

    <p
      v-if="errorMessage"
      role="alert"
      class="mb-4 rounded border border-danger/40 bg-danger/10 p-3 text-sm text-danger"
    >
      {{ errorMessage }}
    </p>

    <Button class="w-full" @click="handleLogin">使用 Google 登入</Button>
  </div>
</template>

<script setup lang="ts">
import { Button } from '@ui'
import { isOAuthErrorCode } from '@rolling-dice-app/core'
import { OAUTH_ERROR_MESSAGES, OAUTH_ERROR_FALLBACK_MESSAGE } from '~/constants/auth-error-messages'

const route = useRoute()
const auth = useAuthStore()

const next = computed(() => {
  const raw = route.query.next
  return typeof raw === 'string' && raw.length > 0 ? raw : '/'
})

const errorMessage = computed(() => {
  const code = route.query.error
  if (typeof code !== 'string') return null
  if (isOAuthErrorCode(code)) return OAUTH_ERROR_MESSAGES[code]
  console.warn('[login] unknown OAuth error code:', code)
  return OAUTH_ERROR_FALLBACK_MESSAGE
})

watchEffect(() => {
  if (auth.isLoggedIn) {
    navigateTo(next.value)
  }
})

const handleLogin = () => {
  auth.login(next.value)
}

useHead({ title: '登入' })
</script>
