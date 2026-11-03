// 住戸の部屋割り（P3 の間取り・仮置き）。区画を 2 × 2 に割り、LDK・洋室・水回りを置く。
// 3LDK の洋室 3 室は未決のため、仮置きは洋室 2 室。部屋の寸法は区画の割り方に従う（決定論）。
import type { Rect } from './candidateCells'

export type RoomKind = 'LDK' | '洋室' | '水回り'

export interface Room {
  id: string
  kind: RoomKind
  x0: number
  y0: number
  x1: number
  y1: number
}

export function splitUnitRooms(cell: { id: string; x0: number; y0: number; x1: number; y1: number }): Room[] {
  const w = cell.x1 - cell.x0
  const h = cell.y1 - cell.y0
  if (w % 2 !== 0 || h % 2 !== 0) throw new Error('区画の寸法が奇数で割れない')
  const mx = cell.x0 + w / 2
  const my = cell.y0 + h / 2
  // 左下 LDK、右下 洋室、左上 洋室、右上 水回り
  return [
    { id: `${cell.id}-LDK`, kind: 'LDK', x0: cell.x0, y0: cell.y0, x1: mx, y1: my },
    { id: `${cell.id}-W1`, kind: '洋室', x0: mx, y0: cell.y0, x1: cell.x1, y1: my },
    { id: `${cell.id}-W2`, kind: '洋室', x0: cell.x0, y0: my, x1: mx, y1: cell.y1 },
    { id: `${cell.id}-WET`, kind: '水回り', x0: mx, y0: my, x1: cell.x1, y1: cell.y1 },
  ]
}

export function roomsOfCells(cells: readonly Rect[]): Room[] {
  return cells.flatMap((c) => splitUnitRooms(c))
}
