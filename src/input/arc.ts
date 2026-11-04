// 円弧（ハブ A-03 G130。統括の依頼 2026-11-05、t70）。操作は二つ。
// (1) 中心方式（G130）: 中心 → 始点（半径と開始の向きを決める）→ 終点（終わりの角を決める）。
// (2) 二点方式（t70）: 任意の 2 点を選ぶ。二点を結ぶ弦の垂直二等分線（中心線）上に中心を置き、中心線上のずらし量で半径が決まる。
// 弧は短い方（|角| ≤ 180°）。弦誤差は 10 mm（G130）。区間数は弦誤差から決め、点列は整数 mm。両端は入力の点ちょうど。
// 自由曲線（なぞって描く線）はこの関数を使わない（G130）。

export interface ArcPoint {
  x: number
  y: number
}

/** 円弧を折れ線に直すときの最大の誤差（mm）。G130 */
export const ARC_CHORD_ERROR_MM = 10

export interface ArcResult {
  /** 点列（整数 mm）。端は入力の始点・終点ちょうど */
  points: ArcPoint[]
  /** 中心（mm。整数に丸めない） */
  center: ArcPoint
  /** 半径（mm） */
  radiusMm: number
  /** 反時計回り（y が上向きの座標で、角が正の向き） */
  ccw: boolean
}

const TWO_PI = 2 * Math.PI

function normAngle(t: number): number {
  return ((t % TWO_PI) + TWO_PI) % TWO_PI
}

/**
 * 弦誤差 toleranceMm で、角 sweepAbsRad（rad。絶対値）の円弧を折れ線にする区間数。
 * 弦の中点が円から toleranceMm だけ内側に入る角を 1 区間とする: tol = R (1 − cos(θ/2))
 */
export function arcSegmentCount(radiusMm: number, sweepAbsRad: number, toleranceMm: number = ARC_CHORD_ERROR_MM): number {
  if (!(toleranceMm > 0)) throw new RangeError('弦誤差は 0 より大きい')
  const stepRad = radiusMm > toleranceMm ? 2 * Math.acos(1 - toleranceMm / radiusMm) : Math.PI / 2
  return Math.max(1, Math.ceil(sweepAbsRad / stepRad - 1e-9))
}

// 中心・半径・開始の角・向き（符号付きの角）から、点列を作る。両端は入力の点ちょうど
function buildArc(center: ArcPoint, radiusMm: number, startAngle: number, sweep: number, first: ArcPoint, last: ArcPoint, toleranceMm: number): ArcResult {
  const n = arcSegmentCount(radiusMm, Math.abs(sweep), toleranceMm)
  const points: ArcPoint[] = []
  for (let i = 0; i <= n; i++) {
    const t = startAngle + (sweep * i) / n
    points.push({ x: Math.round(center.x + radiusMm * Math.cos(t)) + 0, y: Math.round(center.y + radiusMm * Math.sin(t)) + 0 })
  }
  points[0] = { x: Math.round(first.x) + 0, y: Math.round(first.y) + 0 }
  points[n] = { x: Math.round(last.x) + 0, y: Math.round(last.y) + 0 }
  return { points, center: { x: center.x, y: center.y }, radiusMm, ccw: sweep > 0 }
}

/**
 * 中心方式（G130）: 中心 → 始点 → 終点。半径は中心と始点で決まり、終点は入力のとおり（半径には使わない）。
 * 向きは、始点から終点へ行く短い方の弧。中心と始点が同じ、または中心と終点が同じなら RangeError。
 */
export function arcFromCenterStart(center: ArcPoint, start: ArcPoint, end: ArcPoint, toleranceMm: number = ARC_CHORD_ERROR_MM): ArcResult {
  const radiusMm = Math.hypot(start.x - center.x, start.y - center.y)
  if (!(radiusMm > 0)) throw new RangeError('中心と始点が同じで、半径が 0 の円弧はできない')
  if (!(Math.hypot(end.x - center.x, end.y - center.y) > 0)) throw new RangeError('中心と終点が同じで、円弧にならない')
  const startAngle = Math.atan2(start.y - center.y, start.x - center.x)
  const endAngle = Math.atan2(end.y - center.y, end.x - center.x)
  // 始点から終点へ行く短い方の向き（符号付き。正なら反時計回り）
  let sweep = normAngle(endAngle - startAngle)
  if (sweep > Math.PI) sweep -= TWO_PI
  return buildArc(center, radiusMm, startAngle, sweep, start, end, toleranceMm)
}

/**
 * 二点方式（t70）: 二点 p1・p2 を結ぶ弦の垂直二等分線上に中心を置く。
 * 中心は二点の中点から、弦の左の法線方向へ offsetMm だけ離れる（負なら右）。ずらし量が 0 なら半円。
 * 弧は短い方（|角| ≤ 180°）。二点が同じなら RangeError。
 */
export function arcFromTwoPoints(p1: ArcPoint, p2: ArcPoint, offsetMm: number, toleranceMm: number = ARC_CHORD_ERROR_MM): ArcResult {
  const dx = p2.x - p1.x
  const dy = p2.y - p1.y
  const chord = Math.hypot(dx, dy)
  if (!(chord > 0)) throw new RangeError('二点が同じで、弦が無い')
  // 弦の左の法線（単位ベクトル）。ずらし量が正なら中心は左側
  const nx = -dy / chord
  const ny = dx / chord
  const center = { x: (p1.x + p2.x) / 2 + offsetMm * nx, y: (p1.y + p2.y) / 2 + offsetMm * ny }
  const radiusMm = Math.hypot(p1.x - center.x, p1.y - center.y)
  const startAngle = Math.atan2(p1.y - center.y, p1.x - center.x)
  const endAngle = Math.atan2(p2.y - center.y, p2.x - center.x)
  let sweep = normAngle(endAngle - startAngle)
  if (sweep > Math.PI) sweep -= TWO_PI
  return buildArc(center, radiusMm, startAngle, sweep, p1, p2, toleranceMm)
}
