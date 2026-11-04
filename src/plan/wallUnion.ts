// 壁の和の輪郭（ハブ A-03 G4・D-02 C3「2D 図形の生成規則」）。壁の四角形を重ねると、交わる所に境界が残って見える。
// ここでは、ほかの四角形と重なる辺を捨て、残りの辺を一つの輪郭につなぐ（トリミング）。決定論。
// 方法: 各四角形の辺を、ほかの辺との交点と端点で切る。切った辺の中点が、ほかの四角形の内部に入るもの、
// またはほかの四角形と向きが逆に重なるもの（壁の内側）は捨てる。同じ向きに重なるものは、番号の小さい方だけ残す。
import type { Point } from '../geom/viewport'
import { wallPolygonsJoined, type WallLine } from './wallOutline'

const EPS = 1e-6
// 点をつなぐときの丸め（mm の 1/10000）。交点の計算の誤差を同じ点として扱う
const KEY_SCALE = 1e4

interface Seg {
  a: Point
  b: Point
  owner: number
}

const cross = (p: Point, q: Point) => p.x * q.y - p.y * q.x
const sub = (p: Point, q: Point): Point => ({ x: p.x - q.x, y: p.y - q.y })

function signedArea(poly: readonly Point[]): number {
  let s = 0
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i]!
    const q = poly[(i + 1) % poly.length]!
    s += p.x * q.y - q.x * p.y
  }
  return s / 2
}

function distToSeg(p: Point, a: Point, b: Point): number {
  const r = sub(b, a)
  const len2 = r.x * r.x + r.y * r.y
  const t = len2 === 0 ? 0 : Math.min(1, Math.max(0, ((p.x - a.x) * r.x + (p.y - a.y) * r.y) / len2))
  return Math.hypot(p.x - (a.x + r.x * t), p.y - (a.y + r.y * t))
}

// 点が多角形の辺の上にあるときの、その辺
function edgeAt(p: Point, poly: readonly Point[]): { a: Point; b: Point } | null {
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]!
    const b = poly[(i + 1) % poly.length]!
    if (distToSeg(p, a, b) < EPS) return { a, b }
  }
  return null
}

// 点が多角形の内部にあるか（境界上は含めない）。レイキャスト
function insideStrictly(p: Point, poly: readonly Point[]): boolean {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i]!
    const b = poly[j]!
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside
  }
  return inside
}

// 辺 a→b の上で、点 q の位置（a が 0、b が 1）
function paramOn(q: Point, a: Point, b: Point): number {
  const r = sub(b, a)
  const t = ((q.x - a.x) * r.x + (q.y - a.y) * r.y) / (r.x * r.x + r.y * r.y)
  return Math.min(1, Math.max(0, t))
}

// 辺 s を切る位置（0 から 1 の昇順、重複なし）。両端と、ほかの辺の端点が乗る位置と、ほかの辺との交点
function cutsOf(s: Seg, others: readonly Seg[]): number[] {
  const r = sub(s.b, s.a)
  const ts = [0, 1]
  for (const o of others) {
    for (const q of [o.a, o.b]) {
      if (distToSeg(q, s.a, s.b) < EPS) ts.push(paramOn(q, s.a, s.b))
    }
    const sv = sub(o.b, o.a)
    const d = cross(r, sv)
    if (Math.abs(d) < EPS) continue
    const ca = sub(o.a, s.a)
    const t = cross(ca, sv) / d
    const u = cross(ca, r) / d
    if (t > EPS && t < 1 - EPS && u > -EPS && u < 1 + EPS) ts.push(t)
  }
  ts.sort((x, y) => x - y)
  return ts.filter((t, i) => i === 0 || t - ts[i - 1]! > 1e-9)
}

// 切った辺 p→q を残すか。中点がほかの四角形の内部なら捨てる。ほかの四角形の辺に重なるときは、
// 向きが逆なら捨てる（二枚の内側）。同じ向きなら、番号の小さい方の四角形の辺だけ残す
function keepSide(p: Point, q: Point, owner: number, polys: readonly Point[][]): boolean {
  const m = { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 }
  const dir = sub(q, p)
  for (let j = 0; j < polys.length; j++) {
    if (j === owner) continue
    const e = edgeAt(m, polys[j]!)
    if (e) {
      const d = sub(e.b, e.a)
      if (dir.x * d.x + dir.y * d.y < 0) return false
      if (j < owner) return false
      continue
    }
    if (insideStrictly(m, polys[j]!)) return false
  }
  return true
}

// 一直線上に並ぶ頂点を取り除く（輪郭の頂点を最小限にする）
function dropCollinear(ring: readonly Point[]): Point[] {
  return ring.filter((p, i) => {
    const prev = ring[(i - 1 + ring.length) % ring.length]!
    const next = ring[(i + 1) % ring.length]!
    return Math.abs(cross(sub(p, prev), sub(next, p))) > EPS
  })
}

/** 多角形の和の境界（輪郭）。外側は反時計回り、穴は時計回り。入力の順番は結果に影響しない */
export function wallUnionRings(polys: readonly Point[][]): Point[][] {
  const oriented = polys
    .filter((p) => p.length >= 3)
    .map((p) => (signedArea(p) < 0 ? [...p].reverse() : p))
    .filter((p) => Math.abs(signedArea(p)) > EPS)
  const segs: Seg[] = []
  oriented.forEach((poly, owner) => {
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i]!
      const b = poly[(i + 1) % poly.length]!
      if (Math.hypot(b.x - a.x, b.y - a.y) > EPS) segs.push({ a, b, owner })
    }
  })
  const kept: Seg[] = []
  segs.forEach((s, i) => {
    const others = segs.filter((_, j) => j !== i)
    const ts = cutsOf(s, others)
    const r = sub(s.b, s.a)
    for (let k = 0; k + 1 < ts.length; k++) {
      const p = { x: s.a.x + r.x * ts[k]!, y: s.a.y + r.y * ts[k]! }
      const q = { x: s.a.x + r.x * ts[k + 1]!, y: s.a.y + r.y * ts[k + 1]! }
      if (keepSide(p, q, s.owner, oriented)) kept.push({ a: p, b: q, owner: s.owner })
    }
  })

  const key = (p: Point) => `${Math.round(p.x * KEY_SCALE)},${Math.round(p.y * KEY_SCALE)}`
  const byStart = new Map<string, number[]>()
  kept.forEach((s, i) => {
    const k = key(s.a)
    const list = byStart.get(k)
    if (list) list.push(i)
    else byStart.set(k, [i])
  })
  const used = new Set<number>()
  const rings: Point[][] = []
  for (let i = 0; i < kept.length; i++) {
    if (used.has(i)) continue
    const ring: Point[] = []
    let cur = i
    for (;;) {
      used.add(cur)
      ring.push(kept[cur]!.a)
      const nxt = (byStart.get(key(kept[cur]!.b)) ?? []).find((j) => !used.has(j))
      if (nxt === undefined) break
      cur = nxt
    }
    const cleaned = dropCollinear(ring)
    if (cleaned.length >= 3) rings.push(cleaned)
  }
  return rings
}

/** 壁の線の輪郭（角の取り合いの延長を入れてから、和の輪郭にする）。L 字・T 字・十字・斜めの交わりも一つの輪郭 */
export function wallOutlineRings(lines: readonly WallLine[], thicknessMm: number): Point[][] {
  return wallUnionRings(wallPolygonsJoined(lines, thicknessMm))
}
