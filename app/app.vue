<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>

<script setup lang="ts">
const route = useRoute()
const url = useRequestURL()
const { t } = useI18n()

const baseURL = useRuntimeConfig().app.baseURL
const ogImageUrl = () => `${url.origin}${baseURL}og-image.png`

useHead({
  titleTemplate: (title?: string) => (title ? `${title} | Rolling Dice` : 'Rolling Dice'),
  link: [{ rel: 'canonical', href: () => url.href }],
  meta: [{ name: 'theme-color', content: '#231f20' }],
})

useSeoMeta({
  description: () => t('ui.seo.siteDescription'),
  ogSiteName: 'Rolling Dice',
  ogType: 'website',
  ogLocale: 'zh_TW',
  ogTitle: 'Rolling Dice',
  ogDescription: () => t('ui.seo.siteDescription'),
  ogUrl: () => url.href,
  ogImage: ogImageUrl,
  twitterCard: 'summary_large_image',
  twitterTitle: 'Rolling Dice',
  twitterDescription: () => t('ui.seo.siteDescription'),
  twitterImage: ogImageUrl,
  robots: () => (route.meta.noindex ? 'noindex, nofollow' : 'index, follow'),
})
</script>
