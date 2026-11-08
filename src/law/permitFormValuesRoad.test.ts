// 仕様（統括の依頼 2026-11-06。前面道路の幅員を、様式の【ｲ.幅員】に m で入れる。出どころは入力の名前）:
// FW1: 幅員（mm）は m（小数 2 桁）で、F2-3-06.幅員 に入る。出典は、幅員の出どころ（数値指定・対岸指定・資料指定）。
// FW2: 幅員が無い（確定していない、または 0 mm）ときは入らない。
import { describe, expect, it } from 'vitest'
import { formValuesFromVolume } from './permitFormValues'
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

describe('前面道路の幅員（仕様 FW1・FW2）', () => {
  it('FW1: 6000 mm は 6.00 m で入り、出典は出どころ（数値指定）', () => {
    const v = formValuesFromVolume(block(), { structure: 'RC', frontRoadWidth: { mm: 6000, source: '数値指定' } })
    expect(v['F2-3-06.幅員']).toEqual({ value: '6.00', from: '数値指定' })
  })

  it('FW1: 出どころが対岸指定・資料指定でも、その名前が出典になる', () => {
    const v1 = formValuesFromVolume(block(), { structure: 'RC', frontRoadWidth: { mm: 8000, source: '対岸指定' } })
    expect(v1['F2-3-06.幅員']).toEqual({ value: '8.00', from: '対岸指定' })
    const v2 = formValuesFromVolume(block(), { structure: 'RC', frontRoadWidth: { mm: 4500, source: '資料指定' } })
    expect(v2['F2-3-06.幅員']).toEqual({ value: '4.50', from: '資料指定' })
  })

  it('FW2: 幅員が無い、または 0 mm（未入力）のときは入らない', () => {
    expect(formValuesFromVolume(block(), { structure: 'RC' })['F2-3-06.幅員']).toBeUndefined()
    expect(formValuesFromVolume(block(), { structure: 'RC', frontRoadWidth: { mm: 0, source: '数値指定' } })['F2-3-06.幅員']).toBeUndefined()
  })
})
