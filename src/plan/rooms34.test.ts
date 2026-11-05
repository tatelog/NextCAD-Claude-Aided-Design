import { describe, expect, it } from 'vitest'
import { splitUnitRooms } from './rooms'

// 仕様（仮置き。統括の確認待ち。ハブ A-03 G89 の部屋割り）から書いたテスト。
// - 三室（3K・3DK・3LDK）: 左半分に LDK（上 2/3）と水回り（下 1/3）、右半分に洋室 3 つを縦に並べる。
// - 四室（4K・4DK・4LDK）: 左半分に LDK（上半分）と水回り（下半分）、右半分に洋室 4 つを縦に並べる。
// - 区画の幅は 2 で割れ、奥行きは 3（三室）または 4（四室）で割れる寸法が要る。割れない寸法はエラー（田の字と同じ扱い）。
// - 割り付けた部屋の面積の合計は、区画の面積と同じ（重なりも、抜けも無い）。

const CELL = { id: 'L0', x0: 0, y0: 0, x1: 6000, y1: 6000 }

function areaOf(rooms: { x0: number; y0: number; x1: number; y1: number }[]): number {
  return rooms.reduce((s, r) => s + (r.x1 - r.x0) * (r.y1 - r.y0), 0)
}

describe('三室・四室の部屋割り（仮置き）', () => {
  it('三室: LDK・水回り・洋室 3 の 5 室になる', () => {
    const rooms = splitUnitRooms(CELL, '三室')
    expect(rooms).toHaveLength(5)
    expect(rooms.filter((r) => r.kind === 'LDK')).toHaveLength(1)
    expect(rooms.filter((r) => r.kind === '水回り')).toHaveLength(1)
    expect(rooms.filter((r) => r.kind === '洋室')).toHaveLength(3)
  })

  it('四室: LDK・水回り・洋室 4 の 6 室になる', () => {
    const rooms = splitUnitRooms(CELL, '四室')
    expect(rooms).toHaveLength(6)
    expect(rooms.filter((r) => r.kind === '洋室')).toHaveLength(4)
  })

  it('三室・四室とも、部屋の面積の合計は区画の面積と同じ（重なりも抜けも無い）', () => {
    expect(areaOf(splitUnitRooms(CELL, '三室'))).toBe(6000 * 6000)
    expect(areaOf(splitUnitRooms(CELL, '四室'))).toBe(6000 * 6000)
  })

  it('奥行きが 3 で割れない区画（三室）は、エラー（田の字と同じ扱い）', () => {
    expect(() => splitUnitRooms({ id: 'L0', x0: 0, y0: 0, x1: 6000, y1: 5002 }, '三室')).toThrow()
  })

  it('奥行きが 4 で割れない区画（四室）は、エラー', () => {
    expect(() => splitUnitRooms({ id: 'L0', x0: 0, y0: 0, x1: 6000, y1: 6002 }, '四室')).toThrow()
  })
})
