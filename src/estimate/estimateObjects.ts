// 積算のオブジェクト表からの集計（ハブ A-03 G86、統括の決定 2026-11-04）。決定論。
// 床版の数量は、オブジェクト表の kind が slab の行から出す（ハブ A-03 G92）。ほかの躯体・外装・内装・外構・サッシの数量は、kind が other の行（属性 part で部分を決める）から出す。その明細が P4 の正本。
// 単価の参照は、品目・単位・分類が一致する単価の行の id（一致しなければ null）。
import type { ObjectRow } from '../plan/objectTable'
import type { Point } from '../geom/viewport'
import type { Room } from '../plan/rooms'
import type { Rect } from '../plan/candidateCells'
import { detailLinesOfStructure, sourceOf, type DetailLine } from './estimateDetail'
import type { RebarCondition } from './rebarCondition'
import { structureQuantities } from './structureQuantities'
import { buildingExteriorQuantities, type Quantity } from './quantities'
import { siteWorksQuantity } from './siteWorks'
import { roomFinishTotals } from './roomQuantities'
import { planExteriorQuantities, railingQuantity, type PlanExteriorInput } from './planExterior'
import { sashQuantity, type SashSegment } from './sashQuantity'

/** 行の属性の part（部分）。躯体・外装・外構・内装・サッシ */
export const PART = {
  exterior: 'exterior',
  site: 'site',
  interior: 'interior',
  planExterior: 'plan_exterior',
  sash: 'sash',
} as const

/** 行の属性（JSON）。part で部分を決め、ほかは部分ごとの入力 */
interface Attr {
  part: string
  [key: string]: any
}

function partRow(id: string, part: string, data: Record<string, unknown>, name: string): ObjectRow {
  return { id, kind: 'other', attr: JSON.stringify({ part, ...data }), name, parent_id: null }
}

/** 外形と階数から、床版（躯体）の行。kind は slab（G92） */
export function slabObjectRow(footprint: readonly Point[], storeyCount: number, storeyHeight: number, floorAreasMm2?: readonly number[]): ObjectRow {
  // 切り取った階の面積（floor_areas_mm2）があれば、床版はその和（統括の依頼 2026-11-06。依頼 5a）
  return {
    id: 'slab-volume',
    kind: 'slab',
    attr: JSON.stringify({ footprint, storey_count: storeyCount, storey_height: storeyHeight, floor_areas_mm2: floorAreasMm2 }),
    name: '床版（外形から）',
    parent_id: null,
  }
}

/** 外形と階数から、外壁と屋根（外装）の行 */
/** 外形と階数から、外壁と屋根（外装）の行。屋根の面積（1 階の切り取り後の面積）があれば、屋根はその面積（依頼 A） */
export function exteriorRow(footprint: readonly Point[], storeyCount: number, storeyHeight: number, roofAreaMm2?: number): ObjectRow {
  return partRow('exterior-volume', PART.exterior, { footprint, storey_count: storeyCount, storey_height: storeyHeight, roof_area_mm2: roofAreaMm2 }, '外壁と屋根（外形から）')
}

/** 外形と敷地（mm²）から、外構の行 */
export function siteRow(footprint: readonly Point[], parcelMm2: number): ObjectRow {
  return partRow('site-volume', PART.site, { footprint, parcel_mm2: parcelMm2 }, '外構（敷地の残り）')
}

/** 部屋と内装の条件から、内装の行（床・天井・壁クロス） */
export function interiorRow(rooms: readonly Room[], opts: { storeyCount: number; ceilingHeightMm: number }): ObjectRow {
  return partRow('interior-plan', PART.interior, { rooms, storey_count: opts.storeyCount, ceiling_height_mm: opts.ceilingHeightMm }, '内装（部屋）')
}

/** 基準階の廊下・コア・区画・外形から、バルコニー・共用廊下・手すり（外装）の行 */
export function planExteriorRow(input: PlanExteriorInput): ObjectRow {
  return partRow('plan-exterior', PART.planExterior, { ...input }, 'バルコニー・共用廊下（基準階）')
}

/** 描いた開口の線分と、その種類から、サッシ（外装）の行 */
export function sashRow(segments: readonly SashSegment[], kinds: Record<string, string | null>): ObjectRow {
  return partRow('sash-drawn', PART.sash, { segments, kinds }, 'サッシ（開口）')
}

const BASIS = {
  exterior: '外形から（仮置き）',
  site: '敷地の残り（仮置き）',
  interior: '部屋の面積から（床・天井・壁は仮置き）',
  planExterior: '基準階の区画・廊下から（仮置き）',
  sash: '描いた開口の長さ（仮置き）',
}

function lineOf(objectId: string, q: Quantity, basis: string): DetailLine {
  return {
    lineId: `${objectId}/${q.item}`,
    objectId,
    category: q.category,
    item: q.item,
    quantity: q.quantity,
    unit: q.unit,
    unitPriceRef: null,
    provisional: q.provisional,
    basis,
    source: sourceOf(q.item, q.provisional),
  }
}

/** 行の属性を、部分の JSON として読む。属性が無い・JSON でない・part が無い行は null（住戸や壁など） */
function partOf(row: ObjectRow): Attr | null {
  if (row.attr === null) return null
  try {
    const a = JSON.parse(row.attr) as Attr
    return typeof a.part === 'string' ? a : null
  } catch {
    return null
  }
}

/** オブジェクト表の行から、明細を出す。行の part で数量の出し方を決める（床版は鉄筋の条件を使う） */
export function detailLinesOfObjects(rows: readonly ObjectRow[], rebar: RebarCondition): DetailLine[] {
  const lines: DetailLine[] = []
  for (const row of rows) {
    if (row.kind === 'slab' && row.attr !== null) {
      const s = JSON.parse(row.attr) as { footprint: readonly Point[]; storey_count: number; storey_height: number; floor_areas_mm2?: number[] }
      const q = structureQuantities(s.footprint, { storey_count: s.storey_count, storey_height: s.storey_height }, undefined, rebar, s.floor_areas_mm2)
      lines.push(...detailLinesOfStructure(row.id, q, rebar))
      continue
    }
    const a = partOf(row)
    if (a === null) continue
    switch (a.part) {
      case PART.exterior: {
        const q = buildingExteriorQuantities(a.footprint, { storey_count: a.storey_count, storey_height: a.storey_height }, a.roof_area_mm2)
        lines.push(lineOf(row.id, q.exterior_wall, BASIS.exterior), lineOf(row.id, q.roof, BASIS.exterior))
        break
      }
      case PART.site:
        lines.push(lineOf(row.id, siteWorksQuantity(a.parcel_mm2, a.footprint), BASIS.site))
        break
      case PART.interior: {
        const t = roomFinishTotals(a.rooms, { storeyCount: a.storey_count, ceilingHeightMm: a.ceiling_height_mm })
        lines.push(lineOf(row.id, t.floor, BASIS.interior), lineOf(row.id, t.ceiling, BASIS.interior), lineOf(row.id, t.wall_cloth, BASIS.interior))
        break
      }
      case PART.planExterior: {
        const input: PlanExteriorInput = { corridor: a.corridor, cores: a.cores, cells: a.cells, outline: a.outline, storeyCount: a.storeyCount }
        const ext = planExteriorQuantities(input)
        const rail = railingQuantity({ cells: input.cells as readonly Rect[], outline: input.outline, storeyCount: input.storeyCount })
        lines.push(lineOf(row.id, ext.balcony, BASIS.planExterior), lineOf(row.id, ext.corridor, BASIS.planExterior), lineOf(row.id, rail, BASIS.planExterior))
        break
      }
      case PART.sash: {
        const kinds = a.kinds as Record<string, string | null>
        lines.push(lineOf(row.id, sashQuantity(a.segments, (id) => kinds[id] ?? null), BASIS.sash))
        break
      }
      default:
        break
    }
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
