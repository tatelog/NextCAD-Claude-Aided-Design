// 開発用の seed（?seed=square）の外形（統括の依頼 2026-11-06）。外形はダミーの筆界（DUMMY_PARCEL）と同じ範囲に置く。
// 画面の px → mm は strokePointToMm（mm の y = −(py − originPy) × scale）。その逆で、mm の四隅を px にする。
import type { Stroke } from '../model/schema'
import { DUMMY_PARCEL } from '../plan/dummyParcel'
import { p3Stroke } from '../plan/p3Stroke'

const VIEW_SCALE_MM_PER_PX = 10
const VIEW_ORIGIN_PX = { px: 0, py: 0 }

/** 開発用の外形の線（4 本、閉じている）。mm → px は strokePointToMm の逆（py = originPy − y ÷ scale） */
export function devSeedSquareStrokes(): Stroke[] {
  const corners = DUMMY_PARCEL.map((p) => ({
    px: p.x / VIEW_SCALE_MM_PER_PX + VIEW_ORIGIN_PX.px,
    py: VIEW_ORIGIN_PX.py - p.y / VIEW_SCALE_MM_PER_PX,
  }))
  return corners.map((a, i) =>
    p3Stroke({
      points: [a, corners[(i + 1) % corners.length]!],
      viewScaleMmPerPx: VIEW_SCALE_MM_PER_PX,
      viewOriginPx: VIEW_ORIGIN_PX,
      id: `seed-${i}`,
    }),
  )
}
