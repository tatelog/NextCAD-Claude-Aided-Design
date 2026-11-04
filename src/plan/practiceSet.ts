// 間取りごとの正解の線（ハブ A-03 G11「練習セットの作り方」の試作）。部屋どうしが辺で接する所（部屋の境目）を、一本ずつの線にまとめる。決定論。
// 試作であり、練習セットの作り方（代表が描く／SVG から抜く／両方）は未決。ここでは間取りの割り方から、正解だけを取り出す。
import type { Rect } from './candidateCells'
import { splitUnitRooms, type RoomPattern } from './rooms'

export interface PracticeLine {
  a: { x: number; y: number }
  b: { x: number; y: number }
  /** 正解の種類。境目はすべて壁 */
  kind: 'wall'
}

interface Seg {
  /** 'v' は縦（x が一定）、'h' は横（y が一定） */
  dir: 'v' | 'h'
  line: number
  from: number
  to: number
}

// 同じ直線上で重なる、または接する区間を一つにまとめる
function mergeSegs(segs: Seg[]): Seg[] {
  const sorted = [...segs].sort((p, q) => (p.dir === q.dir ? p.line - q.line : p.dir < q.dir ? -1 : 1) || p.from - q.from)
  const out: Seg[] = []
  for (const s of sorted) {
    const last = out[out.length - 1]
    if (last && last.dir === s.dir && last.line === s.line && s.from <= last.to) {
      last.to = Math.max(last.to, s.to)
    } else {
      out.push({ ...s })
    }
  }
  return out
}

/** 区画の間取りの、部屋どうしの境目の線（正解）。外周は含まない */
export function practiceLinesOf(cell: Rect, pattern: RoomPattern): PracticeLine[] {
  const rooms = splitUnitRooms(cell, pattern)
  const segs: Seg[] = []
  for (let i = 0; i < rooms.length; i++) {
    for (let j = i + 1; j < rooms.length; j++) {
      const r = rooms[i]!
      const s = rooms[j]!
      // 縦の境目（x で接する）
      if (r.x1 === s.x0 || s.x1 === r.x0) {
        const from = Math.max(r.y0, s.y0)
        const to = Math.min(r.y1, s.y1)
        if (to > from) segs.push({ dir: 'v', line: r.x1 === s.x0 ? r.x1 : s.x1, from, to })
      }
      // 横の境目（y で接する）
      if (r.y1 === s.y0 || s.y1 === r.y0) {
        const from = Math.max(r.x0, s.x0)
        const to = Math.min(r.x1, s.x1)
        if (to > from) segs.push({ dir: 'h', line: r.y1 === s.y0 ? r.y1 : s.y1, from, to })
      }
    }
  }
  return mergeSegs(segs).map((s) =>
    s.dir === 'v'
      ? { a: { x: s.line, y: s.from }, b: { x: s.line, y: s.to }, kind: 'wall' as const }
      : { a: { x: s.from, y: s.line }, b: { x: s.to, y: s.line }, kind: 'wall' as const },
  )
}
