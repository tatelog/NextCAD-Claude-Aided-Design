// P4 の数量の拾い方（D-02 C8、A-03 G62・G63）。内装は室の内法、外装は外周・屋根。単位は m²。
// 開口の控除は未決（D-02 C8）のため、控除していない数量には provisional（未確定の印）を立てる。
import { z } from 'zod'
import { polygonAreaMm2 } from '../geom/polygon'
import type { Point } from '../geom/viewport'
import { extrudeVolume } from '../volume/extrude'
import type { Category } from './estimate'

export interface Quantity {
  item: string
  category: Category
  quantity: number
  unit: 'm2'
  provisional: boolean
}

const M2 = 1_000_000

function perimeterMm(poly: readonly Point[]): number {
  let sum = 0
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]!
    const b = poly[(i + 1) % poly.length]!
    sum += Math.hypot(b.x - a.x, b.y - a.y)
  }
  return sum
}

// 室: 床・天井は内法面積、壁のクロスは外周 × 天井高。
export function roomFinishQuantities(room: readonly Point[], ceilingHeightMm: number) {
  const h = z.number().int().positive().parse(ceilingHeightMm)
  const area = polygonAreaMm2(room) / M2
  const wallArea = (perimeterMm(room) * h) / M2
  const q = (item: string, quantity: number): Quantity => ({ item, category: '内装', quantity, unit: 'm2', provisional: false })
  return {
    floor: q('床', area),
    ceiling: q('天井', area),
    wall_cloth: q('壁クロス', wallArea),
  }
}

// 建物: 外壁は外周 × 階高 × 階数（開口は未控除）、屋根は建築面積。
export function buildingExteriorQuantities(footprint: readonly Point[], storeys: { storey_count: number; storey_height: number }) {
  const v = extrudeVolume({ footprint: footprint.map((p) => ({ x: p.x, y: p.y })), ...storeys })
  const wallM2 = (perimeterMm(v.footprint) * v.storey_height * v.storey_count) / M2
  return {
    exterior_wall: { item: '外壁仕上げ', category: '外装' as const, quantity: wallM2, unit: 'm2' as const, provisional: true },
    roof: { item: '屋根防水', category: '外装' as const, quantity: polygonAreaMm2(v.footprint) / M2, unit: 'm2' as const, provisional: false },
  }
}
