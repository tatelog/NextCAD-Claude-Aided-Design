// 単純多角形の三角形分割（耳切り法）。押し出しの底面・天面に使う（D-02 C5）。
// 頂点は整数 mm。出力の三角形は反時計回り。
import type { Point } from './viewport'

export type Triangle = [Point, Point, Point]

function cross(o: Point, a: Point, b: Point): number {
  return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x)
}

function insideOrOn(p: Point, a: Point, b: Point, c: Point): boolean {
  return cross(a, b, p) >= 0 && cross(b, c, p) >= 0 && cross(c, a, p) >= 0
}

export function triangulatePolygon(polygon: readonly Point[]): Triangle[] {
  if (polygon.length < 3) throw new Error('triangulatePolygon: 頂点は 3 つ以上必要')

  const pts = [...polygon]
  let twiceArea = 0
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i]!
    const b = pts[(i + 1) % pts.length]!
    twiceArea += a.x * b.y - b.x * a.y
  }
  if (twiceArea < 0) pts.reverse()

  const idx = pts.map((_, i) => i)
  const tris: Triangle[] = []
  while (idx.length > 3) {
    let clipped = false
    for (let k = 0; k < idx.length; k++) {
      const ia = idx[(k - 1 + idx.length) % idx.length]!
      const ib = idx[k]!
      const ic = idx[(k + 1) % idx.length]!
      const a = pts[ia]!
      const b = pts[ib]!
      const c = pts[ic]!
      const turn = cross(a, b, c)
      if (turn === 0) {
        // 一直線上の余分な頂点は面積を変えないので取り除く
        idx.splice(k, 1)
        clipped = true
        break
      }
      if (turn < 0) continue
      const blocked = idx.some((j) => j !== ia && j !== ib && j !== ic && insideOrOn(pts[j]!, a, b, c))
      if (blocked) continue
      tris.push([a, b, c])
      idx.splice(k, 1)
      clipped = true
      break
    }
    if (!clipped) throw new Error('triangulatePolygon: 単純多角形ではない')
  }
  tris.push([pts[idx[0]!]!, pts[idx[1]!]!, pts[idx[2]!]!])
  return tris
}
