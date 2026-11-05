// 仕様（統括の依頼 2026-11-05「P2 の 3D が段状に切った形を出す」。D-04 P2「返ってくるもの: 段状に切った後のボリューム」）:
// 仕様 1（積み上げ）: 階ごとの床の形を、その階の天端の高さまで積む。下の階は z = 0 から、上の階は下の階の天端から。
// 仕様 2（段状）: 上の階の床が下の階より小さければ、上の階の立体は下の階の立体の中に収まる（x・y の範囲）。
// 仕様 3（空）: 階が無ければ三角形は無い。
import { describe, expect, it } from 'vitest'
import { stackedMesh } from './mesh'
import type { Point } from '../geom/viewport'

const H = 3000
const rect = (w: number, d: number): Point[] => [
  { x: 0, y: 0 },
  { x: w, y: 0 },
  { x: w, y: d },
  { x: 0, y: d },
]

describe('段状に切った階の立体（仕様 1〜3）', () => {
  const lower = { footprint: rect(10_000, 20_000), heightMm: H }
  const upper = { footprint: rect(8_000, 16_000), heightMm: 2 * H }

  it('仕様 1: 階ごとに天端まで積む（高さは 0・階の天端・上の天端だけ）', () => {
    const m = stackedMesh([lower, upper], H)
    const zs = new Set(m.triangles.flat().map((v) => v.z))
    expect(zs).toEqual(new Set([0, H, 2 * H]))
    expect(m.total_height).toBe(2 * H)
  })

  it('仕様 2: 上の階は下の階の中に収まる（上の天端の x・y の範囲が小さい）', () => {
    const m = stackedMesh([lower, upper], H)
    const top = m.triangles.flat().filter((v) => v.z === 2 * H)
    expect(Math.max(...top.map((v) => v.x))).toBe(8_000)
    expect(Math.max(...top.map((v) => v.y))).toBe(16_000)
  })

  it('仕様 3: 階が無ければ三角形は無い', () => {
    expect(stackedMesh([], H).triangles).toHaveLength(0)
  })
})
