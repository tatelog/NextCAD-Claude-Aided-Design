// 仕様: 保存（案件の JSON 書き出し）。モックのヘッダーの「保存」。Google ドライブへの保存はまだつなげていない。
// 仕様 1: 保存のデータは、案件名・保存した時刻・描いた線（entries）・階数と階高を含む。
// 仕様 2: 案件名が空なら「敷地名（案件）未入力」と書く（空の名前で保存しない）。
// 仕様 3: PLATEAU の建物データ（周辺建物）は保存に含めない（外部の生データを同梱しない）。
// 仕様 4: 同じ入力なら同じ JSON（決定論。保存時刻は引数で受ける）。
import { describe, expect, it } from 'vitest'
import { buildSaveData } from './saveData'

const when = new Date('2026-11-03T12:00:00Z')

describe('buildSaveData（保存の中身）', () => {
  it('案件名・時刻・線・階数・階高を含む', () => {
    const d = buildSaveData({
      projectName: '江東区の試算',
      entries: [{ id: 'a', segments: [] }],
      storeyCount: 5,
      storeyHeightMm: 3000,
      savedAt: when,
    })
    expect(d.projectName).toBe('江東区の試算')
    expect(d.savedAt).toBe('2026-11-03T12:00:00.000Z')
    expect(d.entries).toEqual([{ id: 'a', segments: [] }])
    expect(d.storeyCount).toBe(5)
    expect(d.storeyHeightMm).toBe(3000)
  })

  it('案件名が空なら「敷地名（案件）未入力」', () => {
    const d = buildSaveData({ projectName: '  ', entries: [], storeyCount: 5, storeyHeightMm: 3000, savedAt: when })
    expect(d.projectName).toBe('敷地名（案件）未入力')
  })

  it('周辺建物（PLATEAU）の項目を持たない', () => {
    const d = buildSaveData({ projectName: 'x', entries: [], storeyCount: 5, storeyHeightMm: 3000, savedAt: when })
    expect(Object.keys(d)).not.toContain('buildings')
    expect(Object.keys(d)).not.toContain('neighbors')
  })

  it('同じ入力なら同じ JSON', () => {
    const input = { projectName: 'x', entries: [{ id: 'a' }], storeyCount: 5, storeyHeightMm: 3000, savedAt: when }
    expect(JSON.stringify(buildSaveData(input))).toBe(JSON.stringify(buildSaveData(input)))
  })
})
