// 住戸タイプ別の内装（ハブ A-03 G61）。部屋を、中心が入る区画（住戸）に属させ、住戸タイプごとに「1 戸あたり × 戸数」で出す。決定論。
import type { Room } from '../plan/rooms'
import { roomFinishTotals } from './roomQuantities'

export interface UnitRect {
  id: string
  x0: number
  y0: number
  x1: number
  y1: number
}

export interface UnitRef {
  id: string
  type: string
}

/** 部屋を、中心が入る区画（住戸）ごとに分ける。どの区画にも入らない部屋は含めない */
export function roomsByUnit(rooms: readonly Room[], cells: readonly UnitRect[]): Map<string, Room[]> {
  const out = new Map<string, Room[]>()
  for (const r of rooms) {
    const cx = (r.x0 + r.x1) / 2
    const cy = (r.y0 + r.y1) / 2
    const cell = cells.find((c) => cx >= c.x0 && cx <= c.x1 && cy >= c.y0 && cy <= c.y1)
    if (!cell) continue
    out.set(cell.id, [...(out.get(cell.id) ?? []), r])
  }
  return out
}

export interface TypeRow {
  type: string
  count: number
  perUnit: { floorM2: number; ceilingM2: number; wallClothM2: number }
  total: { floorM2: number; ceilingM2: number; wallClothM2: number }
}

/** 住戸タイプごとの行。1 戸あたりは、その住戸の部屋の内装（階数分）。合計は 1 戸あたり × 戸数 */
export function breakdownByUnitType(
  units: readonly UnitRef[],
  roomsOfUnit: ReadonlyMap<string, readonly Room[]>,
  opts: { storeyCount: number; ceilingHeightMm: number },
): TypeRow[] {
  const types = [...new Set(units.map((u) => u.type))]
  return types.map((type) => {
    const ofType = units.filter((u) => u.type === type)
    // 1 戸あたりは、このタイプの最初の住戸の内装（同じタイプの住戸は同じ部屋の形と仮定する）
    const first = ofType[0]!
    const t = roomFinishTotals([...(roomsOfUnit.get(first.id) ?? [])], opts)
    const perUnit = { floorM2: t.floor.quantity, ceilingM2: t.ceiling.quantity, wallClothM2: t.wall_cloth.quantity }
    const n = ofType.length
    return {
      type,
      count: n,
      perUnit,
      total: { floorM2: perUnit.floorM2 * n, ceilingM2: perUnit.ceilingM2 * n, wallClothM2: perUnit.wallClothM2 * n },
    }
  })
}
