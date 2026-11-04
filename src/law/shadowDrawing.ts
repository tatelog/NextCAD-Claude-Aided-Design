// 日影図の作成（建築基準法 第56条の2・別表第四）。決定論。RC 造に限る（ユーザー指示 2026-11-04）。
// 冬至日の真太陽時 8:00〜16:00（10分刻み）の太陽で、測定面の高さの建物の影を作り、
// 平面の格子（既定 2 m）の点ごとに、影に入っている時間を数える。
// 規制の値（測定面・時間）は呼び出し側が渡す（shadowRuleFor）。判定は judgeShadow と同じ結果になる。
import type { Point } from '../geom/viewport'
import { shadowOf } from '../volume/shadow'
import { isShadowTarget, judgeShadow, pointInPolygon, sunWindow, type ShadowJudgment, type ShadowRule } from './shadowRegulation'

const STEP_MIN = 10
const CELL_MM = 2_000
const MARGIN_MM = 20_000

export interface ShadowDrawingInput {
  /** 構造。RC 造だけ日影図を作る */
  structure: 'RC' | 'SRC' | 'S' | 'W' | 'other'
  /** 敷地の外形（反時計回り、mm） */
  lot: Point[]
  /** 建物の底面・高さ（mm）・地階を除く階数・軒高（mm）。低層の対象の判定に使う */
  building: { footprint: Point[]; heightMm: number; storeys?: number; eaveHeightMm?: number }
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
      /** 影に入っている時間が 0 より大きい格子点だけ */
      cells: ShadowCell[]
      judgment: ShadowJudgment
    }

export function shadowDrawing(input: ShadowDrawingInput): ShadowDrawingResult {
  if (input.structure !== 'RC') {
    return { status: 'unsupported', reason: '日影図は RC 造に限って作る（ほかの構造は未対応）' }
  }
  if (!isShadowTarget(input.building, input.rule)) {
    return { status: 'not_required', reason: '日影規制の対象外（規制の対象の高さ・階数に当たらない）' }
  }

  const suns = sunWindow(input.lat, input.lon, input.date)
  const zm = input.rule.measurementHeightM * 1000
  const shadowsBySun = suns.map((sun) =>
    sun.altitudeDeg <= 0
      ? []
      : shadowOf(input.building.footprint, input.building.heightMm - zm, sun.altitudeDeg, sun.azimuthFromSouthDeg),
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
        if (shadows.length > 0 && pointInPolygon({ x, y }, shadows)) count++
      }
      if (count > 0) cells.push({ x, y, hours: (count * STEP_MIN) / 60 })
    }
  }

  const judgment = judgeShadow({
    lot: input.lot,
    buildings: [{ ...input.building }],
    rule: input.rule,
    lat: input.lat,
    lon: input.lon,
    date: input.date,
  })

  return { status: 'ok', sunSamples: suns.length, cellMm: CELL_MM, bounds, cells, judgment }
}
