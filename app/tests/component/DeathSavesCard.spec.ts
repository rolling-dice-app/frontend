import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import DeathSavesCard from '~/components/business/character-detail/quickview/DeathSavesCard.vue'

vi.mock('~/helpers/dice', () => ({
  rollD20: vi.fn(),
  rollDice: vi.fn(),
  rollDie: vi.fn(),
}))

const { rollD20 } = await import('~/helpers/dice')

const push = vi.fn()
const clear = vi.fn()
const entries = ref<unknown[]>([])

beforeEach(() => {
  push.mockClear()
  clear.mockClear()
  entries.value = []
  vi.stubGlobal('useDiceRollLog', () => ({ push, clear, entries }))
  vi.mocked(rollD20).mockReset()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

const BadgeStub = {
  name: 'Badge',
  props: ['bgColor', 'size'],
  template: '<span class="badge"><slot /></span>',
}

const mountCard = (
  params: {
    active?: boolean
    successes?: number
    failures?: number
  } = {},
) =>
  mount(DeathSavesCard, {
    props: {
      active: params.active ?? true,
      successes: params.successes ?? 0,
      failures: params.failures ?? 0,
    },
    global: {
      stubs: { Icon: true, Badge: BadgeStub },
    },
  })

const successBtn = (wrapper: ReturnType<typeof mountCard>, n: number) =>
  wrapper.find(`button[aria-label="成功 ${n}"]`)
const failureBtn = (wrapper: ReturnType<typeof mountCard>, n: number) =>
  wrapper.find(`button[aria-label="失敗 ${n}"]`)
const rollBtn = (wrapper: ReturnType<typeof mountCard>) =>
  wrapper.find('button[aria-label="擲死亡豁免"]')

describe('DeathSavesCard', () => {
  describe('狀態顯示', () => {
    it('!active 顯示「未生效」並標 aria-disabled', () => {
      const wrapper = mountCard({ active: false })
      expect(wrapper.text()).toContain('未生效')
      expect(wrapper.find('section').attributes('aria-disabled')).toBe('true')
    })

    it('failures = 3 顯示「已死亡」', () => {
      const wrapper = mountCard({ failures: 3 })
      expect(wrapper.text()).toContain('已死亡')
    })

    it('successes = 3 顯示「已穩定」', () => {
      const wrapper = mountCard({ successes: 3 })
      expect(wrapper.text()).toContain('已穩定')
    })

    it('進行中顯示「進行中」', () => {
      const wrapper = mountCard({ successes: 1, failures: 1 })
      expect(wrapper.text()).toContain('進行中')
    })
  })

  describe('disabled 行為', () => {
    it('!active 時所有 success / failure 按鈕 disabled、roll 按鈕 disabled', () => {
      const wrapper = mountCard({ active: false })
      ;[1, 2, 3].forEach((n) => {
        expect(successBtn(wrapper, n).attributes('disabled')).toBeDefined()
        expect(failureBtn(wrapper, n).attributes('disabled')).toBeDefined()
      })
      expect(rollBtn(wrapper).attributes('disabled')).toBeDefined()
    })

    it('已穩定（successes=3）時 roll disabled', () => {
      const wrapper = mountCard({ successes: 3 })
      expect(rollBtn(wrapper).attributes('disabled')).toBeDefined()
    })

    it('已死亡（failures=3）時 roll disabled', () => {
      const wrapper = mountCard({ failures: 3 })
      expect(rollBtn(wrapper).attributes('disabled')).toBeDefined()
    })
  })

  describe('成功 / 失敗點擊', () => {
    it('點成功 N 設為 N（aria-pressed 反映目前狀態）', async () => {
      const wrapper = mountCard({ successes: 0 })
      await successBtn(wrapper, 2).trigger('click')
      expect(wrapper.emitted('setSuccess')).toEqual([[2]])
    })

    it('點當前最高位（toggle off）設為 N-1', async () => {
      const wrapper = mountCard({ successes: 2 })
      await successBtn(wrapper, 2).trigger('click')
      expect(wrapper.emitted('setSuccess')).toEqual([[1]])
    })

    it('aria-pressed 反映 successes 已填數', () => {
      const wrapper = mountCard({ successes: 2 })
      expect(successBtn(wrapper, 1).attributes('aria-pressed')).toBe('true')
      expect(successBtn(wrapper, 2).attributes('aria-pressed')).toBe('true')
      expect(successBtn(wrapper, 3).attributes('aria-pressed')).toBe('false')
    })

    it('!active 時點擊不 emit', async () => {
      const wrapper = mountCard({ active: false })
      await successBtn(wrapper, 1).trigger('click')
      await failureBtn(wrapper, 1).trigger('click')
      expect(wrapper.emitted('setSuccess')).toBeUndefined()
      expect(wrapper.emitted('setFailure')).toBeUndefined()
    })

    it('失敗按鈕 toggle 同邏輯', async () => {
      const wrapper = mountCard({ failures: 1 })
      await failureBtn(wrapper, 1).trigger('click')
      expect(wrapper.emitted('setFailure')).toEqual([[0]])
    })
  })

  describe('擲骰結果分支', () => {
    it('chosen = 20 emit rollNat20、不 emit setSuccess/setFailure、push log isCritical=true', async () => {
      vi.mocked(rollD20).mockReturnValueOnce({ rolls: [20], chosen: 20 })
      const wrapper = mountCard()
      await rollBtn(wrapper).trigger('click')
      expect(wrapper.emitted('rollNat20')).toEqual([[]])
      expect(wrapper.emitted('setSuccess')).toBeUndefined()
      expect(wrapper.emitted('setFailure')).toBeUndefined()
      expect(push).toHaveBeenCalledWith(
        expect.objectContaining({ isCritical: true, chosen: 20, total: 20 }),
      )
    })

    it('chosen = 1 emit setFailure with min(3, failures+2)、push isFumble=true', async () => {
      vi.mocked(rollD20).mockReturnValueOnce({ rolls: [1], chosen: 1 })
      const wrapper = mountCard({ failures: 0 })
      await rollBtn(wrapper).trigger('click')
      expect(wrapper.emitted('setFailure')).toEqual([[2]])
      expect(push).toHaveBeenCalledWith(expect.objectContaining({ isFumble: true }))
    })

    it('chosen = 1 且 failures = 2 → setFailure clamp 為 3', async () => {
      vi.mocked(rollD20).mockReturnValueOnce({ rolls: [1], chosen: 1 })
      const wrapper = mountCard({ failures: 2 })
      await rollBtn(wrapper).trigger('click')
      expect(wrapper.emitted('setFailure')).toEqual([[3]])
    })

    it('chosen ≥ 10 emit setSuccess + 1', async () => {
      vi.mocked(rollD20).mockReturnValueOnce({ rolls: [15], chosen: 15 })
      const wrapper = mountCard({ successes: 1 })
      await rollBtn(wrapper).trigger('click')
      expect(wrapper.emitted('setSuccess')).toEqual([[2]])
    })

    it('chosen < 10 emit setFailure + 1', async () => {
      vi.mocked(rollD20).mockReturnValueOnce({ rolls: [5], chosen: 5 })
      const wrapper = mountCard({ failures: 0 })
      await rollBtn(wrapper).trigger('click')
      expect(wrapper.emitted('setFailure')).toEqual([[1]])
    })

    it('每次擲骰都呼叫 useDiceRollLog().push 並標 saving-throw / 死亡豁免', async () => {
      vi.mocked(rollD20).mockReturnValueOnce({ rolls: [12], chosen: 12 })
      const wrapper = mountCard()
      await rollBtn(wrapper).trigger('click')
      expect(push).toHaveBeenCalledWith(
        expect.objectContaining({ kind: 'saving-throw', label: '死亡豁免', mode: 'normal' }),
      )
    })
  })
})
