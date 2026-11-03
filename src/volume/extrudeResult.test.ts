// 仕様: 外形から立体を作る。失敗したときは黙って消さず、理由を返す（P2 の 3D と日影が消えた理由を画面に出すため）。
// 仕様 1: 整数 mm の矩形と正の階数・階高なら、立体を返す（ok: true）。
// 仕様 2: 座標に小数があれば、立体は作らず、理由を返す（ok: false）。
// 仕様 3: 階数が 0 以下なら、立体は作らず、理由を返す。理由は空文字にしない。
import { describe, expect, it } from 'vitest'
import { extrudeOrReason } from './extrudeResult'

const rect = [
  { x: 0, y: 0 },
  { x: 20000, y: 0 },
  { x: 20000, y: 12000 },
  { x: 0, y: 12000 },
]

describe('extrudeOrReason（立体を作る。失敗は理由つき）', () => {
  it('整数 mm の矩形で正しい階数と階高なら、立体を返す', () => {
    const r = extrudeOrReason({ footprint: rect, storey_count: 5, storey_height: 3000 })
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.volume.storey_count).toBe(5)
  })

  it('座標に小数があれば、立体は作らず、理由を返す', () => {
    const frac = [
      { x: 0.5, y: 0 },
      { x: 20000, y: 0 },
      { x: 20000, y: 12000 },
      { x: 0, y: 12000 },
    ]
    const r = extrudeOrReason({ footprint: frac, storey_count: 5, storey_height: 3000 })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason.length).toBeGreaterThan(0)
  })

  it('階数が 0 以下なら、立体は作らず、理由を返す（理由は空でない）', () => {
    const r = extrudeOrReason({ footprint: rect, storey_count: 0, storey_height: 3000 })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason.length).toBeGreaterThan(0)
  })
})
