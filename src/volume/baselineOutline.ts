// 外形の基準線（ハブ A-03 G59・G4、統括の依頼 t52）。描いた外形は外壁の中心線。基準線は、内側（中心線から壁厚の半分だけ内へ）と、中心線からの量（外へ正・内へ負）で動かせる。決定論。
import type { Point } from '../geom/viewport'
import { roundFootprintMm } from './rotation'

/** 壁厚の仮置き（mm）。P3 と P5 の既定と同じ 200 */
export const DEFAULT_WALL_THICKNESS_MM = 200

export type BaselineSide = '中心線' | '内側'

export interface BaselineOptions {
  side: BaselineSide
  /** 中心線からの量（mm）。外へ正、内へ負 */
  offsetMm: number
  wallThicknessMm: number
}

export type BaselineResult = { ok: true; footprint: Point[] } | { ok: false; reason: string }

/** 中心線からの量（外へ正）。内側は壁厚の半分だけ内へ、ずらしの量を足す */
export function baselineDistanceOf(o: BaselineOptions): number {
  return (o.side === '内側' ? -o.wallThicknessMm / 2 : 0) + o.offsetMm
}

/** 基準線の言い方（画面の用語。ハブ A-03 G59）: 見出し「外形（基準線: …）」の中身。既定は「外壁の中心線」 */
export function baselineLabelOf(o: BaselineOptions): string {
  const base = o.side === '内側' ? '内側の面' : '外壁の中心線'
  if (o.offsetMm === 0) return base
  return `${base}から${o.offsetMm > 0 ? '外へ' : '内へ'} ${Math.abs(o.offsetMm)} mm`
}

/** 符号つきの面積（反時計回りが正） */
function signedArea(p: readonly Point[]): number {
  let a = 0
  for (let i = 0; i < p.length; i++) {
    const q = p[(i + 1) % p.length]!
    a += p[i]!.x * q.y - q.x * p[i]!.y
  }
  return a / 2
}

/** 各辺を d（外へ正）だけ平行に移し、隣り合う辺の交点を新しい頂点にする。頂点の順は入力のまま */
function offsetPolygon(p: readonly Point[], d: number): Point[] {
  const n = p.length
  const sign = signedArea(p) > 0 ? 1 : -1
  // 辺の外向きの法線（反時計回りは右側、時計回りは左側）
  const normals = p.map((a, i) => {
    const b = p[(i + 1) % n]!
    const dx = b.x - a.x
    const dy = b.y - a.y
    const len = Math.hypot(dx, dy)
    return { x: (sign * dy) / len, y: (-sign * dx) / len }
  })
  return p.map((v, i) => {
    const prev = p[(i - 1 + n) % n]!
    const next = p[(i + 1) % n]!
    const n1 = normals[(i - 1 + n) % n]!
    const n2 = normals[i]!
    const u1 = { x: v.x - prev.x, y: v.y - prev.y }
    const u2 = { x: next.x - v.x, y: next.y - v.y }
    const cross = u1.x * u2.y - u1.y * u2.x
    // 一直線の角は、辺の法線の方向へそのまま移す
    if (Math.abs(cross) < 1e-9) return { x: v.x + n2.x * d, y: v.y + n2.y * d }
    const q1 = { x: prev.x + n1.x * d, y: prev.y + n1.y * d }
    const q2 = { x: v.x + n2.x * d, y: v.y + n2.y * d }
    const t = ((q2.x - q1.x) * u2.y - (q2.y - q1.y) * u2.x) / cross
    return { x: q1.x + t * u1.x, y: q1.y + t * u1.y }
  })
}

/** 描いた外形（中心線）から、基準線の外形を作る。中心線で量が 0 なら、外形はそのまま。内へずらして外形が消えるときは理由を返す */
export function baselineOutline(center: readonly Point[], o: BaselineOptions): BaselineResult {
  const d = baselineDistanceOf(o)
  if (d === 0) return { ok: true, footprint: [...center] }
  const raw = offsetPolygon(center, d)
  // 辺が裏返っていないこと（どの辺も、元の向きと同じ向きに残る）。消えるほど内へずらすと、辺が反対向きになる
  const n = center.length
  const kept = raw.every((c, i) => {
    const a = center[i]!
    const b = center[(i + 1) % n]!
    const e = raw[(i + 1) % n]!
    return Number.isFinite(c.x) && Number.isFinite(c.y) && (b.x - a.x) * (e.x - c.x) + (b.y - a.y) * (e.y - c.y) > 0
  })
  if (!kept) return { ok: false, reason: '基準線の位置で外形が消える（内へずらしすぎ）' }
  return { ok: true, footprint: roundFootprintMm(raw) }
}
