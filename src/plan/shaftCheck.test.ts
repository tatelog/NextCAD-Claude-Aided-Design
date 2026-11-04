// 仕様（統括の依頼 2026-11-05、t61 の残り。G119・G30・G56）: 縦シャフトの上下階の一致の検査を、P3 の結果に配線する。
// 今は基準階の複製（G30）なので、階ごとに個別の縦シャフトを持つ階がある場合にだけ食い違いが出る。
// 仕様 1（複製）: 個別の階が無いとき、各階は基準階の縦シャフトの複製になる（階の数だけ並ぶ）。
// 仕様 2（個別の階）: 個別に持つ階はその階の値を使い、ほかの階は基準階の複製。
// 仕様 3（一致の文）: 上下階が一致するとき、結果の一行は「上下階で一致」を含む。
// 仕様 4（要確認の文）: 食い違う階があるとき、結果の一行は「要確認」と、食い違った階の番号（1 始まり）を含む。
// 仕様 5（階が 1 つ）: 階が 1 つだけのとき、検査は一致。
import { describe, expect, it } from 'vitest'
import { checkShaftAlignment, type ShaftPlace } from './shaftAlignment'
import { shaftFloorsOf, shaftNoteOf } from './shaftCheck'

const ps: ShaftPlace = { id: 'PS-u1', x0: 100, y0: 200, x1: 700, y1: 800 }
const eps: ShaftPlace = { id: 'EPS', x0: 0, y0: 0, x1: 600, y1: 600 }
const base = [ps, eps]

describe('縦シャフトの階ごとの並べ方（仕様 1・2）', () => {
  it('仕様 1: 個別の階が無いとき、各階は基準階の複製（階の数だけ並ぶ）', () => {
    const floors = shaftFloorsOf(base, 3)
    expect(floors).toHaveLength(3)
    expect(floors).toEqual([base, base, base])
  })

  it('仕様 2: 個別に持つ階はその値を使い、ほかの階は基準階の複製', () => {
    const moved = { ...ps, x0: 150, x1: 750 }
    const floors = shaftFloorsOf(base, 3, { 2: [moved, eps] })
    expect(floors[0]).toEqual(base)
    expect(floors[1]).toEqual(base)
    expect(floors[2]).toEqual([moved, eps])
  })
})

describe('結果の一行（仕様 3・4）', () => {
  it('仕様 3: 上下階が一致するとき、「上下階で一致」を含む', () => {
    expect(shaftNoteOf(checkShaftAlignment(shaftFloorsOf(base, 3)))).toContain('上下階で一致')
  })

  it('仕様 4: 食い違う階があるとき、「要確認」と食い違った階の番号（1 始まり）を含む', () => {
    const moved = { ...ps, x0: 150, x1: 750 }
    const note = shaftNoteOf(checkShaftAlignment(shaftFloorsOf(base, 3, { 1: [moved, eps] })))
    expect(note).toContain('要確認')
    expect(note).toContain('2 階')
    expect(note).not.toContain('上下階で一致')
  })
})

describe('階が 1 つ（仕様 5）', () => {
  it('階が 1 つだけなら、検査は一致', () => {
    expect(shaftNoteOf(checkShaftAlignment(shaftFloorsOf(base, 1)))).toContain('上下階で一致')
  })
})
