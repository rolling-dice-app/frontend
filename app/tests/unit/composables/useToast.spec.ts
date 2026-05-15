import { beforeEach, describe, expect, it } from 'vitest'
import { useToast } from '~/composables/ui/useToast'

beforeEach(() => {
  useToast().clear()
})

describe('useToast — 基本推入', () => {
  it('error 應推入 variant=error 的項目，回傳 id', () => {
    const { items, error } = useToast()
    const id = error('儲存失敗')
    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({ id, message: '儲存失敗', variant: 'error' })
  })

  it('success 應推入 variant=success 的項目', () => {
    const { items, success } = useToast()
    success('儲存成功')
    expect(items[0]!.variant).toBe('success')
  })

  it('info 應推入 variant=info 的項目', () => {
    const { items, info } = useToast()
    info('一般訊息')
    expect(items[0]!.variant).toBe('info')
  })

  it('每次推入應產生不同的 id', () => {
    const { items, info } = useToast()
    info('a')
    info('b')
    expect(items).toHaveLength(2)
    expect(items[0]!.id).not.toBe(items[1]!.id)
  })
})

describe('useToast — 預設值', () => {
  it('error 預設 duration 為 5000', () => {
    const { items, error } = useToast()
    error('訊息')
    expect(items[0]!.duration).toBe(5000)
  })

  it('success / info 預設 duration 為 3000', () => {
    const { items, success, info } = useToast()
    success('a')
    info('b')
    expect(items[0]!.duration).toBe(3000)
    expect(items[1]!.duration).toBe(3000)
  })

  it('預設 kind 為 system，位置為 center-top', () => {
    const { items, info } = useToast()
    info('訊息')
    expect(items[0]!.kind).toBe('system')
    expect(items[0]!.x).toBe('center')
    expect(items[0]!.y).toBe('top')
  })
})

describe('useToast — kind 行為', () => {
  it('system kind 應依 variant 帶對應 icon', () => {
    const { items, error, success, info } = useToast()
    error('e')
    success('s')
    info('i')
    expect(items[0]!.icon).toBe('alert-circle')
    expect(items[1]!.icon).toBe('check-circle')
    expect(items[2]!.icon).toBe('info')
  })

  it('hint kind 應不帶 icon，位置走 right-top', () => {
    const { items, success } = useToast()
    success('長休完成', { kind: 'hint' })
    expect(items[0]!.kind).toBe('hint')
    expect(items[0]!.icon).toBeNull()
    expect(items[0]!.x).toBe('right')
    expect(items[0]!.y).toBe('top')
  })

  it('hint 與 system 同時存在時各自獨立', () => {
    const { items, error, success } = useToast()
    error('系統錯誤')
    success('短休完成', { kind: 'hint' })
    expect(items[0]).toMatchObject({ kind: 'system', x: 'center', icon: 'alert-circle' })
    expect(items[1]).toMatchObject({ kind: 'hint', x: 'right', icon: null })
  })
})

describe('useToast — options 覆寫', () => {
  it('options.duration 應覆寫預設值', () => {
    const { items, error } = useToast()
    error('訊息', { duration: 10000 })
    expect(items[0]!.duration).toBe(10000)
  })

  it('options.duration=0 表示不自動關閉', () => {
    const { items, info } = useToast()
    info('訊息', { duration: 0 })
    expect(items[0]!.duration).toBe(0)
  })

  it('options.x / options.y 應覆寫預設位置（system）', () => {
    const { items, info } = useToast()
    info('訊息', { x: 'left', y: 'bottom' })
    expect(items[0]!.x).toBe('left')
    expect(items[0]!.y).toBe('bottom')
  })

  it('options.x / options.y 應覆寫預設位置（hint）', () => {
    const { items, info } = useToast()
    info('訊息', { kind: 'hint', x: 'left', y: 'bottom' })
    expect(items[0]!.x).toBe('left')
    expect(items[0]!.y).toBe('bottom')
  })
})

describe('useToast — remove / clear', () => {
  it('remove 應移除指定 id 的項目', () => {
    const { items, info, remove } = useToast()
    const id1 = info('a')
    const id2 = info('b')
    remove(id1)
    expect(items).toHaveLength(1)
    expect(items[0]!.id).toBe(id2)
  })

  it('remove 找不到對應 id 時不應拋錯', () => {
    const { items, info, remove } = useToast()
    info('a')
    expect(() => remove('non-existent')).not.toThrow()
    expect(items).toHaveLength(1)
  })

  it('clear 應清空所有項目', () => {
    const { items, info, clear } = useToast()
    info('a')
    info('b')
    info('c')
    clear()
    expect(items).toHaveLength(0)
  })
})

describe('useToast — singleton', () => {
  it('多次呼叫 useToast 應共享同一個佇列', () => {
    useToast().info('a')
    useToast().info('b')
    const { items } = useToast()
    expect(items).toHaveLength(2)
  })
})
