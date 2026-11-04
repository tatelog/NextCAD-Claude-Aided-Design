// 仕様（ハブ A-03 G11「練習セットの作り方」の試作。代表の決定は未）: 間取りパターンの部屋の境目を、正解付きの線として取り出す。
// 限界値（二段閾値）を測るための素材。正解は間取りの割り方から決まり、描いた線には依らない。
// 仕様 1: 田の字（2×2）は、境目が縦 1 本（全高）と横 1 本（全幅）の 2 本。
// 仕様 2: 縦長（奥行きに 4 室）は、横の境目が 3 本（それぞれ全幅）。
// 仕様 3: 角（角住戸の 3 室）は、縦 1 本（全高）と横 1 本（左半分）の 2 本。
// 仕様 4: 単独（2 室）は、横の境目が 1 本（全幅）。
// 仕様 5: 正解の線の種類は、すべて壁（kind は wall）。区画の外周は含めない（外壁の線は別に扱う）。
// 仕様 6: 同じ入力には同じ出力で、入力を書き換えない。
import { describe, expect, it } from 'vitest'
import { practiceLinesOf } from './practiceSet'

const cell = { id: 'u1', x0: 0, y0: 0, x1: 6000, y1: 6000 }

const len = (l: { a: { x: number; y: number }; b: { x: number; y: number } }) => Math.hypot(l.b.x - l.a.x, l.b.y - l.a.y)

describe('間取りごとの正解の線（仕様 1〜4）', () => {
  it('仕様 1: 田の字は 2 本。縦は全高 6000、横は全幅 6000', () => {
    const lines = practiceLinesOf(cell, '田の字')
    expect(lines).toHaveLength(2)
    expect(lines.map(len).sort((p, q) => p - q)).toEqual([6000, 6000])
  })

  it('仕様 2: 縦長は横の境目 3 本で、それぞれ全幅 6000', () => {
    const lines = practiceLinesOf(cell, '縦長')
    expect(lines).toHaveLength(3)
    for (const l of lines) {
      expect(l.a.y).toBe(l.b.y)
      expect(len(l)).toBeCloseTo(6000, 6)
    }
  })

  it('仕様 3: 角は 2 本。縦は全高 6000、横は左半分 3000', () => {
    const lines = practiceLinesOf(cell, '角')
    expect(lines).toHaveLength(2)
    expect(lines.map(len).sort((p, q) => p - q)).toEqual([3000, 6000])
  })

  it('仕様 4: 単独は 1 本。横で全幅 6000', () => {
    const lines = practiceLinesOf(cell, '単独')
    expect(lines).toHaveLength(1)
    expect(len(lines[0]!)).toBeCloseTo(6000, 6)
  })
})

describe('正解の種類と外周（仕様 5）', () => {
  it('すべて壁の正解。区画の外周（x=0・x=6000・y=0・y=6000 の辺）は含めない', () => {
    for (const p of ['田の字', '縦長', '角', '単独'] as const) {
      for (const l of practiceLinesOf(cell, p)) {
        expect(l.kind).toBe('wall')
        const onOuter = (l.a.x === 0 && l.b.x === 0) || (l.a.x === 6000 && l.b.x === 6000) || (l.a.y === 0 && l.b.y === 0) || (l.a.y === 6000 && l.b.y === 6000)
        expect(onOuter).toBe(false)
      }
    }
  })
})

describe('同じ入力（仕様 6）', () => {
  it('同じ入力には同じ出力で、入力を書き換えない', () => {
    const before = JSON.stringify(cell)
    expect(practiceLinesOf(cell, '田の字')).toEqual(practiceLinesOf(cell, '田の字'))
    expect(JSON.stringify(cell)).toBe(before)
  })
})
