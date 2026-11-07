// P3 平面の住戸数（D-02 C6、A-03 G17）。完全な区画だけを数え、区画 ID ごとに除外の理由を持つ。
// 区画・コア・廊下は軸に平行な矩形（mm）。外形は多角形（mm）。
// 理由の順は outside → core → no_corridor。一区画は一度だけ数える（理由は全部持つ）。
import { z } from 'zod'
import type { Point } from '../geom/viewport'

const RectSchema = z
  .object({ id: z.string().min(1), x0: z.number().finite(), y0: z.number().finite(), x1: z.number().finite(), y1: z.number().finite() })
  .refine((r) => r.x1 > r.x0 && r.y1 > r.y0, { message: '幅・奥行きは 0 より大きい' })

const UnitInputSchema = z.object({
  outline: z.array(z.object({ x: z.number(), y: z.number() })).min(3),
  corridors: z.array(RectSchema),
  cores: z.array(RectSchema),
  cells: z.array(RectSchema),
})

export type UnitInput = z.input<typeof UnitInputSchema>

export type ExclusionReason = 'outside' | 'core' | 'no_corridor'

export interface UnitResult {
  usable_count: number
  excluded: { id: string; reasons: ExclusionReason[] }[]
  plan_status: '成立' | '不成立'
  confirmed_units: number | null
}

type Rect = z.infer<typeof RectSchema>

function onSegment(p: Point, a: Point, b: Point): boolean {
  const cross = (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x)
  return cross === 0 && Math.min(a.x, b.x) <= p.x && p.x <= Math.max(a.x, b.x) && Math.min(a.y, b.y) <= p.y && p.y <= Math.max(a.y, b.y)
}

function insidePolygon(p: Point, poly: readonly Point[]): boolean {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i]!
    const b = poly[j]!
    if (onSegment(p, a, b)) return true
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside
  }
  return inside
}

// 区画が外形の中にあるか。四隅が外形の内側（辺上を含む）、かつ外形の頂点が区画の内部に入り込んでいない（外形の欠けと重ならない）。
export function cellInsideOutline(c: Rect, outline: readonly Point[]): boolean {
  const corners: Point[] = [
    { x: c.x0, y: c.y0 },
    { x: c.x1, y: c.y0 },
    { x: c.x1, y: c.y1 },
    { x: c.x0, y: c.y1 },
  ]
  if (!corners.every((p) => insidePolygon(p, outline))) return false
  return !outline.some((p) => p.x > c.x0 && p.x < c.x1 && p.y > c.y0 && p.y < c.y1)
}

function overlapsInterior(a: Rect, b: Rect): boolean {
  return Math.max(a.x0, b.x0) < Math.min(a.x1, b.x1) && Math.max(a.y0, b.y0) < Math.min(a.y1, b.y1)
}

// 区画が廊下の辺に、正の長さで接しているか。
function touchesCorridor(c: Rect, corridor: Rect): boolean {
  const yOverlap = Math.min(c.y1, corridor.y1) - Math.max(c.y0, corridor.y0) > 0
  const xOverlap = Math.min(c.x1, corridor.x1) - Math.max(c.x0, corridor.x0) > 0
  const sideBySide = (c.x1 === corridor.x0 || c.x0 === corridor.x1) && yOverlap
  const aboveBelow = (c.y1 === corridor.y0 || c.y0 === corridor.y1) && xOverlap
  return sideBySide || aboveBelow
}

export function countUnits(input: UnitInput): UnitResult {
  const v = UnitInputSchema.parse(input)
  const ids = v.cells.map((c) => c.id)
  if (new Set(ids).size !== ids.length) throw new Error('区画 ID が重複している')

  const coreOverlap = v.cores.some((a, i) => v.cores.some((b, j) => j > i && overlapsInterior(a, b)))

  const excluded: UnitResult['excluded'] = []
  let usable = 0
  for (const cell of v.cells) {
    const reasons: ExclusionReason[] = []
    if (!cellInsideOutline(cell, v.outline)) reasons.push('outside')
    if (v.cores.some((core) => overlapsInterior(cell, core))) reasons.push('core')
    if (!v.corridors.some((corr) => touchesCorridor(cell, corr))) reasons.push('no_corridor')
    if (reasons.length === 0) usable++
    else excluded.push({ id: cell.id, reasons })
  }

  const outsideAny = excluded.some((e) => e.reasons.includes('outside'))
  const plan_status = coreOverlap || outsideAny ? '不成立' : '成立'
  return {
    usable_count: usable,
    excluded,
    plan_status,
    confirmed_units: plan_status === '成立' ? usable : null,
  }
}
