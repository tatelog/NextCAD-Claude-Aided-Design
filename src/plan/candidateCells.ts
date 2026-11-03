// P3 の住戸候補の区画（D-02 C6、A-03 G17）。区画の作り方は仮置き。
// 建物（幅 W、奥行 D）の中央に奥行方向の廊下を通し、その両側に区画を並べる。区画の奥行方向の割り付けは柱割り（gridLines）に従う。
import { z } from 'zod'
import { gridLines } from './grid'

const positive = z.number().int().positive()

export interface CandidateInput {
  width_mm: number
  depth_mm: number
  corridor_mm: number
  unit_depth_mm: number
  span_mm: number
}

export interface Rect {
  id: string
  x0: number
  y0: number
  x1: number
  y1: number
}

export function candidateCells(input: CandidateInput): { corridor: Rect; cells: Rect[] } {
  const W = positive.parse(input.width_mm)
  const D = positive.parse(input.depth_mm)
  const cw = positive.parse(input.corridor_mm)
  const ud = positive.parse(input.unit_depth_mm)
  const s = positive.parse(input.span_mm)
  if (cw >= W) throw new Error('廊下が建物の幅より広い')
  if ((W - cw) % 2 !== 0) throw new Error('建物の幅と廊下の幅の差は偶数にする（中央に通すため）')
  const half = (W - cw) / 2
  if (ud > half) throw new Error('住戸の奥行が建物の半幅を超える')

  const corridor: Rect = { id: 'corridor', x0: half, y0: 0, x1: half + cw, y1: D }
  const lines = gridLines(D, s)
  const cells: Rect[] = []
  for (let k = 0; k < lines.length - 1; k++) {
    const y0 = lines[k]!
    const y1 = lines[k + 1]!
    cells.push({ id: `L${k}`, x0: half - ud, y0, x1: half, y1 })
    cells.push({ id: `R${k}`, x0: half + cw, y0, x1: half + cw + ud, y1 })
  }
  return { corridor, cells }
}
