import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  ssr: true,

  nitro: {
    preset: 'vercel',
  },

  routeRules: {
    '/**': {
      isr: false,
      swr: false,
      headers: {
        'cache-control': 'private, no-store',
        'cdn-cache-control': 'no-store',
      },
    },
  },

  // baseURL set via NUXT_APP_BASE_URL env var (Vercel = '/', local = '/')
  app: {
    baseURL: process.env.NUXT_APP_BASE_URL ?? '/',
    head: {
      link: [
        {
          rel: 'icon',
          type: 'image/png',
          href: `${process.env.NUXT_APP_BASE_URL ?? '/'}dice-20.png`,
        },
      ],
      title: 'Rolling Dice',
      titleTemplate: '%s | Rolling Dice',
    },
  },

  // Runtime config exposed to client; override via NUXT_PUBLIC_* env vars
  // - deployTarget: 'github-pages' (frozen demo) | 'vercel' | 'local'
  // - apiBase: backend API origin; default = local dev backend.
  //   Override per env via NUXT_PUBLIC_API_BASE (Vercel preview / prod).
  runtimeConfig: {
    public: {
      deployTarget: 'github-pages',
      apiBase: 'http://localhost:3001',
    },
  },

  imports: {
    dirs: ['helpers', 'composables/domain', 'composables/ui', 'composables/api', 'i18n'],
  },

  modules: ['@pinia/nuxt', '@nuxt/eslint', '@nuxt/fonts', '@nuxt/image'],

  fonts: {
    families: [
      { name: 'Inter', weights: [400, 500, 600, 700] },
      { name: 'Noto Sans TC', weights: [400, 500, 700] },
      { name: 'Cinzel', weights: [400, 700] },
    ],
  },

  css: ['~/assets/css/main.css', 'vue-advanced-cropper/dist/style.css'],

  alias: {
    '@ui': fileURLToPath(new URL('./packages/ui/dist/index.d.ts', import.meta.url)),
  },

  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        // Override the Nuxt directory alias with a specific file entry so Vite's
        '@ui': fileURLToPath(new URL('./packages/ui/dist/index.js', import.meta.url)),
      },
    },
  },
})
