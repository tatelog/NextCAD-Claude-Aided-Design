// 仕様（統括の指示 2026-11-06。5b: 日射の時刻（冬至・HH:MM）が、3D の地面の影に効いているかを確かめ、試験にする）:
// 仕様 SH1: 冬至の正午（江東区）の影は北へ伸びる（平面の y が大きい側）。
// 仕様 SH2: 冬至の朝 9 時（江東区）の影は西へ伸びる。正午の影とは向きが違う（時刻を変えると影が変わる）。
// 仕様 SH3: 太陽が地平線の下（夜 3 時）なら、影は無い（null）。
// 仕様 SH4: 時刻は HH:MM の形でなければ、太陽は無い（null）。
// 仕様 SH5: 階が無ければ、影は無い（null）。
import { describe, expect, it } from 'vitest'
import type { Point } from '../geom/viewport'
import { sunShadowsOf, winterSunAt } from './sunShadow'

// 江東区（新砂二丁目付近）
const SITE = { lat: 35.65, lon: 139.8 }
// 10 m 角の建物（mm）、高さ 15 m
const SQUARE: Point[] = [
  { x: 0, y: 0 },
  { x: 10_000, y: 0 },
  { x: 10_000, y: 10_000 },
  { x: 0, y: 10_000 },
]
const FLOORS = [{ footprint: SQUARE, heightMm: 15_000 }]
const mean = (pts: readonly Point[], k: 'x' | 'y') => pts.reduce((s, p) => s + p[k], 0) / pts.length

describe('冬至の日射と影の向き（仕様 SH1・SH2）', () => {
  it('仕様 SH1: 正午の影は北へ伸びる（平面の y が建物の中心より大きい）', () => {
    const shadows = sunShadowsOf(FLOORS, winterSunAt('12:00', SITE))!
    expect(shadows).not.toBeNull()
    const shadowY = mean(shadows[0]!, 'y')
    expect(shadowY).toBeGreaterThan(mean(SQUARE, 'y'))
  })

  it('仕様 SH2: 朝 9 時の影は西へ伸びる（平面の x が建物の中心より小さい）。正午の影とは向きが違う', () => {
    const morning = sunShadowsOf(FLOORS, winterSunAt('09:00', SITE))!
    expect(mean(morning[0]!, 'x')).toBeLessThan(mean(SQUARE, 'x'))
    const noon = sunShadowsOf(FLOORS, winterSunAt('12:00', SITE))!
    expect(mean(morning[0]!, 'x')).not.toBeCloseTo(mean(noon[0]!, 'x'), 0)
  })
})

describe('影が無い場合（仕様 SH3〜SH5）', () => {
  it('仕様 SH3: 夜 3 時（太陽が地平線の下）は影が無い', () => {
    expect(sunShadowsOf(FLOORS, winterSunAt('03:00', SITE))).toBeNull()
  })

  it('仕様 SH4: 時刻が HH:MM の形でなければ、太陽は無い', () => {
    expect(winterSunAt('9:00', SITE)).toBeNull()
    expect(winterSunAt('', SITE)).toBeNull()
  })

  it('仕様 SH5: 階が無ければ、影は無い', () => {
    expect(sunShadowsOf([], winterSunAt('12:00', SITE))).toBeNull()
  })
})
