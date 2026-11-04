// 日影規制の判定（建築基準法 第56条の2・別表第四、D-04 P2「日影」、A-03 G54）。決定論。
// 冬至日の真太陽時 8:00〜16:00 を 10 分刻みで見て（法56条の2、t26）、敷地境界線の外側の測定点ごとに、建物の影に入っている時間を数える。
// 規制の値（測定面の高さ・距離の区分・時間）は呼び出し側が渡す（条例の値は未確認のため、ここには数値を置かない）。
// 敷地は凸の多角形（反時計回り）として扱う。影の形は shadowOf（底面と上面の影の凸包）。
import type { Point } from '../geom/viewport'
import { sunAtApparentHours } from './solarPosition'
import { outwardNormal } from './frontRoad'
import { shadowOf } from '../volume/shadow'

export interface ShadowBand {
  /** この区分の上限距離（m）。最後の区分は Infinity */
  maxDistanceM: number
  /** 規制時間（時間） */
  hours: number
}

export interface ShadowRule {
  /** 測定面の高さ（平均地盤面から、m） */
  measurementHeightM: number
  /** この高さ未満の建物は対象外（mm） */
  minHeightMm: number
  /** 距離の区分（小さい順） */
  bands: ShadowBand[]
  /** 対象の高さの測り方。低層は軒高（別表第四 一項・四項イ）、それ以外は高さ（既定） */
  minHeightBasis?: 'height' | 'eave'
  /** 地階を除く階数がこれ以上なら対象（低層のみ。3 階以上） */
  minStoreys?: number
}

export interface ShadowBuilding {
  footprint: Point[]
  heightMm: number
  /** 地階を除く階数（低層の対象の判定に使う） */
  storeys?: number
  /** 軒の高さ（mm）。低層の対象の判定に使う。無ければ高さで代用する */
  eaveHeightMm?: number
}

/** 日影規制の対象か（別表第四）。低層は軒高 7m 超か 3 階以上、それ以外は高さ 10m 超（K07 で「超える」に揃えた） */
export function isShadowTarget(b: { heightMm: number; storeys?: number; eaveHeightMm?: number }, rule: ShadowRule): boolean {
  const measured = rule.minHeightBasis === 'eave' ? (b.eaveHeightMm ?? b.heightMm) : b.heightMm
  if (measured > rule.minHeightMm) return true
  return rule.minStoreys !== undefined && (b.storeys ?? 0) >= rule.minStoreys
}

export interface ShadowJudgment {
  result: '適合' | '不適合'
  /** 規制時間との差が最も大きい測定点（不適合のとき）。適合なら null */
  worst: { distanceM: number; hours: number; limit: number } | null
  /** 全測定点のうち、影に入っている時間が最も長い値（時間） */
  maxHours: number
}

const STEP_MIN = 10
const WINDOW_MIN = 8 * 60 // 8:00（日本時間）からの分
const WINDOW_END_MIN = 16 * 60
const EDGE_STEP_MM = 2_000
const DISTANCES_M = Array.from({ length: 20 }, (_, i) => i + 1)

export function pointInPolygon(p: Point, poly: readonly Point[]): boolean {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i]!
    const b = poly[j]!
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside
  }
  return inside
}

// 冬至日（日本時間の日付）の 8:00〜16:00 の太陽の位置
// 冬至日の真太陽時 8:00〜16:00 の太陽の位置（法56条の2、一次資料 E-47、t26）。
// 真太陽時の窓は経度に依らない（呼び出し側の互換のため _lon を受ける）。
export function sunWindow(lat: number, _lon: number, date: Date): { altitudeDeg: number; azimuthFromSouthDeg: number }[] {
  const out: { altitudeDeg: number; azimuthFromSouthDeg: number }[] = []
  // 8:00〜16:00 の 8 時間を 10 分刻みで 48 点（16:00 の点は窓の外。含めると 8 時間 10 分になる）
  for (let m = 0; m < WINDOW_END_MIN - WINDOW_MIN; m += STEP_MIN) {
    out.push(sunAtApparentHours({ lat, date, apparentHours: (WINDOW_MIN + m) / 60 }))
  }
  return out
}

// 敷地境界線の外側の測定点（辺を一定間隔で、外側へ各距離）
function measurementPoints(lot: readonly Point[]): { p: Point; distanceM: number }[] {
  const pts: { p: Point; distanceM: number }[] = []
  for (let i = 0; i < lot.length; i++) {
    const a = lot[i]!
    const b = lot[(i + 1) % lot.length]!
    const len = Math.hypot(b.x - a.x, b.y - a.y)
    const n = outwardNormal(lot, i)
    for (let s = 0; s <= len; s += EDGE_STEP_MM) {
      const f = len === 0 ? 0 : s / len
      const base = { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f }
      for (const d of DISTANCES_M) {
        pts.push({ p: { x: base.x + n.x * d * 1000, y: base.y + n.y * d * 1000 }, distanceM: d })
      }
    }
  }
  return pts
}

function limitFor(rule: ShadowRule, distanceM: number): number {
  const band = rule.bands.find((b) => distanceM <= b.maxDistanceM) ?? rule.bands[rule.bands.length - 1]!
  return band.hours
}

export function judgeShadow(input: {
  lot: readonly Point[]
  buildings: readonly ShadowBuilding[]
  rule: ShadowRule
  lat: number
  lon: number
  /** 冬至日の日付（UTC の年月日を使う） */
  date: Date
}): ShadowJudgment {
  const zm = input.rule.measurementHeightM * 1000
  // 別表第四は「超える」建築物が対象（10 m ちょうどは対象外。cfedb4f で解決）
  const applicable = input.buildings.filter((b) => isShadowTarget(b, input.rule) && b.heightMm > zm)
  if (applicable.length === 0) return { result: '適合', worst: null, maxHours: 0 }

  const suns = sunWindow(input.lat, input.lon, input.date)
  // 太陽ごとの影（測定面の高さでの影）
  const shadowsBySun = suns.map((sun) =>
    sun.altitudeDeg <= 0
      ? []
      : applicable.map((b) => shadowOf(b.footprint, b.heightMm - zm, sun.altitudeDeg, sun.azimuthFromSouthDeg)),
  )

  let worst: ShadowJudgment['worst'] = null
  let maxHours = 0
  for (const { p, distanceM } of measurementPoints(input.lot)) {
    let count = 0
    for (const shadows of shadowsBySun) {
      if (shadows.some((poly) => poly.length > 0 && pointInPolygon(p, poly))) count++
    }
    const hours = (count * STEP_MIN) / 60
    if (hours > maxHours) maxHours = hours
    const limit = limitFor(input.rule, distanceM)
    const excess = hours - limit
    if (excess > 0 && (worst === null || excess > worst.hours - worst.limit)) {
      worst = { distanceM, hours: Math.round(hours * 10) / 10, limit }
    }
  }
  const rounded = Math.round(maxHours * 10) / 10
  return worst === null ? { result: '適合', worst: null, maxHours: rounded } : { result: '不適合', worst, maxHours: rounded }
}
