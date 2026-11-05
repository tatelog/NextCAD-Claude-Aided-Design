// 仕様（ハブ A-03 G99。統括の補足 2026-11-04。統括の訂正 2026-11-04。前の「割り付けなし」の仕様は取り消し）:
// 柱列をまとめた単位で住戸を割り付ける。自動作成の結果に反映する。
// 仕様 1（まとめる）: 列幅 3000 の計画に 1DK（間口 6000）を入れると、2 列ずつ 1 戸になる（区画も 2 列分で 1 つ）。
// 仕様 2（余りは前の住戸に含める）: 列幅 3000 が 5 本なら、1DK は 2 戸。余りの 3 本目は後ろの住戸に含めて幅を広げ、その列を要確認にする。
// 仕様 3（N 戸）: 列幅 4000 が 3 本で、1DK（間口 6000）は 2 戸（6000 ずつ。区画も 2 つ）。
// 仕様 4（仮の間口）: 未確認の型（4LDK②）は、列の幅で仮置きして、列ごとに 1 戸。要確認。
// 仕様 5（合わない型）: 列幅 3500 に 1DK（間口 6000）を入れても、割り付けなしにはせず、列の幅で 1 戸ずつ仮置き（要確認）。
// 仕様 6（型を入れない）: 型を入れなければ、区画は列ごとのまま。要確認の列は無い。
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { generateAutoPlan } from './autoPlan'
import { masterOf } from './unitTypeMaster'

const CANDIDATES = JSON.parse(readFileSync(new URL('./unitTypeCandidates.json', import.meta.url), 'utf8'))
const master = masterOf(CANDIDATES)
const id1dk = master.find((t) => t.name === '1DK')!.id
const idUnknown = master.find((t) => t.frontage_mm === null)!.id

const base = {
  storeyCount: 5,
  storeyHeightMm: 3000,
  unitDepthMm: 6000,
  corridorMm: 1600,
  evCount: 2,
  evStops: [1, 2, 3, 4, 5],
  layout: '片廊下' as const,
}

describe('列幅 3000 の計画に 1DK（間口 6000）（仕様 1）', () => {
  it('2 列ずつ 1 戸になる（4 列なら 2 戸、区画も 2 つ、型は 2 列ずつ同じ）', () => {
    const g = generateAutoPlan({ ...base, targetPerFloor: 4, spanMm: 3000, unitTypes: master, unitTypeIds: [id1dk] })
    expect(g.spanTypes).toEqual([id1dk, id1dk, id1dk, id1dk])
    expect(g.cells.length).toBe(2)
    expect(g.unitsPerFloor).toBe(2)
    expect(g.provisionalSpans).toEqual([])
    expect(g.absorbedSpans).toEqual([])
  })
})

describe('余りは前の住戸に含める（仕様 2）', () => {
  it('列幅 3000 が 5 本なら、1DK は 2 戸。後ろの住戸は 3 列分（9000）に広がり、その 3 列は要確認', () => {
    const g = generateAutoPlan({ ...base, targetPerFloor: 5, spanMm: 3000, unitTypes: master, unitTypeIds: [id1dk] })
    expect(g.spanTypes).toEqual([id1dk, id1dk, id1dk, id1dk, id1dk])
    expect(g.cells.length).toBe(2)
    expect(g.cells.map((c) => c.y1 - c.y0)).toEqual([6000, 9000])
    expect(g.unitsPerFloor).toBe(2)
    expect(g.absorbedSpans).toEqual([2, 3, 4])
  })
})

describe('N 戸の範囲（仕様 3）', () => {
  it('列幅 4000 が 3 本なら、1DK は 2 戸（6000 ずつ。2 本目は 6000 の位置で区切り、区画も 2 つ）', () => {
    const g = generateAutoPlan({ ...base, targetPerFloor: 3, spanMm: 4000, unitTypes: master, unitTypeIds: [id1dk] })
    expect(g.cells.map((c) => [c.y0, c.y1])).toEqual([
      [0, 6000],
      [6000, 12000],
    ])
    expect(g.unitsPerFloor).toBe(2)
    expect(g.absorbedSpans).toEqual([])
  })
})

describe('仮の間口（仕様 4）', () => {
  it('未確認の型（4LDK②）は、列ごとに列の幅で仮置きし、要確認にする（候補からは外さない）', () => {
    const g = generateAutoPlan({ ...base, targetPerFloor: 4, spanMm: 3000, unitTypes: master, unitTypeIds: [idUnknown] })
    expect(g.spanTypes).toEqual([idUnknown, idUnknown, idUnknown, idUnknown])
    expect(g.cells.map((c) => c.y1 - c.y0)).toEqual([3000, 3000, 3000, 3000])
    expect(g.provisionalSpans).toEqual([0, 1, 2, 3])
    expect(g.unitsPerFloor).toBe(4)
  })
})

describe('合わない型（仕様 5）', () => {
  it('列幅 3500 に 1DK を入れても、割り付けなしにはせず、列の幅で 1 戸ずつ仮置き（要確認）', () => {
    const g = generateAutoPlan({ ...base, targetPerFloor: 4, spanMm: 3500, unitTypes: master, unitTypeIds: [id1dk] })
    expect(g.spanTypes).toEqual([id1dk, id1dk, id1dk, id1dk])
    expect(g.cells.length).toBe(4)
    expect(g.provisionalSpans).toEqual([0, 1, 2, 3])
  })
})

describe('型を入れない（仕様 6）', () => {
  it('区画は列ごとのまま。要確認の列は無い', () => {
    const g = generateAutoPlan({ ...base, targetPerFloor: 4, spanMm: 3000 })
    expect(g.provisionalSpans).toEqual([])
    expect(g.absorbedSpans).toEqual([])
    expect(g.cells.length).toBe(4)
  })
})
