// 仕様: P3 平面の住戸数（D-02 C6「住戸数と部屋数の出し方」、A-03 G17、D-03 T-02 住戸の cell_results）。
// 仕様 1: 各階の外形の中で、廊下の両側に並ぶ区画（住戸候補）を数える。完全な区画だけを数える。
// 仕様 2: 区画がコア（階段・EV・ホール）と重なれば除外（理由 core）。
// 仕様 3: 区画が外形からはみ出す（外形の欠けと重なる場合も含む）なら除外（理由 outside）。
// 仕様 4: 区画が廊下に接していなければ除外（理由 no_corridor）。
// 仕様 5: 一つの区画は一度だけ数える。複数の理由があっても減算は二重にしない。理由は全部持つ。
// 仕様 6: コア同士が重なる案は不成立（plan_status = 不成立）。不成立の案の住戸数は「確定住戸数」にしない（confirmed_units = null）。
// 仕様 7: 区画 ID が重複する、または区画の幅・奥行きが 0 以下なら弾く。
import { describe, expect, it } from 'vitest'
import { countUnits, type UnitInput } from './units'

const outline = [
  { x: 0, y: 0 },
  { x: 20_000, y: 0 },
  { x: 20_000, y: 12_000 },
  { x: 0, y: 12_000 },
]

// 中央に南北の廊下（幅 2 m、長さ 12 m）。その両側に、廊下の辺へ接して 4 区画ずつ（幅 4 m、奥行 3 m）。
const corridor = { id: 'corridor', x0: 9_000, y0: 0, x1: 11_000, y1: 12_000 }
const leftCells = [0, 1, 2, 3].map((row) => ({ id: `L${row}`, x0: 5_000, y0: row * 3_000, x1: 9_000, y1: (row + 1) * 3_000 }))
const rightCells = [0, 1, 2, 3].map((row) => ({ id: `R${row}`, x0: 11_000, y0: row * 3_000, x1: 15_000, y1: (row + 1) * 3_000 }))

function input(overrides: Partial<UnitInput> = {}): UnitInput {
  return { outline, corridors: [corridor], cores: [], cells: [...leftCells, ...rightCells], ...overrides }
}

describe('countUnits', () => {
  it('廊下の両側の完全な区画を数え、成立・確定住戸数を出す', () => {
    const r = countUnits(input())
    expect(r.usable_count).toBe(8)
    expect(r.excluded).toEqual([])
    expect(r.plan_status).toBe('成立')
    expect(r.confirmed_units).toBe(8)
  })

  it('区画がコアと重なれば除外し、理由 core を付ける', () => {
    const stairs = { id: 'stairs', x0: 5_500, y0: 500, x1: 6_500, y1: 1_500 }
    const r = countUnits(input({ cores: [stairs] }))
    expect(r.usable_count).toBe(7)
    expect(r.excluded).toEqual([{ id: 'L0', reasons: ['core'] }])
    expect(r.plan_status).toBe('成立')
  })

  it('区画が外形からはみ出せば除外し、理由 outside を付ける。確定住戸数は出さない', () => {
    // 廊下の上端（y = 12 m）の先へ 3 m はみ出す区画。廊下の辺には接している
    const over = { id: 'over', x0: 9_000, y0: 12_000, x1: 11_000, y1: 15_000 }
    const r = countUnits(input({ cells: [...leftCells, ...rightCells, over] }))
    expect(r.excluded).toEqual([{ id: 'over', reasons: ['outside'] }])
    expect(r.usable_count).toBe(8)
    expect(r.plan_status).toBe('不成立')
    expect(r.confirmed_units).toBeNull()
  })

  it('廊下に接していない区画は除外し、理由 no_corridor を付ける', () => {
    // 外形の内側にあり、他の区画とも廊下とも重ならないが、廊下の辺に接していない区画
    const lone = { id: 'lone', x0: 0, y0: 0, x1: 1_000, y1: 3_000 }
    const r = countUnits(input({ cells: [...leftCells, ...rightCells, lone] }))
    expect(r.excluded).toEqual([{ id: 'lone', reasons: ['no_corridor'] }])
    expect(r.usable_count).toBe(8)
    expect(r.plan_status).toBe('成立')
  })

  it('一区画が複数の理由を持っても一度だけ数え、理由は全部持つ', () => {
    // 外形からはみ出し（outside）、かつコアと重なる（core）。廊下の辺には接している
    const over = { id: 'over', x0: 9_000, y0: 12_000, x1: 11_000, y1: 15_000 }
    const stairs = { id: 'stairs', x0: 9_500, y0: 12_500, x1: 10_500, y1: 13_500 }
    const r = countUnits(input({ cores: [stairs], cells: [...leftCells, ...rightCells, over] }))
    const hits = r.excluded.filter((e) => e.id === 'over')
    expect(hits).toHaveLength(1)
    expect([...hits[0]!.reasons].sort()).toEqual(['core', 'outside'])
    expect(r.usable_count).toBe(8)
  })

  it('コア同士が重なる案は不成立になり、確定住戸数は出さない', () => {
    const a = { id: 'a', x0: 1_000, y0: 1_000, x1: 3_000, y1: 3_000 }
    const b = { id: 'b', x0: 2_000, y0: 2_000, x1: 4_000, y1: 4_000 }
    const r = countUnits(input({ cores: [a, b] }))
    expect(r.plan_status).toBe('不成立')
    expect(r.confirmed_units).toBeNull()
  })

  it('区画 ID が重複する、または区画の幅・奥行きが 0 以下なら弾く', () => {
    expect(() => countUnits(input({ cells: [leftCells[0]!, leftCells[0]!] }))).toThrow()
    expect(() => countUnits(input({ cells: [{ id: 'z', x0: 1_000, y0: 1_000, x1: 1_000, y1: 2_000 }] }))).toThrow()
  })
})
