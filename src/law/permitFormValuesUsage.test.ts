// 仕様（統括の依頼 2026-11-06。7・判断）:
// UG1: 用途（共同住宅・案件の入力）は、F2-5-07.用途 に入る。用途が無いときは入らない。
// UG2: 延べ面積（ボリュームの延べ床面積、㎡）は、F2-5-07.延べ面積 に入る（出典はボリューム）。
// NB1: 新築として申請部分＝合計で書いた、という一行（空欄の一覧に出す文）は一か所に決める。
import { describe, expect, it } from 'vitest'
import { formValuesFromVolume, NEW_BUILDING_NOTE } from './permitFormValues'
import { extrudeVolume } from '../volume/extrude'

function block(storeys: number) {
  return extrudeVolume({
    footprint: [
      { x: 0, y: 0 },
      { x: 20_000, y: 0 },
      { x: 20_000, y: 20_000 },
      { x: 0, y: 20_000 },
    ],
    storey_count: storeys,
    storey_height: 3_200,
  })
}

describe('用途別床面積（仕様 UG1・UG2）', () => {
  it('UG1: 用途は案件の入力から、F2-5-07.用途 に入る', () => {
    const v = formValuesFromVolume(block(5), { structure: 'RC', usage: '共同住宅' })
    expect(v['F2-5-07.用途']).toEqual({ value: '共同住宅', from: '案件' })
  })

  it('UG1: 用途が無ければ入らない', () => {
    expect(formValuesFromVolume(block(5), { structure: 'RC' })['F2-5-07.用途']).toBeUndefined()
  })

  it('UG2: 延べ面積は、ボリュームの延べ床面積（5 階 × 400 ㎡ = 2000.00）で入る', () => {
    const v = formValuesFromVolume(block(5), { structure: 'RC' })
    expect(v['F2-5-07.延べ面積']).toEqual({ value: '2000.00', from: 'ボリューム' })
  })
})

describe('新築の一行（仕様 NB1）', () => {
  it('NB1: 一行の文は一か所に決まっている', () => {
    expect(NEW_BUILDING_NOTE).toBe('新築として申請部分＝合計で記入')
  })
})
