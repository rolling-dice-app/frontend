import { fileURLToPath } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'jsdom',
    environmentOptions: {
      jsdom: {
        url: 'http://localhost',
      },
    },
    deps: {
      optimizer: {
        web: {
          include: ['pinia'],
        },
      },
    },
    server: {
      deps: {
        inline: ['pinia'],
      },
    },
    setupFiles: ['./app/tests/setup.ts'],
    include: ['app/tests/**/*.spec.ts'],
    exclude: ['packages/**', 'node_modules/**'],
    coverage: {
      provider: 'v8',
      include: ['app/**/*.{ts,vue}'],
      exclude: ['app/tests/**', 'app/**/*.d.ts', 'app/types/**', 'app/assets/**'],
      // lines/statements are low because pages & components lack mount tests (目標分階段提升至 80%)
      thresholds: {
        lines: 25,
        functions: 80,
        branches: 80,
        statements: 25,
      },
    },
  },
  resolve: {
    alias: [
      {
        // Vue compiler 把 `<img src="~/assets/...">` 轉成 `import 'assets/...'`，
        // 補上 alias 讓 vitest 在元件測試中能解析該 image import。
        find: /^assets\//,
        replacement: fileURLToPath(new URL('./app/assets/', import.meta.url)),
      },
      { find: '~', replacement: fileURLToPath(new URL('./app', import.meta.url)) },
      { find: '@ui', replacement: fileURLToPath(new URL('./packages/ui', import.meta.url)) },
      {
        find: '@vue/devtools-api',
        replacement: fileURLToPath(
          new URL('./app/tests/__mocks__/@vue/devtools-api.ts', import.meta.url),
        ),
      },
    ],
  },
})
