// 円弧（ハブ D-04 曲線モード。未決の操作の仮置き: 始点・通過点・終点の 3 点で描く）。
// 3 点を通る円の中心と半径を求め、始点から通過点を経て終点へ、等間隔の点列（整数 mm）にする。
// 点列は線分の並びとして描く（円弧の正確な表現は別の作業）。
export interface ArcPoint {
  x: number
  y: number
}

/** 円弧の区間数（点は区間数 + 1）。仮置き */
export const ARC_SEGMENTS = 32

export function arcThroughPoints(a: ArcPoint, b: ArcPoint, c: ArcPoint, segments: number = ARC_SEGMENTS): ArcPoint[] {
  // 外心（3 点から等距離の点）。3 点が一直線、または重なるなら分母が 0
  const d = 2 * (a.x * (b.y - c.y) + b.x * (c.y - a.y) + c.x * (a.y - b.y))
  if (Math.abs(d) < 1e-9) throw new RangeError('3 点が一直線、または重なっていて、円弧にならない')
  const a2 = a.x * a.x + a.y * a.y
  const b2 = b.x * b.x + b.y * b.y
  const c2 = c.x * c.x + c.y * c.y
  const cx = (a2 * (b.y - c.y) + b2 * (c.y - a.y) + c2 * (a.y - b.y)) / d
  const cy = (a2 * (c.x - b.x) + b2 * (a.x - c.x) + c2 * (b.x - a.x)) / d
  const r = Math.hypot(a.x - cx, a.y - cy)

  const ta = Math.atan2(a.y - cy, a.x - cx)
  const tb = Math.atan2(b.y - cy, b.x - cx)
  const tc = Math.atan2(c.y - cy, c.x - cx)
  const norm = (t: number) => ((t % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)
  // 始点から通過点を経て終点へ行く向き（反時計回りなら正、時計回りなら負）
  const toB = norm(tb - ta)
  const toC = norm(tc - ta)
  const sweep = toB < toC ? toC : toC - 2 * Math.PI

  const out: ArcPoint[] = []
  for (let i = 0; i <= segments; i++) {
    const t = ta + (sweep * i) / segments
    out.push({ x: Math.round(cx + r * Math.cos(t)) + 0, y: Math.round(cy + r * Math.sin(t)) + 0 })
  }
  // 両端は、入力の 3 点の始点と終点ちょうど（丸めの誤差を残さない）
  out[0] = { x: a.x, y: a.y }
  out[out.length - 1] = { x: c.x, y: c.y }
  return out
}
