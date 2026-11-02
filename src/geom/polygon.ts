// 多角形の面積（靴ひも公式）。頂点は整数 mm、結果は mm²。
import type { Point } from './viewport'

export function polygonAreaMm2(polygon: readonly Point[]): number {
  if (polygon.length < 3) return 0
  let sum = 0
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i]!
    const b = polygon[(i + 1) % polygon.length]!
    sum += a.x * b.y - b.x * a.y
  }
  return Math.abs(sum) / 2
}
