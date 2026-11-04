// 仕様（ハブ A-03 G77・G137。統括の依頼 2026-11-05）: 個室は洋室扱い。和室は洋室として設計する（和室の部屋は作らない）。
// 仕様 1: 3LDK（個室 3）の住戸は、LDK・洋室 3・水回りの 5 室。
// 仕様 2: 2LDK（個室 2）の住戸は、LDK・洋室 2・水回りの 4 室。
// 仕様 3: 部屋の種類は LDK・洋室・水回りの 3 つだけ（和室は無い）。
// 注: 仕様 1〜3 は、G137 の決定の前から既に満たしている。このテストは、後の変更で和室が混ざるのを防ぐための番人。
import { describe, expect, it } from 'vitest'
import { splitUnitRooms, type RoomPattern } from './rooms'

// 寸法は、三室（幅 2 等分・奥行 3 等分）と田の字と四室の割り付けが全部割れる大きさ
const cell = { id: 'U1', x0: 0, y0: 0, x1: 4000, y1: 6000 }

describe('個室は洋室扱い（G137）', () => {
  it('仕様 1: 3LDK（三室）は LDK・洋室 3・水回りの 5 室', () => {
    const kinds = splitUnitRooms(cell, '三室').map((r) => r.kind).sort()
    expect(kinds).toEqual(['LDK', '水回り', '洋室', '洋室', '洋室'])
  })

  it('仕様 2: 2LDK（田の字）は LDK・洋室 2・水回りの 4 室', () => {
    const kinds = splitUnitRooms(cell, '田の字').map((r) => r.kind).sort()
    expect(kinds).toEqual(['LDK', '水回り', '洋室', '洋室'])
  })

  it('仕様 3: どの割り付けも、部屋の種類は LDK・洋室・水回りだけ（和室は無い）', () => {
    const patterns: RoomPattern[] = ['田の字', '縦長', '角', '単独', '三室', '四室']
    for (const p of patterns) {
      for (const r of splitUnitRooms(cell, p)) {
        expect(['LDK', '洋室', '水回り']).toContain(r.kind)
      }
    }
  })
})
