// 積算のオブジェクト表からの集計（ハブ A-03 G86、統括の決定 2026-11-04）。決定論。
// 床版（外形から出る躯体）は、オブジェクト表の 1 行（kind は other、属性 part は slab）。その行から、躯体の明細を出す。
// 単価の参照は、品目・単位・分類が一致する単価の行の id（一致しなければ null）。
import type { ObjectRow } from '../plan/objectTable'
import type { Point } from '../geom/viewport'
import { detailLinesOfStructure, type DetailLine } from './estimateDetail'
import type { RebarCondition } from './rebarCondition'
import { structureQuantities } from './structureQuantities'

/** 床版の行の属性の part */
export const SLAB_PART = 'slab'

/** 外形と階数から、床版のオブジェクト表の行を作る（kind は other、属性は JSON） */
export function slabObjectRow(footprint: readonly Point[], storeyCount: number, storeyHeight: number): ObjectRow {
  return {
    id: 'slab-volume',
    kind: 'other',
    attr: JSON.stringify({ part: SLAB_PART, footprint, storey_count: storeyCount, storey_height: storeyHeight }),
    name: '床版（外形から）',
    parent_id: null,
  }
}

interface SlabAttr {
  part: string
  footprint: Point[]
  storey_count: number
  storey_height: number
}

/** オブジェクト表から、躯体の明細を出す（床版の行だけ。ほかの行は躯体の明細を持たない） */
export function detailLinesOfObjects(rows: readonly ObjectRow[], rebar: RebarCondition): DetailLine[] {
  const lines: DetailLine[] = []
  for (const row of rows) {
    if (row.attr === null) continue
    const attr = JSON.parse(row.attr) as Partial<SlabAttr>
    if (attr.part !== SLAB_PART) continue
    const storeys = { storey_count: attr.storey_count!, storey_height: attr.storey_height! }
    const q = structureQuantities(attr.footprint!, storeys, undefined, rebar)
    lines.push(...detailLinesOfStructure(row.id, q, rebar))
  }
  return lines
}

/** 単価の行（参照の候補）。品目・単位・分類で照らす */
export interface PriceLike {
  id: string
  item: string
  unit: string
  category: string
}

/** 明細の行の単価を、品目・単位・分類が一致する単価の行から引く。一致しなければ null */
export function resolveUnitPriceRef(line: { item: string; unit: string; category: string }, prices: readonly PriceLike[]): string | null {
  const hit = prices.find((p) => p.item === line.item && p.unit === line.unit && p.category === line.category)
  return hit ? hit.id : null
}
