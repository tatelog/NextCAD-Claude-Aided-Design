// 仕様: P1 敷地の地図のタイル番号（D-04 P1 S1、D-02 C4「地図タイル」）。
// 仕様 2: 経緯度・ズームからタイルの番号（x, y）を決める（Web メルカトルの標準式）。
// 仕様 4: 緯度は ±85.05112878 度の範囲、ズームは 0〜18 の整数。範囲外は弾く。
// 仕様 1・3・5（地図の URL・出典表示・OSM を使わないこと）は、MapLibre の基図（src/map/basemap.ts）に移したため、ここからは外した（t85）。
import { describe, expect, it } from 'vitest'
import { tileFromLonLat } from './tiles'

describe('tileFromLonLat（タイル番号）', () => {
  it('ズーム 0 は世界全体の 1 枚（0, 0）', () => {
    expect(tileFromLonLat({ lon: 139.7671, lat: 35.6812 }, 0)).toEqual({ x: 0, y: 0 })
  })

  it('東京駅付近はズーム 10 で（909, 403）', () => {
    expect(tileFromLonLat({ lon: 139.7671, lat: 35.6812 }, 10)).toEqual({ x: 909, y: 403 })
  })

  it('緯度・ズームが範囲外なら弾く', () => {
    expect(() => tileFromLonLat({ lon: 0, lat: 86 }, 10)).toThrow()
    expect(() => tileFromLonLat({ lon: 0, lat: 0 }, 19)).toThrow()
    expect(() => tileFromLonLat({ lon: 0, lat: 0 }, 2.5)).toThrow()
  })
})
