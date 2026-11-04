// 仕様: P1 敷地の地図（D-04 P1 S1、AGENTS.md・A-04 §6、D-02 C4「地図タイル」）。
// 仕様 1: 地図は国土地理院の標準地図タイルを実行時に読む（同梱しない）。URL は https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png。
// 仕様 2: 経緯度・ズームからタイルの番号（x, y）を決める（Web メルカトルの標準式）。
// 仕様 3: 出典表示の文言を必ず返す（「出典: 国土地理院」を含む）。画面に出す前提（A-04 の出典表示必須）。
// 仕様 4: 緯度は ±85.05112878 度の範囲、ズームは 0〜18 の整数。範囲外は弾く。
// 仕様 5: OpenStreetMap の公式タイルは使わない（AGENTS.md）。URL の生成はこの関数だけに閉じる。
import { describe, expect, it } from 'vitest'
import { tileFromLonLat, tileUrl, ATTRIBUTION } from './tiles'

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

describe('tileUrl（タイルの URL）', () => {
  it('国土地理院の標準地図の URL を作る', () => {
    expect(tileUrl({ x: 909, y: 403 }, 10)).toBe('https://cyberjapandata.gsi.go.jp/xyz/std/10/909/403.png')
  })
})

describe('ATTRIBUTION（出典表示）', () => {
  it('出典として国土地理院を明記する', () => {
    expect(ATTRIBUTION).toContain('出典')
    expect(ATTRIBUTION).toContain('国土地理院')
  })
})
