// 仕様: 間取りパターンの部屋割り（P3、仮置き）。区画を割る形を、パターンで選ぶ。
// 仕様 1: 田の字は 2 × 2 の 4 室（LDK・洋室・洋室・水回り）。
// 仕様 2: 縦長は奥行き方向に 4 室を並べる（間口いっぱいの細長い室）。種類は田の字と同じ 4 室。
// 仕様 3: 角は、角住戸の 3 室（LDK を大きく、洋室と水回りを角の片側に）。
// 仕様 4: 単独は 2 室（LDK を上 2/3、水回りを下 1/3）。
// 仕様 5: どのパターンも、区画をちょうど埋め、室どうしは重ならない（面積の合計が区画と一致）。
// 仕様 6: 割り切れない寸法はエラー。
import { describe, expect, it } from 'vitest'
import { splitUnitRooms, type RoomPattern } from './rooms'

const cell = { id: 'C', x0: 0, y0: 0, x1: 6000, y1: 6000 }

function overlap(a: { x0: number; y0: number; x1: number; y1: number }, b: { x0: number; y0: number; x1: number; y1: number }) {
  return a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1
}

describe('間取りパターン（部屋割り）', () => {
  it('田の字は 4 室（LDK・洋室 2・水回り）', () => {
    const rooms = splitUnitRooms(cell, '田の字')
    expect(rooms.map((r) => r.kind).sort()).toEqual(['LDK', '洋室', '洋室', '水回り'].sort())
  })

  it('縦長は 4 室を奥行き方向に並べる（間口は区画いっぱい）', () => {
    const rooms = splitUnitRooms(cell, '縦長')
    expect(rooms).toHaveLength(4)
    for (const r of rooms) {
      expect(r.x0).toBe(0)
      expect(r.x1).toBe(6000)
      expect(r.y1 - r.y0).toBe(1500)
    }
  })

  it('角は 3 室（LDK・洋室・水回り）', () => {
    const rooms = splitUnitRooms(cell, '角')
    expect(rooms.map((r) => r.kind).sort()).toEqual(['LDK', '洋室', '水回り'].sort())
  })

  it('単独は 2 室（LDK・水回り）', () => {
    const rooms = splitUnitRooms(cell, '単独')
    expect(rooms.map((r) => r.kind).sort()).toEqual(['LDK', '水回り'].sort())
  })

  it('どのパターンも区画をちょうど埋め、室どうしは重ならない', () => {
    const patterns: RoomPattern[] = ['田の字', '縦長', '角', '単独']
    for (const p of patterns) {
      const rooms = splitUnitRooms(cell, p)
      const total = rooms.reduce((s, r) => s + (r.x1 - r.x0) * (r.y1 - r.y0), 0)
      expect(total).toBe(36_000_000)
      for (let i = 0; i < rooms.length; i++) for (let j = i + 1; j < rooms.length; j++) {
        expect(overlap(rooms[i]!, rooms[j]!)).toBe(false)
      }
    }
  })

  it('割り切れない寸法はエラー（縦長は 4 で割る）', () => {
    expect(() => splitUnitRooms({ id: 'x', x0: 0, y0: 0, x1: 6000, y1: 6002 }, '縦長')).toThrow()
  })
})
