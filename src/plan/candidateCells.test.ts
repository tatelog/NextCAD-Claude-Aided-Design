// 仕様: P3 の住戸候補の区画（D-02 C6「等間隔の割り付け」、G17。区画の作り方は仮置き）。
// 仕様 1: 建物（幅 W、奥行 D）の中央に、奥行方向の廊下（幅 cw）を通す。
// 仕様 2: 廊下の両側に、廊下の辺へ接する住戸の区画（奥行 ud）を並べる。区画の奥行方向の割り付けは柱割りの通り（gridLines）に従う。
// 仕様 3: 区画の数 = 2 × 区間数。全区画が廊下の辺に接する（countUnits の廊下の判定を通る）。
// 仕様 4: 住戸の奥行が建物の半幅（廊下を除く）を超えるなら弾く（区画が建物の外へ出る）。
// 仕様 5: 区画 ID は重複しない。
import { describe, expect, it } from 'vitest'
import { candidateCells } from './candidateCells'
import { countUnits } from './units'

describe('candidateCells（廊下の両側の住戸候補）', () => {
  // W 20 m、D 12 m、廊下 2 m、住戸の奥行 6 m、スパン 3 m
  const input = { width_mm: 20_000, depth_mm: 12_000, corridor_mm: 2_000, unit_depth_mm: 6_000, span_mm: 3_000 }

  it('区画の数は 2 × 区間数（D ÷ スパン）になる', () => {
    expect(candidateCells(input).cells).toHaveLength(2 * 4)
  })

  it('全区画が廊下の辺に接し、住戸数の判定（countUnits）を通る', () => {
    const c = candidateCells(input)
    const r = countUnits({
      outline: [
        { x: 0, y: 0 },
        { x: 20_000, y: 0 },
        { x: 20_000, y: 12_000 },
        { x: 0, y: 12_000 },
      ],
      corridors: [c.corridor],
      cores: [],
      cells: c.cells,
    })
    expect(r.usable_count).toBe(8)
    expect(r.plan_status).toBe('成立')
  })

  it('住戸の奥行が建物の半幅を超えれば弾く', () => {
    expect(() => candidateCells({ ...input, unit_depth_mm: 9_500 })).toThrow()
  })

  it('片廊下は廊下を建物の東の縁に通し、区画は西側だけに並ぶ（数は中廊下の半分）', () => {
    const c = candidateCells({ ...input, layout: '片廊下' })
    expect(c.cells).toHaveLength(4)
    expect(c.corridor.x1).toBe(20_000)
    expect(c.cells.every((x) => x.x1 <= c.corridor.x0)).toBe(true)
    const r = countUnits({
      outline: [
        { x: 0, y: 0 },
        { x: 20_000, y: 0 },
        { x: 20_000, y: 12_000 },
        { x: 0, y: 12_000 },
      ],
      corridors: [c.corridor],
      cores: [],
      cells: c.cells,
    })
    expect(r.usable_count).toBe(4)
  })

  it('区画 ID は重複しない', () => {
    const ids = candidateCells(input).cells.map((x) => x.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
