// 仕様（ハブ A-03 G67・G134 の例外・t72。統括の依頼 2026-11-05）: 敷地からの離れを、北・東・南・西の 4 本の寸法線で出す。
// 仕様 1（位置）: 西は建物の左辺の中ほどの高さで、敷地の左辺から建物の左辺まで。東・南・北も同じく、それぞれの辺の中ほどから。
// 仕様 2（表記）: 寸法線の表記は離れの表記（m・小数 2 桁。setbackLabel）。値は setbackFromRectParcel と同じ。
// 仕様 3（矩形だけ）: 敷地が軸に平行な矩形でなければ、寸法線は出さない（null）。
// 仕様 4（負の値）: 建物が敷地からはみ出すと、その辺の値は負になり、表記も負になる。
import { describe, expect, it } from 'vitest'
import { setbackLines } from './setbackLines'

const parcel = [
  { x: 0, y: 0 },
  { x: 20000, y: 0 },
  { x: 20000, y: 30000 },
  { x: 0, y: 30000 },
]
// 建物: 西と東に 2,000 mm、南と北に 4,000 mm の離れ
const building = [
  { x: 2000, y: 4000 },
  { x: 18000, y: 4000 },
  { x: 18000, y: 26000 },
  { x: 2000, y: 26000 },
]

describe('敷地からの離れの寸法線（G67・t72）', () => {
  it('仕様 1・2: 4 本。西・東は中ほどの高さ、南・北は中ほどの幅に、敷地の辺から建物の辺まで', () => {
    const lines = setbackLines(parcel, building)!
    const byside = Object.fromEntries(lines.map((l) => [l.side, l]))
    expect(byside.west!.from).toEqual({ x: 0, y: 15000 })
    expect(byside.west!.to).toEqual({ x: 2000, y: 15000 })
    expect(byside.east!.from).toEqual({ x: 18000, y: 15000 })
    expect(byside.east!.to).toEqual({ x: 20000, y: 15000 })
    expect(byside.south!.from).toEqual({ x: 10000, y: 0 })
    expect(byside.south!.to).toEqual({ x: 10000, y: 4000 })
    expect(byside.north!.from).toEqual({ x: 10000, y: 26000 })
    expect(byside.north!.to).toEqual({ x: 10000, y: 30000 })
    expect(byside.west!.label).toBe('2.00 m')
    expect(byside.east!.label).toBe('2.00 m')
    expect(byside.south!.label).toBe('4.00 m')
    expect(byside.north!.label).toBe('4.00 m')
  })

  it('仕様 3: 敷地が矩形でなければ null', () => {
    const notRect = [
      { x: 0, y: 0 },
      { x: 20000, y: 0 },
      { x: 10000, y: 30000 },
    ]
    expect(setbackLines(notRect, building)).toBeNull()
  })

  it('仕様 4: 建物が敷地からはみ出す辺は、負の値・負の表記', () => {
    const outside = [
      { x: -500, y: 4000 },
      { x: 18000, y: 4000 },
      { x: 18000, y: 26000 },
      { x: -500, y: 26000 },
    ]
    const west = setbackLines(parcel, outside)!.find((l) => l.side === 'west')!
    expect(west.label).toBe('-0.50 m')
  })
})
