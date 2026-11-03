// 仕様: 住戸の部屋割り（P3 の間取り、仮置き）。区画を 2 × 2 に割り、LDK・洋室・水回りを置く。
// 仕様 1: 区画の中の部屋は、区画をちょうど埋める（面積の合計が区画の面積、重なりなし）。
// 仕様 2: 部屋は 4 つ。種類は LDK・洋室・洋室・水回り（3LDK の洋室 3 室は未決のため、仮置きの 2 室）。
// 仕様 3: 区画の寸法が奇数なら割れないのでエラー。
// 仕様 4: 部屋の ID は区画の ID に続けて付く（区画ごとに一意）。
import { describe, expect, it } from 'vitest'
import { splitUnitRooms, roomsOfCells } from './rooms'

const cell = { id: 'L0', x0: 0, y0: 0, x1: 6000, y1: 6000 }

describe('splitUnitRooms（住戸の部屋割り・仮置き）', () => {
  it('区画をちょうど埋める 4 室（面積の合計は区画の面積）', () => {
    const rooms = splitUnitRooms(cell)
    expect(rooms).toHaveLength(4)
    const total = rooms.reduce((s, r) => s + (r.x1 - r.x0) * (r.y1 - r.y0), 0)
    expect(total).toBe(36_000_000)
    for (const r of rooms) expect((r.x1 - r.x0) * (r.y1 - r.y0)).toBe(9_000_000)
  })

  it('部屋の種類は LDK・洋室・洋室・水回り', () => {
    const kinds = splitUnitRooms(cell).map((r) => r.kind).sort()
    expect(kinds).toEqual(['LDK', '洋室', '洋室', '水回り'].sort())
  })

  it('寸法が奇数なら割れないのでエラー', () => {
    expect(() => splitUnitRooms({ id: 'x', x0: 0, y0: 0, x1: 6001, y1: 6000 })).toThrow()
  })

  it('部屋の ID は区画の ID に続き、区画ごとに一意', () => {
    const rooms = roomsOfCells([cell, { id: 'R0', x0: 8000, y0: 0, x1: 14000, y1: 6000 }])
    const ids = rooms.map((r) => r.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids.every((id) => id.startsWith('L0-') || id.startsWith('R0-'))).toBe(true)
    expect(rooms).toHaveLength(8)
  })
})
