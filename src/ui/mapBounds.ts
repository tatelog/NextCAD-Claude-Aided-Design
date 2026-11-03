// 全体図（右下の縮図、モックの「全体図」）の範囲。描く物を囲む四角を求める。
export interface Bounds {
  x0: number
  y0: number
  x1: number
  y1: number
}

export function boundsOf(polygons: readonly (readonly { x: number; y: number }[])[]): Bounds | null {
  const pts = polygons.flat()
  if (pts.length === 0) return null
  const xs = pts.map((p) => p.x)
  const ys = pts.map((p) => p.y)
  const x0 = Math.min(...xs)
  const y0 = Math.min(...ys)
  // 一点だけでも幅と高さを持たせる（0 で割らないため）
  return { x0, y0, x1: Math.max(Math.max(...xs), x0 + 1), y1: Math.max(Math.max(...ys), y0 + 1) }
}
