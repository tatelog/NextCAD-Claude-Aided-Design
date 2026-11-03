// 仕様: 経緯度を Web メルカトルのワールド座標（ピクセル、1 タイル = 256 px）にする。
// 仕様 1: 原点（経度 0、緯度 0）のズーム 0 は (128, 128)。
// 仕様 2: その整数部をタイル幅で割った値は、タイル番号（tileFromLonLat）と一致する。
// 仕様 3: ズームが 1 上がると座標は 2 倍になる。
import { describe, expect, it } from 'vitest'
import { worldPixel } from './worldPixel'
import { tileFromLonLat } from './tiles'

describe('worldPixel（ワールド座標）', () => {
  it('原点は、ズーム 0 で (128, 128)', () => {
    expect(worldPixel({ lon: 0, lat: 0 }, 0)).toEqual({ x: 128, y: 128 })
  })

  it('タイル番号と一致する（256 px で割って切り捨て）', () => {
    const points = [
      { lon: 139.7671, lat: 35.6812 },
      { lon: 139.860149, lat: 35.673094 },
    ]
    for (const p of points) {
      const px = worldPixel(p, 15)
      const tile = tileFromLonLat(p, 15)
      expect(Math.floor(px.x / 256)).toBe(tile.x)
      expect(Math.floor(px.y / 256)).toBe(tile.y)
    }
  })

  it('ズームが 1 上がると座標は 2 倍', () => {
    const a = worldPixel({ lon: 139.7671, lat: 35.6812 }, 10)
    const b = worldPixel({ lon: 139.7671, lat: 35.6812 }, 11)
    expect(b.x).toBeCloseTo(a.x * 2, 6)
    expect(b.y).toBeCloseTo(a.y * 2, 6)
  })
})
