// 仕様（ハブ D-04 共通ヘッダー「保存状態」）: 保存した時点の案件と、いまの案件を比べ、「保存済み」か「未保存の変更あり」かを出す。
// 仕様 1: 保存した時点と何も変わっていなければ「保存済み」。
// 仕様 2: 線・階数・階高・什器のどれかが変わっていれば「未保存の変更あり」。
// 仕様 3: 同じ中身を別の参照にしただけでは、変わったとはみなさない（いまの店舗の参照で比べる）。
import { describe, expect, it } from 'vitest'
import { saveStatusOf, type SaveSnapshotState } from './saveStatus'

const entriesA = [{ id: 'a' }]
const fixturesA = [{ id: 'f' }]
const base: SaveSnapshotState = { entries: entriesA, storeyCount: 5, storeyHeightMm: 3000, fixtures: fixturesA }

describe('保存状態（仕様 1・2・3）', () => {
  it('保存した時点と何も変わっていなければ保存済み', () => {
    expect(saveStatusOf(base, { ...base })).toBe('保存済み')
  })

  it('線が変われば未保存の変更あり（参照が変わったとき）', () => {
    expect(saveStatusOf(base, { ...base, entries: [{ id: 'a' }] })).toBe('未保存の変更あり')
  })

  it('階数・階高・什器のどれかが変われば未保存の変更あり', () => {
    expect(saveStatusOf(base, { ...base, storeyCount: 6 })).toBe('未保存の変更あり')
    expect(saveStatusOf(base, { ...base, storeyHeightMm: 3100 })).toBe('未保存の変更あり')
    expect(saveStatusOf(base, { ...base, fixtures: [] })).toBe('未保存の変更あり')
  })
})
