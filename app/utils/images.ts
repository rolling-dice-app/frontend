import type { ClassKey } from '@rolling-dice-app/core'

const imageModules = import.meta.glob<string>('../assets/images/classes/*.png', {
  eager: true,
  import: 'default',
})

export const CLASS_IMAGES: Partial<Record<ClassKey, string>> = Object.fromEntries(
  Object.entries(imageModules).map(([path, url]) => {
    const key = path.split('/').pop()!.replace('.png', '') as ClassKey
    return [key, url]
  }),
) as Partial<Record<ClassKey, string>>
