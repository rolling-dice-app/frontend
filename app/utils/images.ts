import type { ProfessionKey } from '@rolling-dice-app/types'

const imageModules = import.meta.glob<string>('../assets/images/professions/*.png', {
  eager: true,
  import: 'default',
})

export const PROFESSION_IMAGES: Partial<Record<ProfessionKey, string>> = Object.fromEntries(
  Object.entries(imageModules).map(([path, url]) => {
    const key = path.split('/').pop()!.replace('.png', '') as ProfessionKey
    return [key, url]
  }),
) as Partial<Record<ProfessionKey, string>>
