// P3 の描く画面の軌跡（画面の px）を、線（段 F9）にする（統括の依頼 2026-11-05。キャンバスの外へ出たドラッグの線が消えるのを防ぐ）。決定論。
// 軌跡を mm に直して、既存の端点に吸着させる前の線を作る（吸着は店舗の addStroke が行う）。
import type { Stroke } from '../model/schema'
import { p3Stroke } from '../plan/p3Stroke'
import { P3_MM_PER_PX, P3_VIEWPORT } from './p3CanvasGeometry'

const OX = P3_VIEWPORT.originPx.x
const OY = P3_VIEWPORT.originPx.y

/** 軌跡を線にする。2 点未満は線にならない（null）。直線・曲線の別は penMode で持つ */
export function p3StrokeOfTrail(trail: readonly { x: number; y: number }[] | null, penMode: Stroke['pen_mode'], id: string): Stroke | null {
  if (!trail || trail.length < 2) return null
  // 画面の px → mm（整数）→ px に戻す。P3Canvas の従来の変換と同じ式
  const points = trail.map((p) => {
    const mx = Math.round((p.x - OX) * P3_MM_PER_PX)
    const my = Math.round((OY - p.y) * P3_MM_PER_PX)
    return { px: mx / P3_MM_PER_PX + OX, py: OY - my / P3_MM_PER_PX }
  })
  return { ...p3Stroke({ points, viewScaleMmPerPx: P3_MM_PER_PX, viewOriginPx: { px: OX, py: OY }, id }), pen_mode: penMode }
}
