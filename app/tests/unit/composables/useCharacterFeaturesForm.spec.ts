import { reactive } from 'vue'
import { describe, expect, it } from 'vitest'
import { useCharacterFeaturesForm } from '~/composables/domain/useCharacterFeaturesForm'
import { createMockUpdateFormState } from '~/tests/fixtures/character'
import type { FeatureDraft } from '~/types/business/character-form'

function setup() {
  const formState = reactive(createMockUpdateFormState())
  const features = useCharacterFeaturesForm(formState)
  return { formState, features }
}

const defaultFeatureDraft = (overrides: Partial<FeatureDraft> = {}): FeatureDraft => ({
  name: '勇氣光環',
  description: null,
  source: 'class',
  usage: { hasUses: false },
  ...overrides,
})

describe('useCharacterFeaturesForm', () => {
  it('addFeature 應推入帶 id 的條目', () => {
    const { formState, features } = setup()
    features.addFeature(defaultFeatureDraft())
    expect(formState.features).toHaveLength(1)
    expect(formState.features[0]).toMatchObject({
      name: '勇氣光環',
      source: 'class',
      usage: { hasUses: false },
    })
    expect(formState.features[0]!.id).toBeTypeOf('string')
  })

  it('多次 addFeature 應產生不重複的 id', () => {
    const { formState, features } = setup()
    features.addFeature(defaultFeatureDraft())
    features.addFeature(defaultFeatureDraft())
    const [a, b] = formState.features
    expect(a!.id).not.toBe(b!.id)
  })

  it('addFeature 應對 usage 做深拷貝（修改 draft 不影響已加入條目）', () => {
    const { formState, features } = setup()
    const draft = defaultFeatureDraft({
      usage: { hasUses: true, max: 3, recovery: 'shortRest' },
    })
    features.addFeature(draft)
    if (draft.usage.hasUses) draft.usage.max = 99
    const stored = formState.features[0]!.usage
    expect(stored.hasUses).toBe(true)
    if (stored.hasUses) expect(stored.max).toBe(3)
  })

  it('removeFeature 應依 id 刪除', () => {
    const { formState, features } = setup()
    features.addFeature(defaultFeatureDraft())
    features.addFeature(defaultFeatureDraft({ name: '第二項' }))
    const targetId = formState.features[0]!.id
    features.removeFeature(targetId)
    expect(formState.features).toHaveLength(1)
    expect(formState.features[0]!.id).not.toBe(targetId)
  })

  it('removeFeature 找不到 id 時不應拋錯', () => {
    const { formState, features } = setup()
    features.addFeature(defaultFeatureDraft())
    expect(() => features.removeFeature('non-existent')).not.toThrow()
    expect(formState.features).toHaveLength(1)
  })

  it('updateFeature 應依 id 替換並保留原 id', () => {
    const { formState, features } = setup()
    features.addFeature(defaultFeatureDraft())
    const id = formState.features[0]!.id
    features.updateFeature(id, {
      name: '新名稱',
      description: '描述',
      source: 'feat',
      usage: { hasUses: true, max: 2, recovery: 'longRest' },
    })
    expect(formState.features[0]).toMatchObject({
      id,
      name: '新名稱',
      description: '描述',
      source: 'feat',
      usage: { hasUses: true, max: 2, recovery: 'longRest' },
    })
  })

  it('updateFeature 找不到 id 時不應拋錯且不應新增條目', () => {
    const { formState, features } = setup()
    features.addFeature(defaultFeatureDraft())
    expect(() =>
      features.updateFeature('non-existent', defaultFeatureDraft({ name: '不存在' })),
    ).not.toThrow()
    expect(formState.features).toHaveLength(1)
    expect(formState.features[0]!.name).toBe('勇氣光環')
  })

  it('updateFeature 應對 usage 做深拷貝', () => {
    const { formState, features } = setup()
    features.addFeature(defaultFeatureDraft())
    const id = formState.features[0]!.id
    const draft = defaultFeatureDraft({
      usage: { hasUses: true, max: 5, recovery: 'manual' },
    })
    features.updateFeature(id, draft)
    if (draft.usage.hasUses) draft.usage.max = 99
    const stored = formState.features[0]!.usage
    expect(stored.hasUses).toBe(true)
    if (stored.hasUses) expect(stored.max).toBe(5)
  })

  it('moveFeature 應將條目從 fromIndex 搬到 toIndex', () => {
    const { formState, features } = setup()
    features.addFeature(defaultFeatureDraft({ name: 'A' }))
    features.addFeature(defaultFeatureDraft({ name: 'B' }))
    features.addFeature(defaultFeatureDraft({ name: 'C' }))
    features.moveFeature(0, 2)
    expect(formState.features.map((f) => f.name)).toEqual(['B', 'C', 'A'])
  })

  it('moveFeature 由後往前搬亦應正確', () => {
    const { formState, features } = setup()
    features.addFeature(defaultFeatureDraft({ name: 'A' }))
    features.addFeature(defaultFeatureDraft({ name: 'B' }))
    features.addFeature(defaultFeatureDraft({ name: 'C' }))
    features.moveFeature(2, 0)
    expect(formState.features.map((f) => f.name)).toEqual(['C', 'A', 'B'])
  })

  it('moveFeature fromIndex 與 toIndex 相同時不應變動', () => {
    const { formState, features } = setup()
    features.addFeature(defaultFeatureDraft({ name: 'A' }))
    features.addFeature(defaultFeatureDraft({ name: 'B' }))
    features.moveFeature(1, 1)
    expect(formState.features.map((f) => f.name)).toEqual(['A', 'B'])
  })

  it('moveFeature 索引越界時不應變動且不應拋錯', () => {
    const { formState, features } = setup()
    features.addFeature(defaultFeatureDraft({ name: 'A' }))
    features.addFeature(defaultFeatureDraft({ name: 'B' }))
    expect(() => features.moveFeature(-1, 0)).not.toThrow()
    expect(() => features.moveFeature(0, 5)).not.toThrow()
    expect(() => features.moveFeature(5, 0)).not.toThrow()
    expect(formState.features.map((f) => f.name)).toEqual(['A', 'B'])
  })
})
