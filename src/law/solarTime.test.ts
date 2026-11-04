import { describe, expect, it } from 'vitest'
import { sunAtApparentHours, solarPosition } from './solarPosition'
import { sunWindow } from './shadowRegulation'

// 仕様（法56条の2 第1項: 冬至日の真太陽時による午前8時から午後4時まで。一次資料 E-47、t26）から書いたテスト。
// - 日影の時刻は真太陽時で数える（日本時間ではない）。
// - 真太陽時の正午に、太陽は真南にある。
// - 東京（東経 139.8°）では、日本時間の正午はまだ真南に来ていない（西へずれる）。
// - 冬至日の 8:00〜16:00 を 10 分刻みで、48 点。

const LAT = 35.673094
const LON = 139.860149
const WINTER_SOLSTICE = new Date(Date.UTC(2026, 11, 22))

describe('真太陽時（日影の時刻の基準、t26）', () => {
  it('真太陽時の正午には、太陽は真南にある（方位 0°）', () => {
    const noon = sunAtApparentHours({ lat: LAT, date: WINTER_SOLSTICE, apparentHours: 12 })
    expect(Math.abs(noon.azimuthFromSouthDeg)).toBeLessThan(0.5)
  })

  it('東京では、日本時間の正午（03:00Z）に太陽はまだ真南にない（西へ2度以上ずれる）', () => {
    const jstNoon = solarPosition({ lat: LAT, lon: LON, date: new Date(Date.UTC(2026, 11, 22, 3, 0)) })
    expect(jstNoon.azimuthFromSouthDeg).toBeGreaterThan(2)
  })

  it('冬至日の真太陽時 8:00 から 16:00 まで、10 分刻みの 48 点を見る', () => {
    expect(sunWindow(LAT, LON, WINTER_SOLSTICE)).toHaveLength(48)
  })

  it('真太陽時 8:00 の高度は、冬至の東京でも正（太陽は昇っている）', () => {
    const first = sunWindow(LAT, LON, WINTER_SOLSTICE)[0]!
    expect(first.altitudeDeg).toBeGreaterThan(0)
  })

  it('日影の窓の最初の点は、真太陽時 8:00 の太陽と一致する', () => {
    const first = sunWindow(LAT, LON, WINTER_SOLSTICE)[0]!
    const at8 = sunAtApparentHours({ lat: LAT, date: WINTER_SOLSTICE, apparentHours: 8 })
    expect(first.altitudeDeg).toBeCloseTo(at8.altitudeDeg, 6)
    expect(first.azimuthFromSouthDeg).toBeCloseTo(at8.azimuthFromSouthDeg, 6)
  })
})
