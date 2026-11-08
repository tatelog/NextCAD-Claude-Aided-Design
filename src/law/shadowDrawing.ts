// 日影図の作成（建築基準法 第56条の2・別表第四）。決定論。RC 造に限る（ユーザー指示 2026-11-04）。
// 冬至日の真太陽時 8:00〜16:00（10分刻み）の太陽で、測定面の高さの建物の影を作り、
// 平面の格子（既定 2 m）の点ごとに、影に入っている時間を数える。
// 規制の値（測定面・時間）は呼び出し側が渡す（shadowRuleFor）。判定は judgeShadow と同じ結果になる。
import type { Point } from '../geom/viewport'
import { shadowOf } from '../volume/shadow'
import { judgeShadow, pointInPolygon, shadowTargetsOf, sunWindow, type ShadowBuilding, type ShadowJudgment, type ShadowRule } from './shadowRegulation'

const STEP_MIN = 10
const CELL_MM = 2_000
const MARGIN_MM = 20_000

export interface ShadowDrawingInput {
  /** 構造。RC 造だけ日影図を作る */
  structure: 'RC' | 'SRC' | 'S' | 'W' | 'other'
  /** 敷地の外形（反時計回り、mm） */
  lot: Point[]
  /** 建物（切り取った階を含む）。判定（judgeShadow）と同じ入力 */
  buildings: ShadowBuilding[]
  /** 規制の値（shadowRuleFor で引く） */
  rule: ShadowRule
  lat: number
  lon: number
  /** 冬至日の日付（UTC の年月日を使う） */
  date: Date
}

export interface ShadowCell {
  /** 格子の中心（mm） */
  x: number
  y: number
  /** 影に入っている時間（時間） */
  hours: number
}

export type ShadowDrawingResult =
  | { status: 'unsupported'; reason: string }
  | { status: 'not_required'; reason: string }
  | {
      status: 'ok'
      /** 見た太陽の数（冬至日の真太陽時 8:00〜16:00、10分刻み） */
      sunSamples: number
      cellMm: number
      bounds: { minX: number; minY: number; maxX: number; maxY: number }
      /** 影に入っている時間が 0 より大きい格子点だけ（敷地の内外すべて。描く用） */
      cells: ShadowCell[]
      /** cells のうち敷地の外側（規制の測定点と同じ範囲）。要約の点数と最大はこれで数える（t38） */
      outside: ShadowCell[]
      judgment: ShadowJudgment
    }

export function shadowDrawing(input: ShadowDrawingInput): ShadowDrawingResult {
  if (input.structure !== 'RC') {
    return { status: 'unsupported', reason: '日影図は RC 造に限って作る（ほかの構造は未対応）' }
  }
  // 判定（judgeShadow）と同じ建物だけを影にする（t38）
  const applicable = shadowTargetsOf(input.buildings, input.rule)
  if (applicable.length === 0) {
    return { status: 'not_required', reason: '日影規制の対象外（規制の対象の高さ・階数に当たらない）' }
  }

  const suns = sunWindow(input.lat, input.lon, input.date)
  const zm = input.rule.measurementHeightM * 1000
  const shadowsBySun = suns.map((sun) =>
    sun.altitudeDeg <= 0
      ? []
      : applicable.map((b) => shadowOf(b.footprint, b.heightMm - zm, sun.altitudeDeg, sun.azimuthFromSouthDeg)),
  )

  const xs = input.lot.map((p) => p.x)
  const ys = input.lot.map((p) => p.y)
  const bounds = {
    minX: Math.min(...xs) - MARGIN_MM,
    minY: Math.min(...ys) - MARGIN_MM,
    maxX: Math.max(...xs) + MARGIN_MM,
    maxY: Math.max(...ys) + MARGIN_MM,
  }

  const cells: ShadowCell[] = []
  for (let x = bounds.minX + CELL_MM / 2; x < bounds.maxX; x += CELL_MM) {
    for (let y = bounds.minY + CELL_MM / 2; y < bounds.maxY; y += CELL_MM) {
      let count = 0
      for (const shadows of shadowsBySun) {
        if (shadows.some((poly) => poly.length > 0 && pointInPolygon({ x, y }, poly))) count++
      }
      if (count > 0) cells.push({ x, y, hours: (count * STEP_MIN) / 60 })
    }
  }

  const outside = cells.filter((c) => !pointInPolygon(c, input.lot))

  const judgment = judgeShadow({
    lot: input.lot,
    buildings: input.buildings,
    rule: input.rule,
    lat: input.lat,
    lon: input.lon,
    date: input.date,
  })

  return { status: 'ok', sunSamples: suns.length, cellMm: CELL_MM, bounds, cells, outside, judgment }
}

/** 判定文に添える一行（P2 の日影の欄）。点数と最大は敷地の外側の格子で数える（t38） */
export function shadowDrawingSummary(result: ShadowDrawingResult): string {
  if (result.status !== 'ok') return `日影図: ${result.reason}`
  const max = result.outside.reduce((m, c) => Math.max(m, c.hours), 0)
  return `日影図: 影が落ちる格子 ${result.outside.length} 点、最大 ${max.toFixed(1)} h（格子 ${result.cellMm / 1000} m）`
}

/** 条例の適否判定とは独立した日影時間。測定範囲は敷地外周+20m、2m格子。 */
export function shadowExposure(input: Omit<ShadowDrawingInput, 'structure' | 'rule'> & {measurementHeightM: number}): {cells: ShadowCell[]; outside: ShadowCell[]; cellMm: number} {
  if (input.lot.length < 3 || input.buildings.length === 0) return {cells:[],outside:[],cellMm:CELL_MM}
  // 8〜16時の48区間を各区間の始点で評価する。16時を追加の10分として数えない。
  const suns=sunWindow(input.lat,input.lon,input.date).slice(0,-1)
  const height=input.measurementHeightM*1000
  const shadows=suns.map(sun=>sun.altitudeDeg<=0?[]:input.buildings.filter(b=>b.heightMm>height).map(b=>shadowOf(b.footprint,b.heightMm-height,sun.altitudeDeg,sun.azimuthFromSouthDeg)))
  const xs=input.lot.map(p=>p.x), ys=input.lot.map(p=>p.y)
  const cells:ShadowCell[]=[]
  for(let x=Math.min(...xs)-MARGIN_MM+CELL_MM/2;x<Math.max(...xs)+MARGIN_MM;x+=CELL_MM) {
    for(let y=Math.min(...ys)-MARGIN_MM+CELL_MM/2;y<Math.max(...ys)+MARGIN_MM;y+=CELL_MM) {
      const count=shadows.filter(polys=>polys.some(poly=>poly.length>0&&pointInPolygon({x,y},poly))).length
      if(count) cells.push({x,y,hours:count*STEP_MIN/60})
    }
  }
  return {cells,outside:cells.filter(c=>!pointInPolygon(c,input.lot)),cellMm:CELL_MM}
}
