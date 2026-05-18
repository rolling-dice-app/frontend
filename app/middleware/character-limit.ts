/**
 * 守住達方案上限直連 build 頁：補載列表後已達上限即導回 /character；後端為最終 backstop。
 * Opt-in via `definePageMeta({ middleware: ['auth', 'character-limit'] })`。
 */
export default defineNuxtRouteMiddleware(async () => {
  // client-only：與 auth middleware 同，SSR 期狀態必為 null 且會污染 edge cache。
  if (import.meta.server) return
  // await 前取值：ensureListLoaded 期間 hydration 可能完成翻 false，事後判斷會失準。
  const wasHydrating = useNuxtApp().isHydrating
  const characterStore = useCharacterStore()
  await characterStore.ensureListLoaded()
  if (!characterStore.isAtCharacterLimit) return
  // 初次 hydration 走整頁重載避免 node mismatch（toast 隨重載丟失故略過）；
  // SPA 導航無 SSR，軟導航 + toast 即可。
  if (wasHydrating) return navigateTo('/character', { replace: true, external: true })
  useToast().error(t('character.characterLimitReached'))
  return navigateTo('/character', { replace: true })
})
