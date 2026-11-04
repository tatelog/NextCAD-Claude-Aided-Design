// 仕様: 保存（案件の JSON 書き出し）。モックのヘッダーの「保存」。Google ドライブへの保存はまだつなげていない。
// 仕様 1: 保存のデータは、案件名・保存した時刻・描いた線（entries）・階数と階高を含む。
// 仕様 2: 案件名が空なら「敷地名（案件）未入力」と書く（空の名前で保存しない）。
// 仕様 3: PLATEAU の建物データ（周辺建物）は保存に含めない（外部の生データを同梱しない）。
// 仕様 4: 同じ入力なら同じ JSON（決定論。保存時刻は引数で受ける）。
// 仕様 5（什器。ハブ A-03 G69 の今回の決定・仮置き）: 保存のデータに、P3 で置いた什器の一覧（店舗の fixtures。id・品目・区画の id）を fixtures として含める。
//   読み込みはまだ作らない（保存の形だけ）。什器を渡さない・空のときは、fixtures の項目を付けない（今までと同じ形の JSON）。
//   置いた順を保ち、区画なし（区画の id が null）の什器も落とさない。保存したあとで元の一覧が変わっても、保存のデータは変わらない。入力は書き換えない。
//   品目ごとの単価の入力欄の文字は、まだ保存に含めない。
import { describe, expect, it } from 'vitest'
import { FIXTURE_ITEMS } from '../plan/fixtures'
import type { Fixture, FixtureItem } from '../plan/fixtures'
import { buildSaveData } from './saveData'

const when = new Date('2026-11-03T12:00:00Z')

function itemOf(label: string): FixtureItem {
  const found = FIXTURE_ITEMS.find((i) => i.label === label)
  if (!found) throw new Error(`品目「${label}」が無い`)
  return found.id
}

const kitchen = itemOf('キッチン')
const toilet = itemOf('便器')
const storage = itemOf('収納')

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

describe('buildSaveData（什器。仕様 5）', () => {
  const base = { projectName: '江東区の試算', entries: [{ id: 'a', segments: [] }], storeyCount: 5, storeyHeightMm: 3000, savedAt: when }
  const OLD_KEYS = ['entries', 'projectName', 'savedAt', 'storeyCount', 'storeyHeightMm']
  const placed: Fixture[] = [
    { id: 'fixture-1', item: kitchen, unitId: 'L0' },
    { id: 'fixture-2', item: toilet, unitId: null },
    { id: 'fixture-4', item: storage, unitId: 'R2' },
  ]

  it('什器を渡さなければ、fixtures の項目は無く、今までと同じ形（項目も JSON も）', () => {
    const d = buildSaveData(base)
    expect(Object.keys(d).sort()).toEqual(OLD_KEYS)
    expect(JSON.parse(JSON.stringify(d))).toStrictEqual({
      projectName: '江東区の試算',
      savedAt: '2026-11-03T12:00:00.000Z',
      entries: [{ id: 'a', segments: [] }],
      storeyCount: 5,
      storeyHeightMm: 3000,
    })
  })

  it('什器の一覧が空でも、渡さないときと同じ（fixtures の項目は無く、JSON も同じ）', () => {
    const d = buildSaveData({ ...base, fixtures: [] })
    expect(Object.keys(d).sort()).toEqual(OLD_KEYS)
    expect(JSON.stringify(d)).toBe(JSON.stringify(buildSaveData(base)))
  })

  it('什器があれば、fixtures に（id・品目・区画の id）が、置いた順に入る', () => {
    const d = buildSaveData({ ...base, fixtures: placed })
    expect(d.fixtures).toEqual([
      { id: 'fixture-1', item: kitchen, unitId: 'L0' },
      { id: 'fixture-2', item: toilet, unitId: null },
      { id: 'fixture-4', item: storage, unitId: 'R2' },
    ])
  })

  it('区画なし（区画の id が null）の什器も落とさない（JSON にしても null のまま）', () => {
    const json = JSON.parse(JSON.stringify(buildSaveData({ ...base, fixtures: placed }))) as { fixtures: Array<{ id: string; unitId: string | null }> }
    expect(json.fixtures).toHaveLength(3)
    expect(json.fixtures[1]).toEqual({ id: 'fixture-2', item: toilet, unitId: null })
    expect(json.fixtures[1]?.unitId).toBeNull()
  })

  it('JSON にして読み戻しても、fixtures の中身は同じ', () => {
    const d = buildSaveData({ ...base, fixtures: placed })
    expect(JSON.parse(JSON.stringify(d)).fixtures).toEqual(placed)
  })

  it('什器があっても、案件名・時刻・線・階数・階高は同じ', () => {
    const d = buildSaveData({ ...base, fixtures: placed })
    expect(d.projectName).toBe('江東区の試算')
    expect(d.savedAt).toBe('2026-11-03T12:00:00.000Z')
    expect(d.entries).toEqual([{ id: 'a', segments: [] }])
    expect(d.storeyCount).toBe(5)
    expect(d.storeyHeightMm).toBe(3000)
    expect(Object.keys(d).sort()).toEqual([...OLD_KEYS, 'fixtures'].sort())
  })

  it('保存したあとで元の一覧が変わっても、保存のデータは変わらない', () => {
    const list: Fixture[] = [{ id: 'fixture-1', item: kitchen, unitId: 'L0' }]
    const d = buildSaveData({ ...base, fixtures: list })
    list.push({ id: 'fixture-2', item: toilet, unitId: 'L0' })
    const first = list[0]
    if (first) first.unitId = 'L9'
    expect(d.fixtures).toEqual([{ id: 'fixture-1', item: kitchen, unitId: 'L0' }])
  })

  it('入力の一覧は書き換えない', () => {
    const frozen: readonly Fixture[] = Object.freeze(placed.map((f) => Object.freeze({ ...f })))
    const before = JSON.stringify(frozen)
    const d = buildSaveData({ ...base, fixtures: frozen })
    expect(JSON.stringify(frozen)).toBe(before)
    expect(d.fixtures).toHaveLength(3)
    expect(d.fixtures).not.toBe(frozen)
  })

  it('什器があっても、同じ入力なら同じ JSON', () => {
    const first = JSON.stringify(buildSaveData({ ...base, fixtures: placed }))
    expect(JSON.parse(first)).toHaveProperty('fixtures')
    expect(first).toBe(JSON.stringify(buildSaveData({ ...base, fixtures: placed })))
  })

  it('周辺建物（PLATEAU）の項目は、什器があっても持たない', () => {
    const keys = Object.keys(buildSaveData({ ...base, fixtures: placed }))
    expect(keys).not.toContain('buildings')
    expect(keys).not.toContain('neighbors')
  })
})
