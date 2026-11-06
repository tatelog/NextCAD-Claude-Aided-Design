// 仕様（統括の依頼 2026-11-06。4・5・6）:
// ST2: 構造は「鉄筋コンクリート」（造の前に入る文字）。第三面と第四面の両方（出典は案件）。
// FR1: 敷地と接している部分の長さは、前面道路の辺（roadEdge）の長さ（m）。出典は公図。
// FD1: 防火の区分は、防火地域（区分 24）・準防火地域（区分 25）・指定なし。管理者が不明の防火地域があれば、決めない（null）。取れていなければ null。
// FD2: 防火の値は、F2-3-04 に出典「法規」で入る。
import { describe, expect, it } from 'vitest'
import { fireLabelOf, formValuesFromVolume, frontEdgeLengthM } from './permitFormValues'
import { extrudeVolume } from '../volume/extrude'

function block() {
  return extrudeVolume({
    footprint: [
      { x: 0, y: 0 },
      { x: 20_000, y: 0 },
      { x: 20_000, y: 20_000 },
      { x: 0, y: 20_000 },
    ],
    storey_count: 5,
    storey_height: 3_200,
  })
}
const RECT = [
  { x: 0, y: 0 },
  { x: 20_000, y: 0 },
  { x: 20_000, y: 30_000 },
  { x: 0, y: 30_000 },
]

describe('構造（仕様 ST2）', () => {
  it('ST2: 構造は「鉄筋コンクリート」（案件）。第四面と第三面の両方に入る', () => {
    const v = formValuesFromVolume(block(), { structure: 'RC' })
    expect(v['F2-4-04']).toEqual({ value: '鉄筋コンクリート', from: '案件' })
    expect(v['F2-3-13.構造']).toEqual({ value: '鉄筋コンクリート', from: '案件' })
  })
})

describe('敷地と接している部分の長さ（仕様 FR1）', () => {
  it('FR1: 前面道路の辺（roadEdge）の長さ（m）。長方形 20 m × 30 m の辺 1 は 30 m', () => {
    expect(frontEdgeLengthM(RECT, 1)).toBeCloseTo(30, 6)
    expect(frontEdgeLengthM(RECT, 0)).toBeCloseTo(20, 6)
  })

  it('FR1: 辺の番号が範囲を超えたら、最後の辺', () => {
    expect(frontEdgeLengthM(RECT, 99)).toBeCloseTo(30, 6)
  })

  it('FR1: 敷地が無ければ undefined。値は公図の出典で入る', () => {
    expect(frontEdgeLengthM([], 0)).toBeUndefined()
    const v = formValuesFromVolume(block(), { structure: 'RC', frontRoadLengthM: 30 })
    expect(v['F2-3-06.敷地と接している部分の長さ']).toEqual({ value: '30.00', from: '公図' })
  })
})

describe('防火地域（仕様 FD1・FD2）', () => {
  it('FD1: 区分 24 は防火地域、25 は準防火地域、無ければ指定なし。防火が準防火より優先', () => {
    expect(fireLabelOf({ functions: [24], unknownOwner: 0 })).toBe('防火地域')
    expect(fireLabelOf({ functions: [25], unknownOwner: 0 })).toBe('準防火地域')
    expect(fireLabelOf({ functions: [25, 24], unknownOwner: 0 })).toBe('防火地域')
    expect(fireLabelOf({ functions: [], unknownOwner: 0 })).toBe('指定なし')
  })

  it('FD1: 管理者が不明の防火地域があれば決めない（null）。取れていなければ null', () => {
    expect(fireLabelOf({ functions: [], unknownOwner: 1 })).toBeNull()
    expect(fireLabelOf(null)).toBeNull()
  })

  it('FD2: 防火の値は F2-3-04 に、出典「法規」で入る', () => {
    const v = formValuesFromVolume(block(), { structure: 'RC', fire: '準防火地域' })
    expect(v['F2-3-04']).toEqual({ value: '準防火地域', from: '法規' })
  })
})
