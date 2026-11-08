// 冬至の日射と、地面に落ちる影（統括の指示 2026-11-06。5b）。時刻（HH:MM・日本時間）→ 太陽の位置 → 階ごとの影。決定論。
// 日付は冬至（2026-12-22）。場所は確定した敷地の中心（呼び出し側が渡す）。
import type { Point } from '../geom/viewport'
import { solarPosition } from '../law/solarPosition'
import { shadowOf } from './shadow'

export interface Sun {
  altitudeDeg: number
  /** 南を 0°、西回り（shadow.ts と同じ） */
  azimuthFromSouthDeg: number
}

/** 冬至の、時刻（HH:MM・日本時間）の太陽の位置。形が違えば null */
export function winterSunAt(hhmm: string, site: { lat: number; lon: number }, date = '2026-12-22'): Sun | null {
  if (!/^\d{2}:\d{2}$/.test(hhmm)) return null
  return solarPosition({ lat: site.lat, lon: site.lon, date: new Date(`${date}T${hhmm}:00+09:00`) })
}

/** 太陽の位置から、階ごとの影（平面の多角形）。太陽が地平線の上のときだけ。階が無ければ null */
export function sunShadowsOf(floors: readonly { footprint: readonly Point[]; heightMm: number }[], sun: Sun | null): Point[][] | null {
  return sun && sun.altitudeDeg > 0 && floors.length > 0
    ? floors.map((b) => shadowOf(b.footprint, b.heightMm, sun.altitudeDeg, sun.azimuthFromSouthDeg))
    : null
}
