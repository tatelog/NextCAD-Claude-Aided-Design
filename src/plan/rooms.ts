// 住戸の部屋割り（P3 の間取り・仮置き）。区画を間取りパターンで割り、LDK・洋室・水回りを置く。
// 個室は洋室扱い（G137）。田の字・縦長は 2LDK（洋室 2 室）、3LDK は三室（洋室 3 室）。和室は作らず、洋室として設計する。寸法は区画の割り方に従う（決定論）。
import type { Rect } from './candidateCells'

export type RoomKind = 'LDK' | '洋室' | '水回り'
/** 間取りパターン: 田の字（2×2）・縦長（奥行きに 4 室）・角（角住戸の 3 室）・単独（LDK と水回りの 2 室） */
/** 部屋割り。三室・四室は仮置き（統括の確認待ち） */
export type RoomPattern = '田の字' | '縦長' | '角' | '単独' | '三室' | '四室'

export interface Room {
  id: string
  kind: RoomKind
  x0: number
  y0: number
  x1: number
  y1: number
}

type Cell = { id: string; x0: number; y0: number; x1: number; y1: number }

function room(cell: Cell, suffix: string, kind: RoomKind, x0: number, y0: number, x1: number, y1: number): Room {
  return { id: `${cell.id}-${suffix}`, kind, x0, y0, x1, y1 }
}

export function splitUnitRooms(cell: Cell, pattern: RoomPattern = '田の字'): Room[] {
  const w = cell.x1 - cell.x0
  const h = cell.y1 - cell.y0
  const mx = cell.x0 + w / 2
  const my = cell.y0 + h / 2
  switch (pattern) {
    case '田の字': {
      if (w % 2 !== 0 || h % 2 !== 0) throw new Error('区画の寸法が奇数で割れない')
      // 左下 LDK、右下 洋室、左上 洋室、右上 水回り
      return [
        room(cell, 'LDK', 'LDK', cell.x0, cell.y0, mx, my),
        room(cell, 'W1', '洋室', mx, cell.y0, cell.x1, my),
        room(cell, 'W2', '洋室', cell.x0, my, mx, cell.y1),
        room(cell, 'WET', '水回り', mx, my, cell.x1, cell.y1),
      ]
    }
    case '縦長': {
      if (h % 4 !== 0) throw new Error('縦長は奥行きを 4 等分できない')
      const q = h / 4
      // 奥行き方向に、LDK・洋室・洋室・水回り
      return [
        room(cell, 'LDK', 'LDK', cell.x0, cell.y0, cell.x1, cell.y0 + q),
        room(cell, 'W1', '洋室', cell.x0, cell.y0 + q, cell.x1, cell.y0 + 2 * q),
        room(cell, 'W2', '洋室', cell.x0, cell.y0 + 2 * q, cell.x1, cell.y0 + 3 * q),
        room(cell, 'WET', '水回り', cell.x0, cell.y0 + 3 * q, cell.x1, cell.y1),
      ]
    }
    case '角': {
      if (w % 2 !== 0 || h % 2 !== 0) throw new Error('区画の寸法が奇数で割れない')
      // 角住戸: 右側の大きな LDK、左上の洋室、左下の水回り
      return [
        room(cell, 'LDK', 'LDK', mx, cell.y0, cell.x1, cell.y1),
        room(cell, 'W1', '洋室', cell.x0, my, mx, cell.y1),
        room(cell, 'WET', '水回り', cell.x0, cell.y0, mx, my),
      ]
    }
    case '単独': {
      if (h % 3 !== 0) throw new Error('単独は奥行きを 3 等分できない')
      const q = h / 3
      // 上 2/3 の LDK、下 1/3 の水回り
      return [
        room(cell, 'LDK', 'LDK', cell.x0, cell.y0 + q, cell.x1, cell.y1),
        room(cell, 'WET', '水回り', cell.x0, cell.y0, cell.x1, cell.y0 + q),
      ]
    }
    case '三室': {
      // 仮置き（統括の確認待ち）: 左半分に LDK（上 2/3）と水回り（下 1/3）、右半分に洋室 3 つを縦に並べる
      if (w % 2 !== 0 || h % 3 !== 0) throw new Error('三室は幅を 2 等分、奥行きを 3 等分できない')
      const q = h / 3
      return [
        room(cell, 'LDK', 'LDK', cell.x0, cell.y0 + q, mx, cell.y1),
        room(cell, 'WET', '水回り', cell.x0, cell.y0, mx, cell.y0 + q),
        room(cell, 'W1', '洋室', mx, cell.y0, cell.x1, cell.y0 + q),
        room(cell, 'W2', '洋室', mx, cell.y0 + q, cell.x1, cell.y0 + 2 * q),
        room(cell, 'W3', '洋室', mx, cell.y0 + 2 * q, cell.x1, cell.y1),
      ]
    }
    case '四室': {
      // 仮置き（統括の確認待ち）: 左半分に LDK（上半分）と水回り（下半分）、右半分に洋室 4 つを縦に並べる
      if (w % 2 !== 0 || h % 4 !== 0) throw new Error('四室は幅を 2 等分、奥行きを 4 等分できない')
      const q = h / 4
      return [
        room(cell, 'LDK', 'LDK', cell.x0, cell.y0 + 2 * q, mx, cell.y1),
        room(cell, 'WET', '水回り', cell.x0, cell.y0, mx, cell.y0 + 2 * q),
        room(cell, 'W1', '洋室', mx, cell.y0, cell.x1, cell.y0 + q),
        room(cell, 'W2', '洋室', mx, cell.y0 + q, cell.x1, cell.y0 + 2 * q),
        room(cell, 'W3', '洋室', mx, cell.y0 + 2 * q, cell.x1, cell.y0 + 3 * q),
        room(cell, 'W4', '洋室', mx, cell.y0 + 3 * q, cell.x1, cell.y1),
      ]
    }
  }
}

export function roomsOfCells(cells: readonly Rect[], pattern: RoomPattern = '田の字'): Room[] {
  return cells.flatMap((c) => splitUnitRooms(c, pattern))
}
