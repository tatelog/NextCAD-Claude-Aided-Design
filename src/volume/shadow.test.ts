// 仕様: 日影の形（D-04 P2「地面に日影の影」、A-03 G54）。太陽の高さと方位から、建物の影（地面に落ちる形）を作る。
// 仕様 1: 高さ z の点は、太陽の反対側へ z × cot(高さ) だけずれた地面に落ちる。方位は南を 0°・西回り。
// 仕様 2: 南の太陽（方位 0°）の影は北へ伸びる。
// 仕様 3: 建物の影は、建物の底面と、上面の影をつないだ外形（凸包）。
// 注: 影の形だけ。日影規制（時間・測定面の高さ）の判定は、条例の値の確認の後。
import { describe, expect, it } from 'vitest'
import { shadowOf, polygonArea } from './shadow'

const square = [
  { x: 0, y: 0 },
  { x: 10_000, y: 0 },
  { x: 10_000, y: 10_000 },
  { x: 0, y: 10_000 },
]

describe('shadowOf（建物の影）', () => {
  it('南の太陽（方位 0°）・高さ 45° の影は、高さ 10 m の建物で北へ 10 m 伸びる', () => {
    const s = shadowOf(square, 10_000, 45, 0)
    // 底面（10 m 四方）と、北へ 10 m ずれた上面の影をつないだ形: 10 m × 20 m
    expect(polygonArea(s)).toBeCloseTo(200_000_000, -5)
  })

  it('西の太陽（方位 90°）は影が東へ伸びる（東側の x が大きくなる）', () => {
    const s = shadowOf(square, 10_000, 45, 90)
    const maxX = Math.max(...s.map((p) => p.x))
    expect(maxX).toBeGreaterThan(10_000 + 9_000)
  })

  it('高さ 0 の建物は影が底面と同じ', () => {
    const s = shadowOf(square, 0, 45, 0)
    expect(polygonArea(s)).toBeCloseTo(100_000_000, -5)
  })
})
