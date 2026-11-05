// 仕様（ハブ A-03 G32。版番号）: 保存の JSON には版（revision）がある。読むと、その版が取れる。版の無い古い保存は 0 として読む。
// 仕様 1: 版のある保存を読むと、その版を返す。
// 仕様 2: 版の無い古い保存を読むと、版は 0。
// 仕様 3: 版が負の数・小数なら弾く。
import { describe, expect, it } from 'vitest'
import { parseSaveData } from './loadData'

const base = { projectName: '試し', savedAt: '2026-11-04T00:00:00.000Z', entries: [], storeyCount: 3, storeyHeightMm: 3000 }

describe('保存の版番号の読み込み（仕様 1〜3）', () => {
  it('仕様 1: 版のある保存は、その版を返す', () => {
    expect(parseSaveData({ ...base, revision: 5 }).revision).toBe(5)
  })

  it('仕様 2: 版の無い古い保存は 0', () => {
    expect(parseSaveData(base).revision).toBe(0)
  })

  it('仕様 3: 版が負の数・小数なら弾く', () => {
    expect(() => parseSaveData({ ...base, revision: -1 })).toThrow()
    expect(() => parseSaveData({ ...base, revision: 1.5 })).toThrow()
  })
})
