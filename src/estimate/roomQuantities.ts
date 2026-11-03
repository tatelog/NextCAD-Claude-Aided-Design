// 部屋の内装の数量（P4）。部屋（P3 の仮置きの間取り）の合計から、階数分の床・天井・壁クロスを出す。
// 壁クロスは部屋どうしの壁を二重に数える近似のため、未確定の印を付ける。m² の単位。
import type { Room } from '../plan/rooms'
import { roomFinishQuantities } from './quantities'

export function roomFinishTotals(rooms: readonly Room[], opts: { storeyCount: number; ceilingHeightMm: number }) {
  const floor = { item: '床', category: '内装' as const, quantity: 0, unit: 'm2' as const, provisional: true }
  const ceiling = { item: '天井', category: '内装' as const, quantity: 0, unit: 'm2' as const, provisional: true }
  const wall = { item: '壁クロス', category: '内装' as const, quantity: 0, unit: 'm2' as const, provisional: true }
  for (const r of rooms) {
    const q = roomFinishQuantities(
      [
        { x: r.x0, y: r.y0 },
        { x: r.x1, y: r.y0 },
        { x: r.x1, y: r.y1 },
        { x: r.x0, y: r.y1 },
      ],
      opts.ceilingHeightMm,
    )
    floor.quantity += q.floor.quantity * opts.storeyCount
    ceiling.quantity += q.ceiling.quantity * opts.storeyCount
    wall.quantity += q.wall_cloth.quantity * opts.storeyCount
  }
  return { floor, ceiling, wall_cloth: wall }
}
