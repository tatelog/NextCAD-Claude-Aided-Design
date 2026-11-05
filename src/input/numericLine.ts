// 数値入力（ハブ D-04 共通部品「数値入力」。置くかどうかは未決。仮置き）。始点・長さ（mm）・角度（度）から線を作り、描いた線として入れる。
// 角度は、0 が x の正の向き、90 が y の正の向き（反時計回り）。終点は整数 mm に四捨五入する。
import { p3Stroke } from '../plan/p3Stroke'
import { useDrawing } from '../store/drawing'
import { arcFromCenterStart, arcFromTwoPoints, type ArcResult } from './arc'

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

/**
 * 円弧の結果を、描いた線として入れる。点列は弦の誤差 10 mm の細かい点列。曲線モード（pen_mode: curve）で入れ、
 * 直線の整形（RDP・軸への吸着）を通さない。中心と向きは線に残す（G5）。addNumericLine と同じく y は符号を反転して入れる
 */
export function addArcResultStroke(arc: ArcResult): void {
  const stroke = p3Stroke({
    points: arc.points.map((p) => ({ px: p.x, py: -p.y })),
    viewScaleMmPerPx: 1,
    viewOriginPx: { px: 0, py: 0 },
    id: `numeric-arc-${seq++}`,
  })
  useDrawing.getState().addStroke({ ...stroke, pen_mode: 'curve', arc: { center: { x: arc.center.x, y: arc.center.y }, ccw: arc.ccw } }, null)
}

/** 中心・始点・終点で指定した円弧を、描いた線として入れる（G130。中心と R の起点を先に置く） */
export function addArcCenterStroke(center: MmPoint, start: MmPoint, end: MmPoint): void {
  addArcResultStroke(arcFromCenterStart(center, start, end))
}

/** 任意の二点と、中心線（二点の垂直二等分線）上のずらし量で指定した円弧を、描いた線として入れる（t70） */
export function addArcTwoPointStroke(p1: MmPoint, p2: MmPoint, offsetMm: number): void {
  addArcResultStroke(arcFromTwoPoints(p1, p2, offsetMm))
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
