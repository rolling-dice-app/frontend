<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>

<script setup lang="ts">
const route = useRoute()
const url = useRequestURL()
const { t } = useI18n()
const authStore = useAuthStore()

const baseURL = useRuntimeConfig().app.baseURL
const ogImageUrl = () => `${url.origin}${baseURL}og-image.png`
// canonical / og:url 由 route 派生並納入 baseURL：baseURL 結尾帶 '/'，故 fullPath 去掉前導 '/' 再接。
const canonicalUrl = () => `${url.origin}${baseURL}${route.fullPath.replace(/^\//, '')}`

// session 中途 401 時 apiFetch 攔截器會清空登入狀態（見 plugins/api-fetch.ts）；
// 若當下停在受保護頁（middleware 含 'auth'），watch 到登出後主動導回首頁。
// SSR 期 isLoggedIn 恆為 null、不會 flip，故此 watch 僅在 client session 失效時觸發。
watch(
  () => authStore.isLoggedIn,
  (loggedIn) => {
    if (loggedIn) return
    const middleware = route.meta.middleware
    const requiresAuth = Array.isArray(middleware)
      ? middleware.includes('auth')
      : middleware === 'auth'
    if (requiresAuth) void navigateTo('/')
  },
)

useHead({
  titleTemplate: (title?: string) => (title ? `${title} | Rolling Dice` : 'Rolling Dice'),
  link: [{ rel: 'canonical', href: canonicalUrl }],
  meta: [{ name: 'theme-color', content: '#231f20' }],
})

useSeoMeta({
  description: () => t('ui.seo.siteDescription'),
  ogSiteName: 'Rolling Dice',
  ogType: 'website',
  ogLocale: 'zh_TW',
  ogTitle: 'Rolling Dice',
  ogDescription: () => t('ui.seo.siteDescription'),
  ogUrl: canonicalUrl,
  ogImage: ogImageUrl,
  twitterCard: 'summary_large_image',
  twitterTitle: 'Rolling Dice',
  twitterDescription: () => t('ui.seo.siteDescription'),
  twitterImage: ogImageUrl,
  robots: () => (route.meta.noindex ? 'noindex, nofollow' : 'index, follow'),
})
</script>
