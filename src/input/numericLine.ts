// 数値入力（ハブ D-04 共通部品「数値入力」。置くかどうかは未決。仮置き）。始点・長さ（mm）・角度（度）から線を作り、描いた線として入れる。
// 角度は、0 が x の正の向き、90 が y の正の向き（反時計回り）。終点は整数 mm に四捨五入する。
import { p3Stroke } from '../plan/p3Stroke'
import { useDrawing } from '../store/drawing'
import { arcThroughPoints } from './arc'

export interface MmPoint {
  x: number
  y: number
}

/** 始点・長さ（mm）・角度（度）から終点（整数 mm）。長さが 0 以下なら RangeError。 */
export function lineEndFromLength(start: MmPoint, lengthMm: number, angleDeg: number): MmPoint {
  if (!(lengthMm > 0)) throw new RangeError(`長さは 0 より大きい: ${lengthMm}`)
  const rad = (angleDeg * Math.PI) / 180
  return {
    x: Math.round(start.x + lengthMm * Math.cos(rad)) + 0,
    y: Math.round(start.y + lengthMm * Math.sin(rad)) + 0,
  }
}

let seq = 0

/** 3 点（始点・通過点・終点）で指定した円弧を、描いた線として入れる（仮置き。点列を線分として描く） */
export function addArcStroke(a: MmPoint, b: MmPoint, c: MmPoint): void {
  const pts = arcThroughPoints(a, b, c)
  // addNumericLine と同じ向き（y は符号を反転して入れる）
  const stroke = p3Stroke({
    points: pts.map((p) => ({ px: p.x, py: -p.y })),
    viewScaleMmPerPx: 1,
    viewOriginPx: { px: 0, py: 0 },
    id: `numeric-arc-${seq++}`,
  })
  useDrawing.getState().addStroke(stroke, null)
}

/** 数値で指定した線を、描いた線として入れる（一つの線 = 一つの単位の取り消し）。スナップはしない。 */
export function addNumericLine(start: MmPoint, lengthMm: number, angleDeg: number): void {
  const end = lineEndFromLength(start, lengthMm, angleDeg)
  // 1 px = 1 mm、原点 0 で入れる。画面の y は下向きで mm の y は上向きなので、py は符号を反転して入れる（試験で確かめた）
  const stroke = p3Stroke({
    points: [
      { px: start.x, py: -start.y },
      { px: end.x, py: -end.y },
    ],
    viewScaleMmPerPx: 1,
    viewOriginPx: { px: 0, py: 0 },
    id: `numeric-${seq++}`,
  })
  useDrawing.getState().addStroke(stroke, null)
}
