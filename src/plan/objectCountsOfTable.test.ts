// 仕様（ハブ A-03 G78「左の一覧と積算の集計は T-02 オブジェクト表から直接引く（別の集計表は作らない）」。統括の依頼 2026-11-04）:
// 仕様 1: 表から数えた件数は、自動作成の結果から数えた件数と、全部の種類で同じ（中廊下・片廊下・ツイン）。
// 仕様 2: 置いた什器は、区画の有無によらず、表の行から数える（G69）。結果から数えた件数と同じ。
// 仕様 3: 結果が無いとき（自動作成の前）も、表から数えると、什器の件数だけが出て、ほかは 0。
// 仕様 4（P2）: 閉じた外形と仮の筆界は、表の行から数え、結果から数えた件数と同じ（外形 1・筆界 1）。
import { describe, expect, it } from 'vitest'
import { generateAutoPlan } from './autoPlan'
import { FIXTURE_ITEMS, type Fixture, type FixtureItem } from './fixtures'
import { emptyObjectTableInput, objectTableOf } from './objectTable'
import { sourcesOfTable } from './objectCountsOfTable'
import { countObjects, type ObjectCountRow, type ObjectKind } from './objectMenu'
import { objectSourcesOfFootprint, objectSourcesOfPlan, tableInputOfPlan } from './objectSourcesOfPlan'

const BASE = {
  targetPerFloor: 7,
  storeyCount: 5,
  storeyHeightMm: 3000,
  spanMm: 6000,
  unitDepthMm: 6000,
  corridorMm: 1600,
  evCount: 2,
  evStops: [1, 2, 3, 4, 5],
}
const PLANS = [
  { name: '中廊下', plan: generateAutoPlan({ ...BASE, layout: '中廊下' }) },
  { name: '片廊下', plan: generateAutoPlan({ ...BASE, targetPerFloor: 5, layout: '片廊下' }) },
  { name: 'ツイン', plan: generateAutoPlan({ ...BASE, layout: 'ツイン' }) },
]

function itemOf(label: string): FixtureItem {
  const found = FIXTURE_ITEMS.find((i) => i.label === label)
  if (!found) throw new Error(`品目「${label}」が無い`)
  return found.id
}
const kitchen = itemOf('キッチン')
const toilet = itemOf('便器')
const storage = itemOf('収納')
const fx = (id: string, item: FixtureItem, unitId: string | null): Fixture => ({ id, item, unitId })
// 置いた什器 4 件（区画なし 1 件、いまの区画に無い区画 ZZ が 1 件）
const FIXTURES: Fixture[] = [fx('fixture-1', kitchen, 'L0'), fx('fixture-2', toilet, 'R3'), fx('fixture-3', storage, null), fx('fixture-5', kitchen, 'ZZ')]

const rowOf = (rows: readonly ObjectCountRow[], kind: ObjectKind) => rows.find((r) => r.kind === kind)
const countsFromTable = (plan: Parameters<typeof tableInputOfPlan>[0], fixtures: Fixture[] = []) =>
  countObjects(sourcesOfTable(objectTableOf(tableInputOfPlan(plan, fixtures))))

describe('表から数えた件数（仕様 1）', () => {
  for (const { name, plan } of PLANS) {
    it(`${name}: 表から数えた件数は、結果から数えた件数と全部の種類で同じ`, () => {
      expect(countsFromTable(plan)).toEqual(countObjects(objectSourcesOfPlan(plan)))
    })
  }
})

describe('什器（仕様 2）', () => {
  it('置いた什器は、区画の有無によらず表の行から数え、結果から数えた件数と同じ', () => {
    const plan = PLANS[0]!.plan
    const fromTable = countsFromTable(plan, FIXTURES)
    expect(fromTable).toEqual(countObjects(objectSourcesOfPlan(plan, FIXTURES)))
    expect(rowOf(fromTable, 'fixture')?.count).toBe(4)
  })
})

describe('結果が無いとき（仕様 3）', () => {
  it('表から数えると、什器の件数だけが出て、ほかは 0（結果から数えたものと同じ）', () => {
    const fromTable = countsFromTable(null, FIXTURES)
    expect(fromTable).toEqual(countObjects(objectSourcesOfPlan(null, FIXTURES)))
    expect(rowOf(fromTable, 'fixture')?.count).toBe(4)
    expect(rowOf(fromTable, 'outline')?.count).toBe(0)
    expect(rowOf(fromTable, 'unit')?.count).toBe(0)
  })
})

describe('P2 の外形と仮の筆界（仕様 4）', () => {
  it('閉じた外形と仮の筆界は、表の行から数え、結果から数えた件数と同じ（外形 1・筆界 1）', () => {
    const footprint = [
      { x: 0, y: 0 },
      { x: 10000, y: 0 },
      { x: 10000, y: 10000 },
      { x: 0, y: 10000 },
    ]
    const fromTable = countObjects(sourcesOfTable(objectTableOf({ ...emptyObjectTableInput(), outline: footprint, siteBoundary: true })))
    expect(fromTable).toEqual(countObjects(objectSourcesOfFootprint(footprint, { id: 'parcel' })))
    expect(rowOf(fromTable, 'siteBoundary')?.count).toBe(1)
    expect(rowOf(fromTable, 'outline')?.count).toBe(1)
  })
})
