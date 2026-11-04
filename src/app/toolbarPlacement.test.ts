// 仕様（ハブ A-03 G52。代表の決定 2026-11-04・版 58）: 道具の置き場（上・左・独立）は、端末ごとに覚える（localStorage）。案件ファイルには保存しない。
// 仕様 1（既定）: 覚えたものが無ければ「上」。
// 仕様 2（覚える）: 置き場を変えると端末に保存し、次に開いたとき同じ置き場で始まる。
// 仕様 3（壊れた値）: 上・左・独立のどれでもない値は、無視して「上」。
// 仕様 4（使えない端末）: localStorage が使えなくても（例外を出しても）例外を出さず、「上」で動く。置き場の切り替えは画面に効く。
// 仕様 5（案件に入らない）: 案件ファイルの中身に、置き場は入らない。
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { buildSaveData } from './saveData'
import { loadToolbarPlacement, placementOf, saveToolbarPlacement, TOOLBAR_PLACEMENT_KEY } from './toolbarPlacementStore'
import { useUi } from '../store/ui'

const memory = new Map<string, string>()

beforeEach(() => {
  memory.clear()
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => {
      memory.set(key, value)
    },
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('既定（仕様 1）', () => {
  it('覚えたものが無ければ「上」', () => {
    expect(loadToolbarPlacement()).toBe('top')
  })
})

describe('覚える（仕様 2）', () => {
  it('左・独立を保存すると、次に読むとその置き場になる', () => {
    saveToolbarPlacement('left')
    expect(memory.get(TOOLBAR_PLACEMENT_KEY)).toBe('left')
    expect(loadToolbarPlacement()).toBe('left')
    saveToolbarPlacement('free')
    expect(loadToolbarPlacement()).toBe('free')
  })

  it('画面の置き場を変えると、端末に保存される', () => {
    useUi.getState().setToolbarPlacement('left')
    expect(memory.get(TOOLBAR_PLACEMENT_KEY)).toBe('left')
    expect(useUi.getState().toolbarPlacement).toBe('left')
  })
})

describe('壊れた値（仕様 3）', () => {
  it('上・左・独立のどれでもない値は「上」', () => {
    memory.set(TOOLBAR_PLACEMENT_KEY, 'bottom')
    expect(loadToolbarPlacement()).toBe('top')
    expect(placementOf(null)).toBe('top')
    expect(placementOf('')).toBe('top')
  })
})

describe('使えない端末（仕様 4）', () => {
  it('localStorage が例外を出しても、読むと「上」、保存は例外を出さず、画面の置き場は変わる', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('denied')
      },
      setItem: () => {
        throw new Error('denied')
      },
    })
    expect(loadToolbarPlacement()).toBe('top')
    expect(() => saveToolbarPlacement('free')).not.toThrow()
    expect(() => useUi.getState().setToolbarPlacement('left')).not.toThrow()
    expect(useUi.getState().toolbarPlacement).toBe('left')
  })

  it('localStorage が無い環境でも、読むと「上」', () => {
    vi.unstubAllGlobals()
    expect(loadToolbarPlacement()).toBe('top')
  })
})

describe('案件に入らない（仕様 5）', () => {
  it('案件ファイルの中身に、置き場の項目は無い', () => {
    useUi.getState().setToolbarPlacement('free')
    const saved = JSON.stringify(
      buildSaveData({ projectName: '案件', savedAt: new Date(0), entries: [], storeyCount: 3, storeyHeightMm: 3000 }),
    )
    expect(saved).not.toContain('toolbarPlacement')
    expect(saved).not.toContain('placement')
  })
})
