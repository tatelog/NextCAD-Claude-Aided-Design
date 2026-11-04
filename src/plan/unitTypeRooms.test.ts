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

/** 列 k（奥行方向の y の範囲）に入る部屋の数 */
function roomsInSpan(g: ReturnType<typeof generateAutoPlan>, k: number): number {
  return g.rooms.filter((r) => r.y0 >= k * base.spanMm && r.y1 <= (k + 1) * base.spanMm).length
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

describe('自動作成で、列ごとに型の部屋割りを使う（G89）', () => {
  it('列の型（2LDK・1LDK・2LDK・1LDK・2LDK）に合わせて、列ごとの部屋数（4・3・4・3・4）になる', () => {
    const g = generateAutoPlan({
      ...base,
      unitTypes: master,
      unitTypeIds: ['T-08-2LDK', 'T-08-1LDK'],
    })
    expect(g.spanTypes).toEqual(['T-08-2LDK', 'T-08-1LDK', 'T-08-2LDK', 'T-08-1LDK', 'T-08-2LDK'])
    expect([0, 1, 2, 3, 4].map((k) => roomsInSpan(g, k))).toEqual([4, 3, 4, 3, 4])
    expect(g.unsupportedSpans).toEqual([])
  })

  it('個室 3 の型（3LDK）の列は、三室（LDK・水回り・洋室 3 の 5 室）で、未対応の印は出ない', () => {
    const g = generateAutoPlan({ ...base, unitTypes: master, unitTypeIds: ['T-08-3LDK'] })
    expect(g.unsupportedSpans).toEqual([])
    expect([0, 1, 2, 3, 4].map((k) => roomsInSpan(g, k))).toEqual([5, 5, 5, 5, 5])
  })

  it('型を入れなければ、列の型は空（null）で、部屋割りは従来どおり', () => {
    const g = generateAutoPlan({ ...base })
    expect(g.spanTypes).toEqual([null, null, null, null, null])
    expect(g.unsupportedSpans).toEqual([])
    expect(roomsInSpan(g, 0)).toBe(4)
  })
})
