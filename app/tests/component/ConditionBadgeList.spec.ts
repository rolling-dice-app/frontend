import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { t } from '~/i18n'
import ConditionBadgeList from '~/components/business/battlefield/ConditionBadgeList.vue'
import type { BattlefieldCondition } from '~/types/business/battlefield'

const conditions: BattlefieldCondition[] = [
  { id: 'c1', key: 'poisoned', note: '蛛毒，長休解除' },
  { id: 'c2', key: 'prone', note: null },
  { id: 'c3', key: 'stunned', note: null },
]

const mountList = (props: Record<string, unknown> = {}) =>
  mount(ConditionBadgeList, {
    props: { conditions, ...props },
    global: { stubs: { Icon: true } },
  })

describe('ConditionBadgeList', () => {
  it('以 combat.condition 標籤渲染全部狀態', () => {
    const wrapper = mountList()
    expect(wrapper.text()).toContain(t('combat.condition.poisoned'))
    expect(wrapper.text()).toContain(t('combat.condition.prone'))
    expect(wrapper.text()).toContain(t('combat.condition.stunned'))
  })

  it('有備註的狀態才渲染 tooltip', () => {
    const wrapper = mountList()
    const tooltips = wrapper.findAll('[role="tooltip"]')
    expect(tooltips).toHaveLength(1)
    expect(tooltips[0]!.text()).toBe('蛛毒，長休解除')
  })

  it('max 收合：超出部分顯示 +n', () => {
    const wrapper = mountList({ max: 2 })
    expect(wrapper.text()).toContain(t('combat.condition.poisoned'))
    expect(wrapper.text()).not.toContain(t('combat.condition.stunned'))
    expect(wrapper.text()).toContain('+1')
  })

  it('removable 才有移除鈕，點擊 emit remove(conditionId)', async () => {
    const readonly = mountList()
    expect(readonly.findAll('button')).toHaveLength(0)

    const wrapper = mountList({ removable: true })
    const removeButton = wrapper.find(
      `button[aria-label="${t('battlefield.removeConditionAria', { name: t('combat.condition.prone') })}"]`,
    )
    await removeButton.trigger('click')
    expect(wrapper.emitted('remove')).toEqual([['c2']])
  })
})
