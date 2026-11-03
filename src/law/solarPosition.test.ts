// 仕様: 太陽の位置（D-04 P2「日射・日影の条件」、A-03 G53）。日付・時刻（日本時間）・経緯度から、太陽の高さと方位（南から西回り）を求める。
// 仕様 1: 東京（35.68N, 139.77E）の冬至（12/22）の正午（12:00 JST）の太陽の高さは約 31°、方位は南（0°）。
// 仕様 2: 春分（3/20）の正午の高さは約 54°（= 90 − 緯度 ＋ 0）。
// 仕様 3: 夜（太陽が地平線の下）は高さが負になる。
// 注: 近似式（国立天文台の簡易式）。数分程度の誤差は許す。太陽の位置の厳密な値は、日影の計算の前に確かめる。
import { describe, expect, it } from 'vitest'
import { solarPosition } from './solarPosition'

const tokyo = { lat: 35.68, lon: 139.77 }

describe('solarPosition（東京）', () => {
  it('冬至の 12:00 JST は高さ約 31°。方位は南の近く（東経 139.77 度では正中が約 11:43 のため、12:00 は南から数度西）', () => {
    const p = solarPosition({ ...tokyo, date: new Date('2026-12-22T03:00:00Z') }) // 12:00 JST
    expect(p.altitudeDeg).toBeGreaterThan(30)
    expect(p.altitudeDeg).toBeLessThan(32)
    expect(Math.abs(p.azimuthFromSouthDeg)).toBeLessThan(8)
  })

  it('冬至の正中（約 11:43 JST）では方位がほぼ南（0°）', () => {
    const p = solarPosition({ ...tokyo, date: new Date('2026-12-22T02:43:00Z') }) // 11:43 JST
    expect(Math.abs(p.azimuthFromSouthDeg)).toBeLessThan(2)
  })

  it('春分の正午は高さ約 54°', () => {
    const p = solarPosition({ ...tokyo, date: new Date('2026-03-20T03:00:00Z') })
    expect(p.altitudeDeg).toBeGreaterThan(53)
    expect(p.altitudeDeg).toBeLessThan(55)
  })

  it('夜は高さが負', () => {
    const p = solarPosition({ ...tokyo, date: new Date('2026-12-22T15:00:00Z') }) // 24:00 JST
    expect(p.altitudeDeg).toBeLessThan(0)
  })
})
