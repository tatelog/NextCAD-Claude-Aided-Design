// 住戸の詳細（ハブ A-03 G76・D-04 P3「住戸の詳細」）。図面で住戸を押したときに出す中身を、区画（mm）と隣・廊下・外形・置いた什器から決める。決定論。
// 側の名前（上・下・左・右）は、平面の座標（x は右、y は下）で決める。並びは 左・上・右・下（固定）。
import type { Rect } from './candidateCells'
import { fixtureLabel, placeFixture, type Fixture } from './fixtures'

export interface UnitDetailSources {
  /** 区画の候補（mm） */
  cells: readonly Rect[]
  /** 廊下の区画（mm） */
  corridors: readonly Rect[]
  /** 建物の外形の幅（W）と奥行（D）。外周はここで決める（0 〜 W、0 〜 D） */
  outline: { W: number; D: number }
  /** 置いた什器（区画の指定が無いものは、どの住戸にも入らない） */
  fixtures: readonly Fixture[]
}

export interface UnitDetail {
  id: string
  /** 間口（x 方向の幅。mm） */
  frontageMm: number
  /** 奥行（y 方向の高さ。mm） */
  depthMm: number
  /** 専有面積（m²） */
  areaM2: number
  /** 辺で接する区画の ID（区画の並びの順） */
  neighbors: string[]
  /** 廊下と辺で接する側 */
  corridorSides: Side[]
  /** 外形の外周に接する側 */
  outerSides: Side[]
  /** 置いた什器の品目の名前 */
  fixtures: string[]
}

export type Side = '左' | '上' | '右' | '下'
const SIDE_ORDER: readonly Side[] = ['左', '上', '右', '下']

// 二つの区画が辺で接するか（角だけで接するのは入らない）
function sharesEdge(a: Rect, b: Rect): boolean {
  const overlapY = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0)
  const overlapX = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0)
  const vertical = (a.x1 === b.x0 || b.x1 === a.x0) && overlapY > 0
  const horizontal = (a.y1 === b.y0 || b.y1 === a.y0) && overlapX > 0
  return vertical || horizontal
}

// b が a の、どの側に辺で接しているか
function sidesTouching(a: Rect, b: Rect): Side[] {
  const overlapY = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0)
  const overlapX = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0)
  const out: Side[] = []
  if (b.x1 === a.x0 && overlapY > 0) out.push('左')
  if (b.y1 === a.y0 && overlapX > 0) out.push('上')
  if (b.x0 === a.x1 && overlapY > 0) out.push('右')
  if (b.y0 === a.y1 && overlapX > 0) out.push('下')
  return out
}

const inOrder = (sides: Side[]): Side[] => SIDE_ORDER.filter((s) => sides.includes(s))

/** 区画の ID の住戸の詳細。区画の一覧に無ければ null。入力は書き換えない。 */
export function unitDetailOf(id: string, src: UnitDetailSources): UnitDetail | null {
  const cell = src.cells.find((c) => c.id === id)
  if (!cell) return null
  const neighbors = src.cells.filter((c) => c.id !== id && sharesEdge(cell, c)).map((c) => c.id)
  const corridorSides = inOrder(src.corridors.flatMap((k) => sidesTouching(cell, k)))
  const outerSides: Side[] = []
  if (cell.x0 === 0) outerSides.push('左')
  if (cell.y0 === 0) outerSides.push('上')
  if (cell.x1 === src.outline.W) outerSides.push('右')
  if (cell.y1 === src.outline.D) outerSides.push('下')
  const fixtures = src.fixtures.filter((f) => f.unitId === id).map((f) => fixtureLabel(f.item))
  const frontageMm = cell.x1 - cell.x0
  const depthMm = cell.y1 - cell.y0
  return { id, frontageMm, depthMm, areaM2: (frontageMm * depthMm) / 1_000_000, neighbors, corridorSides, outerSides: inOrder(outerSides), fixtures }
}

/** 同じ間口と奥行の区画（同タイプ。G76）。自分は入らない。区画の並びの順 */
export function sameTypeUnitIds(id: string, cells: readonly Rect[]): string[] {
  const me = cells.find((c) => c.id === id)
  if (!me) return []
  const width = me.x1 - me.x0
  const depth = me.y1 - me.y0
  return cells.filter((c) => c.id !== id && c.x1 - c.x0 === width && c.y1 - c.y0 === depth).map((c) => c.id)
}

/** この住戸の什器を、同タイプの住戸に反映する。同タイプの住戸の什器は外し、この住戸の品目と同じ並びで置き直す。ほかの住戸と区画の無い什器は変えない。入力は書き換えない。 */
export function copyFixturesToSameType(id: string, cells: readonly Rect[], fixtures: readonly Fixture[]): Fixture[] {
  const targets = sameTypeUnitIds(id, cells)
  const source = fixtures.filter((f) => f.unitId === id)
  let next = fixtures.filter((f) => f.unitId === null || !targets.includes(f.unitId))
  for (const unitId of targets) {
    for (const f of source) next = placeFixture(next, f.item, unitId)
  }
  return next
}
