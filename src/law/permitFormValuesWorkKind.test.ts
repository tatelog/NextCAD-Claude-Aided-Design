// 仕様（統括の依頼 2026-11-06。工事種別は新築を前提にする。申請部分＝合計と同じ判断）:
// WV1: 工事種別の値（新築・案件の入力）は、第二号の第三面 9 欄・第四面 3 欄と、第三号の 9 欄に入る。
import { describe, expect, it } from 'vitest'
import { formValuesFromVolume } from './permitFormValues'
import { extrudeVolume } from '../volume/extrude'

const block = extrudeVolume({
  footprint: [
    { x: 0, y: 0 },
    { x: 20_000, y: 0 },
    { x: 20_000, y: 20_000 },
    { x: 0, y: 20_000 },
  ],
  storey_count: 5,
  storey_height: 3_200,
})

describe('工事種別の値（仕様 WV1）', () => {
  it('WV1: 新築は、第二号の 9 欄・第四面 3 欄、第三号の 9 欄に入る（案件の入力）', () => {
    const v = formValuesFromVolume(block, { structure: 'RC', workKind: '新築' })
    expect(v['F2-3-09']).toEqual({ value: '新築', from: '案件' })
    expect(v['F2-4-03']).toEqual({ value: '新築', from: '案件' })
    expect(v['F3-2-09']).toEqual({ value: '新築', from: '案件' })
  })

  it('WV1: 工事種別が無ければ入らない', () => {
    const v = formValuesFromVolume(block, { structure: 'RC' })
    expect(v['F2-3-09']).toBeUndefined()
  })
})
