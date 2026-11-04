// P3 の住戸候補の区画（D-02 C6、A-03 G17）。区画の作り方は仮置き。
// 中廊下・階段室型: 建物（幅 W、奥行 D）の中央に奥行方向の廊下（階段室）を通し、その両側に区画を並べる。
// 片廊下: 廊下を東の縁に通し、区画は西側だけ。
// ツインコリドー（統括の決定 G106、2026-11-05）: 中廊下の変形。廊下の帯は 3 倍（廊下 : 吹き抜け : 廊下 = 1 : 1 : 1）で、中央の 1 本分は天井のない吹き抜け。両側の 2 本が廊下で、住戸は帯の両側に並ぶ。
// 区画の奥行方向の割り付けは柱割り（gridLines）に従う。
import { z } from 'zod'
import { gridLines } from './grid'

const positive = z.number().int().positive()

export type CorridorLayout = '中廊下' | '片廊下' | '階段室' | 'ツイン'

export interface CandidateInput {
  width_mm: number
  depth_mm: number
  corridor_mm: number
  unit_depth_mm: number
  span_mm: number
  /** 廊下タイプ（既定は中廊下） */
  layout?: CorridorLayout
}

export interface Rect {
  id: string
  x0: number
  y0: number
  x1: number
  y1: number
}

export interface CandidateCells {
  /** 主の廊下（1 本目。階段とコアはここに置く） */
  corridor: Rect
  /** すべての廊下（ツインは 2 本） */
  corridors: Rect[]
  cells: Rect[]
  /** 吹き抜け（ツインの中央。天井のない空間。区画でも廊下でもない）。ほかの廊下タイプは無し */
  voids: Rect[]
}

export function candidateCells(input: CandidateInput): CandidateCells {
  const W = positive.parse(input.width_mm)
  const D = positive.parse(input.depth_mm)
  const cw = positive.parse(input.corridor_mm)
  const ud = positive.parse(input.unit_depth_mm)
  const s = positive.parse(input.span_mm)
  if (cw >= W) throw new Error('廊下が建物の幅より広い')
  const lines = gridLines(D, s)

  if (input.layout === 'ツイン') {
    // 中廊下の変形（G106）: 帯の幅 = 3 cw。左の廊下・吹き抜け・右の廊下が cw ずつ。住戸は帯の両側に 1 スパン 2 戸
    if (W !== 2 * ud + 3 * cw) throw new Error('ツインは建物の幅 = 住戸の奥行 × 2 + 廊下幅 × 3')
    const west: Rect = { id: 'corridor', x0: ud, y0: 0, x1: ud + cw, y1: D }
    const east: Rect = { id: 'corridor-east', x0: ud + 2 * cw, y0: 0, x1: ud + 3 * cw, y1: D }
    const atrium: Rect = { id: 'atrium', x0: ud + cw, y0: 0, x1: ud + 2 * cw, y1: D }
    const cells: Rect[] = []
    for (let k = 0; k < lines.length - 1; k++) {
      const y0 = lines[k]!
      const y1 = lines[k + 1]!
      cells.push({ id: `L${k}`, x0: 0, y0, x1: ud, y1 })
      cells.push({ id: `R${k}`, x0: ud + 3 * cw, y0, x1: W, y1 })
    }
    return { corridor: west, corridors: [west, east], cells, voids: [atrium] }
  }

  if (input.layout === '片廊下') {
    // 廊下を東の縁に通し、区画は西側だけ（廊下の辺に接する）
    if (ud > W - cw) throw new Error('住戸の奥行が建物の幅（廊下を除く）を超える')
    const corridor: Rect = { id: 'corridor', x0: W - cw, y0: 0, x1: W, y1: D }
    const cells: Rect[] = []
    for (let k = 0; k < lines.length - 1; k++) {
      cells.push({ id: `L${k}`, x0: W - cw - ud, y0: lines[k]!, x1: W - cw, y1: lines[k + 1]! })
    }
    return { corridor, corridors: [corridor], cells, voids: [] }
  }

  if ((W - cw) % 2 !== 0) throw new Error('建物の幅と廊下の幅の差は偶数にする（中央に通すため）')
  const half = (W - cw) / 2
  if (ud > half) throw new Error('住戸の奥行が建物の半幅を超える')

  // 中廊下・階段室型: 中央の通路（階段室型は階段室）の両側に住戸
  const id = input.layout === '階段室' ? 'hall' : 'corridor'
  const corridor: Rect = { id, x0: half, y0: 0, x1: half + cw, y1: D }
  const cells: Rect[] = []
  for (let k = 0; k < lines.length - 1; k++) {
    const y0 = lines[k]!
    const y1 = lines[k + 1]!
    cells.push({ id: `L${k}`, x0: half - ud, y0, x1: half, y1 })
    cells.push({ id: `R${k}`, x0: half + cw, y0, x1: half + cw + ud, y1 })
  }
  return { corridor, corridors: [corridor], cells, voids: [] }
}
