// 線を選ぶ操作の判定（代表の決定 G159）。チャットのモードのとき、P2・P3 の線をタップで選ぶ。決定論。
// タップは、動かさずに離した操作。当たり判定は、線を折れ線にして、タップの位置までの距離で見る（曲線・円弧も同じ）。
import type { Segment } from '../model/schema'
import { polylineOfSegment } from './arcSegment'

/** 選んだ線の色（選んでいない線は元の色） */
export const SELECTED_COLOR = '#e0662b'

/** チャットのタップで線を選ぶ許容（画面の px）。見えている線から指で少し外れても選べるように 12 px（統括の依頼 2026-11-06。1）。動いたかの判定（6 px）とは別 */
export const CHAT_PICK_PX = 12

/** 選んだ線の色を決める */
export function strokeColorOf(base: string, selected: boolean): string {
  return selected ? SELECTED_COLOR : base
}

/** 動いた距離が閾値を超えたか（超えなければ、タップ） */
export function isTapMove(dx: number, dy: number, thresholdPx: number): boolean {
  return Math.hypot(dx, dy) > thresholdPx
}

function distanceToSegment(p: { x: number; y: number }, a: { x: number; y: number }, b: { x: number; y: number }): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len2 = dx * dx + dy * dy
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2))
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy))
}

/** タップの位置（mm）に最も近い線の id。閾値（mm）の外なら null */
export function segmentPickAt(segments: readonly Segment[], pointMm: { x: number; y: number }, toleranceMm: number): string | null {
  let best: { id: string; d: number } | null = null
  for (const s of segments) {
    const pts = polylineOfSegment(s)
    for (let i = 0; i < pts.length - 1; i++) {
      const d = distanceToSegment(pointMm, pts[i]!, pts[i + 1]!)
      if (d <= toleranceMm && (best === null || d < best.d)) best = { id: s.id, d }
    }
  }
  return best?.id ?? null
}
