// 仕様（統括の決定 G114、2026-11-05。G65 のつまみ）: つまみで動かした線は、動かしたあとに Claude が判定し直す（聞き返さず、右側でまとめて確認。G14）。
// この関数は、動いた線の id を返す。判定し直す印（要確認）を付ける材料になる。
// 仕様 1（動いた）: 同じ id の線で中身（端点など）が変わったものだけ返す。
// 仕様 2（動かない）: 変わらない線は返さない。増えた・消えた線は、ここでは扱わない（つまみは線を増やさない）。
// 仕様 3: 入力を書き換えず、同じ入力には同じ出力。
import { describe, expect, it } from 'vitest'
import { changedIds } from './changedIds'

describe('動いた線の id（G114）', () => {
  it('中身が変わった線だけ id を返す', () => {
    const before = [
      { id: 'a', p: [0, 0] },
      { id: 'b', p: [1, 0] },
    ]
    const after = [
      { id: 'a', p: [0, 0] },
      { id: 'b', p: [2, 0] },
    ]
    expect(changedIds(before, after)).toEqual(['b'])
  })

  it('何も変わらなければ空', () => {
    const same = [{ id: 'a', p: [0, 0] }]
    expect(changedIds(same, [{ id: 'a', p: [0, 0] }])).toEqual([])
  })

  it('増えた・消えた id は返さない（つまみは線を増やさない）', () => {
    expect(changedIds([{ id: 'a', p: [0] }], [{ id: 'a', p: [0] }, { id: 'c', p: [9] }])).toEqual([])
    expect(changedIds([{ id: 'a', p: [0] }, { id: 'd', p: [1] }], [{ id: 'a', p: [0] }])).toEqual([])
  })

  it('同じ入力には同じ出力で、入力を書き換えない', () => {
    const before = [{ id: 'a', p: [0] }]
    const after = [{ id: 'a', p: [5] }]
    expect(changedIds(before, after)).toEqual(changedIds(before, after))
    expect(before).toEqual([{ id: 'a', p: [0] }])
  })
})
