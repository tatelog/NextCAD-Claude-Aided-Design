import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { generateAutoPlan } from './autoPlan'
import { masterOf, patternOfType } from './unitTypeMaster'

// 仕様（ハブ A-03 G89・G91。統括の依頼 2026-11-04）から書いたテスト。
// - 住戸タイプ（T-08）は、縦割り（柱割りの列）ごとに 1 タイプ。その列の部屋割りは、型の個室数で決める（仮定。統括が確認する）。
//   個室 1 は角（LDK・洋室 1・水回り）、個室 2 は田の字（LDK・洋室 2・水回り）。
// - 個室 3 以上の型は、室数に合う割り付けが無いので「未対応」として印を出す（推測で割らない）。未対応の列は、既定の割り付けで仮置きする。
// - 型を入れていない（従来の）自動作成の部屋割りは、今までどおり。

const CANDIDATES = JSON.parse(readFileSync(new URL('./unitTypeCandidates.json', import.meta.url), 'utf8'))
const master = masterOf(CANDIDATES)
const byId = (id: string) => master.find((t) => t.id === id)!

const base = {
  targetPerFloor: 5,
  storeyCount: 5,
  storeyHeightMm: 3000,
  spanMm: 6000,
  unitDepthMm: 6000,
  corridorMm: 1600,
  evCount: 2,
  evStops: [1, 2, 3, 4, 5],
  layout: '片廊下' as const,
}

/** 列 k（奥行方向の y の範囲）に入る部屋の数（列の幅 span） */
function roomsInSpan(g: ReturnType<typeof generateAutoPlan>, k: number, span: number = base.spanMm): number {
  return g.rooms.filter((r) => r.y0 >= k * span && r.y1 <= (k + 1) * span).length
}

describe('型の室数から、部屋割りを決める', () => {
  it('個室 1 の型（1R・1K・1DK・1LDK）は角', () => {
    for (const id of ['T-08-1R', 'T-08-1K', 'T-08-1DK', 'T-08-1LDK']) {
      expect(patternOfType(byId(id))).toEqual({ pattern: '角' })
    }
  })

  it('個室 2 の型（2K・2DK・2LDK）は田の字', () => {
    for (const id of ['T-08-2K', 'T-08-2DK', 'T-08-2LDK']) {
      expect(patternOfType(byId(id))).toEqual({ pattern: '田の字' })
    }
  })

  it('個室 3 は三室、個室 4 は四室（仮置き。統括の確認待ち）', () => {
    expect(patternOfType(byId('T-08-3LDK'))).toEqual({ pattern: '三室' })
    expect(patternOfType(byId('T-08-4LDK-2'))).toEqual({ pattern: '四室' })
  })
})

// 仕様 G99（統括の依頼 t56 の続き、2026-11-04）: 列の型は、列の幅（スパン）と間口が同じ型だけ。
// 列の幅は一つの計画で同じ（spanMm）なので、一つの計画に入る型は、間口がスパンと同じ型になる。
describe('自動作成で、列の幅と間口が同じ型の部屋割りを使う（G89・G99）', () => {
  it('2LDK（間口 8400）の列では、スパン 8400 の計画に 2LDK が全列に入り、部屋数は 4', () => {
    const wide = { ...base, spanMm: 8400 }
    const g = generateAutoPlan({ ...wide, unitTypes: master, unitTypeIds: ['T-08-2LDK'] })
    expect(g.spanTypes).toEqual(['T-08-2LDK', 'T-08-2LDK', 'T-08-2LDK', 'T-08-2LDK', 'T-08-2LDK'])
    expect([0, 1, 2, 3, 4].map((k) => roomsInSpan({ ...g, rooms: g.rooms }, k, 8400))).toEqual([4, 4, 4, 4, 4])
    expect(g.unsupportedSpans).toEqual([])
  })

  it('個室 3 の型（3LDK、間口 9400）は、スパン 9400 では三室を割れない（奥行 9400 は 3 等分できない）ので、未対応の印を出し、割らない', () => {
    const wide = { ...base, spanMm: 9400 }
    const g = generateAutoPlan({ ...wide, unitTypes: master, unitTypeIds: ['T-08-3LDK'] })
    expect(g.spanTypes).toEqual(['T-08-3LDK', 'T-08-3LDK', 'T-08-3LDK', 'T-08-3LDK', 'T-08-3LDK'])
    expect(g.unsupportedSpans).toEqual([0, 1, 2, 3, 4])
  })

  it('間口がスパンと違う型（2LDK・間口 8400）は、スパン 6000 の計画に割り付けない（null）', () => {
    const g = generateAutoPlan({ ...base, unitTypes: master, unitTypeIds: ['T-08-2LDK'] })
    expect(g.spanTypes).toEqual([null, null, null, null, null])
  })

  it('間口が未確認の型（4LDK②）は、どのスパンにも割り付けない', () => {
    const g = generateAutoPlan({ ...base, spanMm: 10400, unitTypes: master, unitTypeIds: ['T-08-4LDK-2'] })
    expect(g.spanTypes.every((t) => t === null)).toBe(true)
  })

  it('型を入れなければ、列の型は空（null）で、部屋割りは従来どおり', () => {
    const g = generateAutoPlan({ ...base })
    expect(g.spanTypes).toEqual([null, null, null, null, null])
    expect(g.unsupportedSpans).toEqual([])
    expect(roomsInSpan(g, 0)).toBe(4)
  })
})
