// 仕様（ハブ A-03 G99。統括の補足 2026-11-04）: 柱列をまとめた単位で住戸を割り付ける。自動作成の結果に反映する。
// 仕様 1（まとめる）: 列幅 3000 の計画に 1DK（間口 6000）を入れると、2 列ずつ 1 戸になる（区画も 2 列分で 1 つ）。
// 仕様 2（割り付けなし）: 列幅 3500 の計画では、どの列も割り付けなし（間口と合わない）と出す。
// 仕様 3（型を入れない）: 型を入れなければ、割り付けなしとは出さず、区画は列ごとのまま。
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { generateAutoPlan } from './autoPlan'
import { masterOf } from './unitTypeMaster'

const CANDIDATES = JSON.parse(readFileSync(new URL('./unitTypeCandidates.json', import.meta.url), 'utf8'))
const master = masterOf(CANDIDATES)
const id1dk = master.find((t) => t.name === '1DK')!.id

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
    expect(g.unfitSpans).toEqual([])
  })
})

describe('列幅 3500 の計画（仕様 2）', () => {
  it('どの列も割り付けなし（間口と合わない）として出す', () => {
    const g = generateAutoPlan({ ...base, targetPerFloor: 4, spanMm: 3500, unitTypes: master, unitTypeIds: [id1dk] })
    expect(g.spanTypes.every((t) => t === null)).toBe(true)
    expect(g.unfitSpans).toEqual([0, 1, 2, 3])
  })
})

describe('型を入れない（仕様 3）', () => {
  it('割り付けなしとは出さず、区画は列ごとのまま', () => {
    const g = generateAutoPlan({ ...base, targetPerFloor: 4, spanMm: 3000 })
    expect(g.unfitSpans).toEqual([])
    expect(g.cells.length).toBe(4)
  })
})
