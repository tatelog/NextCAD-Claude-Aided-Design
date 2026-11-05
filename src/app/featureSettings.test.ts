// 仕様（ハブ A-03 G70。設計グリルの項目 9、2026-11-05）: 機能のオンオフは端末ごとに保存する（localStorage）。案件ファイルには入れない。
// 仕様 1（既定）: 保存が無ければ、すべて入（true）。
// 仕様 2（読む）: 保存された値を読む。一部だけ保存されていれば、残りは既定（true）。
// 仕様 3（壊れた値）: JSON が壊れている・知らない機能名・真偽でない値は無視し、既定にする。
// 仕様 4（使えない端末）: localStorage が使えなくても（例外を出しても）例外を出さず、既定で動く。
// 仕様 5（覚える）: 設定を保存すると、次に読んだとき同じ設定になる。
// 仕様 6（案件に入らない）: 案件ファイルの中身に、機能の設定は入らない。
import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest'
import { buildSaveData } from './saveData'
import { FEATURE_SETTINGS_KEY, loadFeatureSettings, parseFeatureSettings, saveFeatureSettings } from './featureSettings'

const KEYS = ['showGrid', 'circleMenu', 'knobs'] as const

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
  it('保存が無ければ、すべて入', () => {
    expect(loadFeatureSettings(KEYS)).toEqual({ showGrid: true, circleMenu: true, knobs: true })
  })
})

describe('読む（仕様 2）', () => {
  it('保存された値を読み、無い項目は既定（true）', () => {
    memory.set(FEATURE_SETTINGS_KEY, JSON.stringify({ showGrid: false }))
    expect(loadFeatureSettings(KEYS)).toEqual({ showGrid: false, circleMenu: true, knobs: true })
  })
})

describe('壊れた値（仕様 3）', () => {
  it('JSON が壊れていれば、すべて既定', () => {
    expect(parseFeatureSettings('{not json', KEYS)).toEqual({ showGrid: true, circleMenu: true, knobs: true })
  })

  it('知らない機能名と、真偽でない値は無視する', () => {
    const raw = JSON.stringify({ showGrid: 'no', unknownKey: false, circleMenu: false })
    expect(parseFeatureSettings(raw, KEYS)).toEqual({ showGrid: true, circleMenu: false, knobs: true })
  })

  it('配列や null など、オブジェクトでないものは既定', () => {
    expect(parseFeatureSettings('[1,2]', KEYS)).toEqual({ showGrid: true, circleMenu: true, knobs: true })
    expect(parseFeatureSettings('null', KEYS)).toEqual({ showGrid: true, circleMenu: true, knobs: true })
  })
})

describe('使えない端末（仕様 4）', () => {
  it('localStorage が例外を出しても、読むと既定、保存は例外を出さない', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('denied')
      },
      setItem: () => {
        throw new Error('denied')
      },
    })
    expect(loadFeatureSettings(KEYS)).toEqual({ showGrid: true, circleMenu: true, knobs: true })
    expect(() => saveFeatureSettings({ showGrid: false, circleMenu: true, knobs: true })).not.toThrow()
  })

  it('localStorage が無い環境でも、読むと既定', () => {
    vi.unstubAllGlobals()
    expect(loadFeatureSettings(KEYS)).toEqual({ showGrid: true, circleMenu: true, knobs: true })
  })
})

describe('覚える（仕様 5）', () => {
  it('保存すると、次に読んだとき同じ設定になる', () => {
    saveFeatureSettings({ showGrid: false, circleMenu: false, knobs: true })
    expect(loadFeatureSettings(KEYS)).toEqual({ showGrid: false, circleMenu: false, knobs: true })
  })
})

describe('案件に入らない（仕様 6）', () => {
  it('案件ファイルの中身に、機能の設定は入らない', () => {
    saveFeatureSettings({ showGrid: false, circleMenu: false, knobs: false })
    const saved = JSON.stringify(
      buildSaveData({ projectName: '案件', savedAt: new Date(0), entries: [], storeyCount: 3, storeyHeightMm: 3000 }),
    )
    expect(saved).not.toContain('showGrid')
    expect(saved).not.toContain('circleMenu')
  })
})
