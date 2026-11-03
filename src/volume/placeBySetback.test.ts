// 仕様: 敷地との離れの数値に合わせて建物を移す（D-04 P2「敷地との離れ」、A-03 G67）。
// 仕様 1: 西と南の離れ（mm）を入れると、建物をその位置へ平行移動する。北と東は建物の大きさで決まる（入力しない）。
// 仕様 2: 移した後の離れは、入れた西と南の値になる。北と東は移動の前後で変わらない（建物の大きさが同じなら）。
// 仕様 3: 敷地が矩形でなければ移さない（離れは定義しない。G67 で未決）。
import { describe, expect, it } from 'vitest'
import { placeBySetback } from './placeBySetback'
import { setbackFromRectParcel } from './placement'

const parcel = [
  { x: 0, y: 0 },
  { x: 30_000, y: 0 },
  { x: 30_000, y: 20_000 },
  { x: 0, y: 20_000 },
]
const building = [
  { x: 100, y: 200 },
  { x: 10_100, y: 200 },
  { x: 10_100, y: 8_200 },
  { x: 100, y: 8_200 },
]

describe('placeBySetback（西と南の離れに合わせて移す）', () => {
  it('移した後、西と南の離れは入れた値になる', () => {
    const moved = placeBySetback(building, parcel, { west: 3_000, south: 4_000 })
    const s = setbackFromRectParcel(parcel, moved)
    expect(s).toMatchObject({ west: 3_000, south: 4_000 })
  })

  it('北と南、東と西は、敷地から建物の寸法を引いた残りを分け合う（移しても合計は変わらない）', () => {
    const moved = placeBySetback(building, parcel, { west: 3_000, south: 4_000 })
    const s = setbackFromRectParcel(parcel, moved)!
    const depthRest = 20_000 - (8_200 - 200)
    const widthRest = 30_000 - (10_100 - 100)
    expect(s.north + s.south).toBe(depthRest)
    expect(s.east + s.west).toBe(widthRest)
  })

  it('敷地が矩形でなければ移さない（離れは未定義）', () => {
    const lshape = [
      { x: 0, y: 0 },
      { x: 30_000, y: 0 },
      { x: 30_000, y: 10_000 },
      { x: 15_000, y: 10_000 },
      { x: 15_000, y: 20_000 },
      { x: 0, y: 20_000 },
    ]
    expect(placeBySetback(building, lshape, { west: 3_000, south: 4_000 })).toEqual(building)
  })
})
