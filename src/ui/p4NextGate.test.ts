// 仕様（ハブ D-04 P4 積算「次へ進む条件: 工事原価が出ている」。統括の依頼 2026-11-05）:
// 仕様 1（出ている）: 工事原価が出ている（エラーで無い）ときは、次へ進める。
// 仕様 2（出ていない）: 工事原価が無い、またはエラーのときは、次へ進めない。
import { describe, expect, it } from 'vitest'
import { p4CanGoNext } from './p4NextGate'

describe('P4 の次へ進む条件（仕様 1・2）', () => {
  it('仕様 1: 工事原価が出ていれば次へ進める', () => {
    expect(p4CanGoNext({ total_yen: 12_345_678 })).toBe(true)
  })

  it('仕様 2: 工事原価が無い（null・undefined）、またはエラーのときは次へ進めない', () => {
    expect(p4CanGoNext(null)).toBe(false)
    expect(p4CanGoNext(undefined)).toBe(false)
    expect(p4CanGoNext({ error: '単価が足りない' })).toBe(false)
  })
})
