// 仕様（ハブ A-03 G62・D-03 T-02 外装 part「バルコニー」・G76「バルコニー」）: バルコニーは、住戸の外周の辺に付く外装の部品。
// 面と奥行は仮置き（出典なし・A-07 で確認するまで）。面の既定は下側（外形の下の辺＝南面を想定。真北の向きは未決）、奥行は 1600 mm。
// 仕様 1: 面（faces）の辺が外形の外周にある住戸だけ、バルコニーが付く。外周に無い辺は付かない。
// 仕様 2: 面積は、その辺の長さ × 奥行（m²）。下・上の辺は区画の幅、左・右の辺は区画の奥行を長さにする。
// 仕様 3: 面と奥行は、引数で変えられる（既定は下・1600 mm）。
// 仕様 4: 入力を書き換えず、同じ入力には同じ出力。
import { describe, expect, it } from 'vitest'
import type { Rect } from './candidateCells'
import { balconyOfUnit } from './balcony'

const A: Rect = { id: 'A', x0: 0, y0: 0, x1: 3000, y1: 6000 }
const C: Rect = { id: 'C', x0: 0, y0: 6000, x1: 3000, y1: 12000 }
const OUTLINE = { W: 6000, D: 12000 }

describe('バルコニー（仮置き。仕様 1〜4）', () => {
  it('仕様 1: 下の外周に接する住戸だけ、既定の下の面にバルコニーが付く', () => {
    expect(balconyOfUnit(C, { outline: OUTLINE })).toEqual({ faces: ['下'], areaM2: 4.8 })
    expect(balconyOfUnit(A, { outline: OUTLINE })).toEqual({ faces: [], areaM2: 0 })
  })

  it('仕様 2: 面積は辺の長さ × 奥行。左の辺は区画の奥行を長さにする', () => {
    expect(balconyOfUnit(A, { outline: OUTLINE, faces: ['左'] })).toEqual({ faces: ['左'], areaM2: 9.6 })
  })

  it('仕様 3: 面と奥行は引数で変えられる（奥行 1000 mm の下の面は 3.0 m²）', () => {
    expect(balconyOfUnit(C, { outline: OUTLINE, depthMm: 1000 })).toEqual({ faces: ['下'], areaM2: 3 })
  })

  it('仕様 4: 入力を書き換えず、同じ入力には同じ出力', () => {
    const first = balconyOfUnit(C, { outline: OUTLINE })
    expect(balconyOfUnit(C, { outline: OUTLINE })).toEqual(first)
    expect(C).toEqual({ id: 'C', x0: 0, y0: 6000, x1: 3000, y1: 12000 })
  })
})
