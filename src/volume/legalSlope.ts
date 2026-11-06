// 法定の斜線を敷地の辺に当てて、切り取りの境界を作る（建築基準法 第56条・別表第三。規則は src/law/slopeRules.ts）。
// 道路: 前面道路の反対側の境界線（辺の外側へ道路幅員だけ離れた線）から、距離 D（別表）の範囲だけ制限する。
// 隣地: 前面道路以外の辺ごとに、その辺の内側へ制限する。北側: 真北側の辺（真北ベクトルが与えられたとき）に、低層・中高層の規則を当てる。
// 判定不能の規則は境界を作らず、pending に名前を積む（推測で埋めない）。
import type { Point } from '../geom/viewport'
import { outwardNormal } from '../law/frontRoad'
import { adjacentSlopeRule, northSlopeRule, roadSlopeRule, type Zone } from '../law/slopeRules'
import type { SlopeBoundary } from './slope'

export interface LegalSlopeInput {
  /** 反時計回りの敷地（mm） */
  footprint: readonly Point[]
  /** 前面道路に接する辺の番号（辺 i は頂点 i から i+1） */
  roadEdgeIndex: number
  /** 前面道路の幅員（mm）。採用幅員を渡す（測った値を自動で採らない。G16） */
  roadWidthMm: number
  zone: Zone
  farPercent: number
  /** 真北の単位ベクトル（北向き）。与えなければ北側斜線は作らない */
  trueNorth?: { x: number; y: number }
}

export interface LegalSlopeResult {
  boundaries: SlopeBoundary[]
  /** 判定不能の規則の名前（その辺は切らない） */
  pending: string[]
}

/** 北側斜線の規則は当たるのに、真北が分からないときの未判定の文言（統括の指示 2026-11-06。5c） */
export const NORTH_NEEDS_TRUE_NORTH = '北側斜線は真北が分からないので未判定'

export function legalBoundaries(input: LegalSlopeInput): LegalSlopeResult {
  const poly = input.footprint
  const n = poly.length
  const boundaries: SlopeBoundary[] = []
  const pending: string[] = []

  // 道路
  const road = roadSlopeRule({ zone: input.zone, farPercent: input.farPercent })
  const nOut = outwardNormal(poly, input.roadEdgeIndex)
  if (road.status === '適用') {
    const a = poly[input.roadEdgeIndex]!
    boundaries.push({
      point: { x: a.x + nOut.x * input.roadWidthMm, y: a.y + nOut.y * input.roadWidthMm },
      inward: { x: -nOut.x, y: -nOut.y },
      coefficient: road.coefficient,
      riseMm: 0,
      kind: 'road',
      maxDistanceMm: road.distanceMm,
    })
  } else {
    pending.push('道路斜線（用途地域の指定なし）')
  }

  // 隣地（前面道路以外の辺）
  const adjacent = adjacentSlopeRule({ zone: input.zone })
  for (let i = 0; i < n; i++) {
    if (i === input.roadEdgeIndex) continue
    if (adjacent.status === '判定不能') {
      pending.push(`隣地斜線（辺 ${i}、用途地域の指定なし）`)
      continue
    }
    if (adjacent.status === '対象外') continue
    const a = poly[i]!
    const out = outwardNormal(poly, i)
    boundaries.push({
      point: { x: a.x, y: a.y },
      inward: { x: -out.x, y: -out.y },
      kind: 'adjacent',
      coefficient: adjacent.coefficient,
      riseMm: adjacent.riseMm,
    })
  }

  // 北側（真北の向きが分かるときだけ作る。分からないのに規則が当たるなら未判定に積む。統括の指示 2026-11-06。5c）
  const north = northSlopeRule({ zone: input.zone })
  if (input.trueNorth) {
    if (north.status === '適用') {
      const N = input.trueNorth
      let best = poly[0]!
      for (const p of poly) if (p.x * N.x + p.y * N.y > best.x * N.x + best.y * N.y) best = p
      boundaries.push({
        point: { x: best.x, y: best.y },
        inward: { x: -N.x, y: -N.y },
        kind: 'north',
        coefficient: north.coefficient,
        riseMm: north.riseMm,
      })
    }
  } else if (north.status === '適用') {
    pending.push(NORTH_NEEDS_TRUE_NORTH)
  }

  return { boundaries, pending }
}
