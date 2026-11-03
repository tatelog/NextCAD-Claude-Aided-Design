// 3D のつまみ（ハブ A-03 G71 の回転、G65 の高さ。D-04 P2）の仕様テスト。仕様だけから書く。
//
// 回転のつまみ（G71。代表の決定: ボリューム（建物）を回転する機能を付ける。回すと建物の回転角が変わる）。
// 画面側の案（D-04）: 3D の外形の角に回転のつまみを置く。刻み（自由・15°・90°）は右パネル。カメラの回転とは別。
// 今回の仮置き（これを 1 項目ずつテストにしている。つまみの置き方・カメラを止める配線は DOM が要るので試験しない）:
//  1. 回す量は、つまんだ時点の（重心 → つまんだ点）の向きから、今の（重心 → 指の位置）の向きまでの差。
//     反時計回りが正（mm の +y が画面の上。rotateOutline と同じ向き）
//  2. 回す量は右パネルの刻み（自由・15°・90°）で丸める。自由は丸めない
//  3. 動かしている間は、回した外形を表示だけで見せる。離したときに rotateOutline が確定する外形と同じ形（整数 mm）
//  4. 指の位置は、3D の視線と地面（高さ 0）の交点。平面の (x, y) mm は three の (x, 高さ, z) m に対応する（z が y。Volume3D と同じ）
import { describe, expect, it } from 'vitest'
import { findClosedOutline } from '../canvas/closure'
import { rotateOutline } from '../canvas/outlineEdit'
import type { Node, Segment } from '../model/schema'
import { knobAngleDeg, knobRotationDeg, rayHitPlaneMm, rotatedFootprint, scenePosition } from './knobs3d'
import { outlineCentroid } from './rotation'

type Pt = { x: number; y: number }

// 重心 pivot から角度 deg（°。反時計回り、+x が 0°）の向きに距離 r の点
const polar = (pivot: Pt, deg: number, r: number): Pt => ({
  x: pivot.x + r * Math.cos((deg * Math.PI) / 180),
  y: pivot.y + r * Math.sin((deg * Math.PI) / 180),
})

const ORIGIN: Pt = { x: 0, y: 0 }

describe('回転のつまみ: 重心 → つまんだ点 から 重心 → 指の位置 への向きの差（°）', () => {
  it('重心の右にある点から、上にある点まで回すと +90°（反時計回り）', () => {
    expect(knobAngleDeg(ORIGIN, { x: 1000, y: 0 }, { x: 0, y: 1000 })).toBeCloseTo(90, 9)
  })

  it('逆向き（上にある点から右にある点）は -90°（時計回り）', () => {
    expect(knobAngleDeg(ORIGIN, { x: 0, y: 1000 }, { x: 1000, y: 0 })).toBeCloseTo(-90, 9)
  })

  it('右から右上へは +45°', () => {
    expect(knobAngleDeg(ORIGIN, { x: 1000, y: 0 }, { x: 1000, y: 1000 })).toBeCloseTo(45, 9)
  })

  it('同じ向きなら 0°（重心からの距離が違っても）', () => {
    expect(knobAngleDeg(ORIGIN, { x: 1000, y: 0 }, { x: 3000, y: 0 })).toBe(0)
  })

  it('向きだけで決まる（重心からの距離によらない）', () => {
    expect(knobAngleDeg(ORIGIN, { x: 2000, y: 0 }, { x: 0, y: 500 })).toBeCloseTo(90, 9)
  })

  it('重心は原点でなくてよい（重心 (5000, 3000) の右から上へは +90°）', () => {
    expect(knobAngleDeg({ x: 5000, y: 3000 }, { x: 6000, y: 3000 }, { x: 5000, y: 4000 })).toBeCloseTo(90, 9)
  })

  it('180° を越える差は短いほうへ折り返す（170° の向きから -170° の向きへは +20°、逆は -20°）', () => {
    expect(knobAngleDeg(ORIGIN, polar(ORIGIN, 170, 1000), polar(ORIGIN, -170, 1000))).toBeCloseTo(20, 9)
    expect(knobAngleDeg(ORIGIN, polar(ORIGIN, -170, 1000), polar(ORIGIN, 170, 1000))).toBeCloseTo(-20, 9)
  })

  it('真後ろ（反対向き）は +180°（折り返しの境目。仮置き）', () => {
    expect(knobAngleDeg(ORIGIN, { x: 1000, y: 0 }, { x: -1000, y: 0 })).toBe(180)
    expect(knobAngleDeg(ORIGIN, { x: 0, y: 1000 }, { x: 0, y: -1000 })).toBe(180)
  })

  it('向きが決まらないとき（つまんだ点か指の位置が重心と同じ）は 0°', () => {
    expect(knobAngleDeg(ORIGIN, ORIGIN, { x: 0, y: 1000 })).toBe(0)
    expect(knobAngleDeg(ORIGIN, { x: 1000, y: 0 }, ORIGIN)).toBe(0)
  })

  it('数でない入力（NaN）は 0°', () => {
    expect(knobAngleDeg(ORIGIN, { x: 1000, y: 0 }, { x: Number.NaN, y: 1000 })).toBe(0)
  })
})

describe('回転のつまみ: 右パネルの刻み（自由・15°・90°）で丸める', () => {
  // 重心の右の点から 17° の向きの点へ
  const grab: Pt = { x: 1000, y: 0 }
  const at17 = polar(ORIGIN, 17, 1000)

  it('自由のときは 17° のまま', () => {
    expect(knobRotationDeg(ORIGIN, grab, at17, 'free')).toBeCloseTo(17, 9)
  })

  it('15° の刻みでは 17° は 15° に丸まる', () => {
    expect(knobRotationDeg(ORIGIN, grab, at17, 15)).toBe(15)
  })

  it('90° の刻みでは 17° は 0° に丸まる', () => {
    expect(knobRotationDeg(ORIGIN, grab, at17, 90)).toBe(0)
  })

  it('0° は、どの刻みでも 0°（-0 にならない）', () => {
    const same: Pt = { x: 2500, y: 0 }
    expect(knobRotationDeg(ORIGIN, grab, same, 'free')).toBe(0)
    expect(knobRotationDeg(ORIGIN, grab, same, 15)).toBe(0)
    expect(knobRotationDeg(ORIGIN, grab, same, 90)).toBe(0)
    // 少し時計回りに動かした（-3°）だけでも、90° の刻みでは 0°（-0 でなく 0）
    expect(knobRotationDeg(ORIGIN, grab, polar(ORIGIN, -3, 1000), 90)).toBe(0)
  })

  it('負の角度（時計回り）も最寄りの刻みへ（-17° は 15° 刻みで -15°、-50° は 90° 刻みで -90°）', () => {
    expect(knobRotationDeg(ORIGIN, grab, polar(ORIGIN, -17, 1000), 'free')).toBeCloseTo(-17, 9)
    expect(knobRotationDeg(ORIGIN, grab, polar(ORIGIN, -17, 1000), 15)).toBe(-15)
    expect(knobRotationDeg(ORIGIN, grab, polar(ORIGIN, -50, 1000), 90)).toBe(-90)
  })

  it('90° の刻みでは 100° は 90°、140° は 180° に丸まる', () => {
    expect(knobRotationDeg(ORIGIN, grab, polar(ORIGIN, 100, 1000), 90)).toBe(90)
    expect(knobRotationDeg(ORIGIN, grab, polar(ORIGIN, 140, 1000), 90)).toBe(180)
  })
})

// rotateOutline に渡す entries（端点 n0, n1, ... を順に結んで閉じた外形）
const node = (id: string, x: number, y: number): Node => ({ id, x, y })
const seg = (id: string, a: Node, b: Node): Segment => ({
  id,
  x1: a.x,
  y1: a.y,
  x2: b.x,
  y2: b.y,
  start_node_id: a.id,
  end_node_id: b.id,
  snap: 'none',
  stage: 'F4',
  revision: 1,
  curve: 'line',
})
const loopEntries = (pts: Pt[]): { nodes: Node[]; segments: Segment[] }[] => {
  const nodes = pts.map((p, i) => node(`n${i}`, p.x, p.y))
  const segments = nodes.map((n, i) => seg(`s${i}`, n, nodes[(i + 1) % nodes.length]!))
  return [{ nodes, segments }]
}
const SQUARE: Pt[] = [
  { x: 0, y: 0 },
  { x: 4000, y: 0 },
  { x: 4000, y: 4000 },
  { x: 0, y: 4000 },
]
const nodeOf = (es: { nodes: Node[] }[], id: string): Pt => {
  const n = es.flatMap((e) => e.nodes).find((x) => x.id === id)!
  return { x: n.x, y: n.y }
}
const byXY = (a: Pt, b: Pt): number => a.x - b.x || a.y - b.y

describe('回転のつまみ: 回す量の符号が rotateOutline（反時計回りが正）と合う', () => {
  // 4000 mm 角。頂点 0（n0）は (0, 0)、重心は (2000, 2000)
  const pivot = outlineCentroid(SQUARE)!

  it('重心 (2000, 2000) のまわりで、頂点 0 (0, 0) をつまんで指を (4000, 0) の向きへ動かすと +90°。回した頂点 0 は (4000, 0)', () => {
    const deg = knobRotationDeg(pivot, SQUARE[0]!, { x: 4000, y: 0 }, 'free')
    expect(deg).toBeCloseTo(90, 9)
    expect(nodeOf(rotateOutline(loopEntries(SQUARE), deg), 'n0')).toEqual({ x: 4000, y: 0 })
  })

  it('指を (0, 4000) の向きへ動かすと -90°。回した頂点 0 は (0, 4000)', () => {
    const deg = knobRotationDeg(pivot, SQUARE[0]!, { x: 0, y: 4000 }, 'free')
    expect(deg).toBeCloseTo(-90, 9)
    expect(nodeOf(rotateOutline(loopEntries(SQUARE), deg), 'n0')).toEqual({ x: 0, y: 4000 })
  })
})

describe('回転のつまみ: 動かしている間の仮の外形は、離したときに確定する外形と同じ形', () => {
  const RECT: Pt[] = [
    { x: 1000, y: 2000 },
    { x: 9000, y: 2000 },
    { x: 9000, y: 8000 },
    { x: 1000, y: 8000 },
  ]
  const L_SHAPE: Pt[] = [
    { x: 0, y: 0 },
    { x: 6000, y: 0 },
    { x: 6000, y: 2000 },
    { x: 2000, y: 2000 },
    { x: 2000, y: 6000 },
    { x: 0, y: 6000 },
  ]
  const committedOutline = (pts: Pt[], deg: number): Pt[] => {
    const rotated = rotateOutline(loopEntries(pts), deg)
    const closure = findClosedOutline(rotated.flatMap((e) => e.segments))
    if (!closure.closed) throw new Error('外形が閉じていない')
    return closure.footprint.map((p) => ({ x: p.x, y: p.y }))
  }

  for (const deg of [30, 17, -42.5]) {
    it(`長方形を ${deg}° 回した仮の外形は、rotateOutline が確定する外形と同じ頂点`, () => {
      const preview = rotatedFootprint(RECT, outlineCentroid(RECT)!, deg)
      expect([...preview].sort(byXY)).toEqual([...committedOutline(RECT, deg)].sort(byXY))
    })

    it(`L 字を ${deg}° 回した仮の外形は、rotateOutline が確定する外形と同じ頂点`, () => {
      const preview = rotatedFootprint(L_SHAPE, outlineCentroid(L_SHAPE)!, deg)
      expect([...preview].sort(byXY)).toEqual([...committedOutline(L_SHAPE, deg)].sort(byXY))
    })
  }

  it('頂点は整数 mm で、-0 を含まない（正方形を 90° 回しても）', () => {
    const preview = rotatedFootprint(SQUARE, outlineCentroid(SQUARE)!, 90)
    expect(preview).toEqual([
      { x: 4000, y: 0 },
      { x: 4000, y: 4000 },
      { x: 0, y: 4000 },
      { x: 0, y: 0 },
    ])
    for (const p of preview) {
      expect(Number.isInteger(p.x) && Number.isInteger(p.y)).toBe(true)
      expect(Object.is(p.x, -0) || Object.is(p.y, -0)).toBe(false)
    }
  })

  it('0° なら同じ頂点のまま。入力の外形は書き換えない', () => {
    const base = SQUARE.map((p) => ({ ...p }))
    expect(rotatedFootprint(base, outlineCentroid(base)!, 0)).toEqual(SQUARE)
    rotatedFootprint(base, outlineCentroid(base)!, 33)
    expect(base).toEqual(SQUARE)
  })
})

describe('指の位置: 3D の視線と地面（高さ 0）の交点を、平面の mm で返す', () => {
  it('真上から真下への視線は、真下の点。three の x・z（m）が、平面の x・y（mm）に当たる', () => {
    expect(rayHitPlaneMm({ x: 0, y: 10, z: 0 }, { x: 0, y: -1, z: 0 }, 0)).toEqual({ x: 0, y: 0 })
    expect(rayHitPlaneMm({ x: 2, y: 10, z: 3 }, { x: 0, y: -1, z: 0 }, 0)).toEqual({ x: 2000, y: 3000 })
  })

  it('斜めの視線は、進んだ先で地面と交わる（高さ 10 m から x の向きへ 45° で、x = 10 m の点）', () => {
    const hit = rayHitPlaneMm({ x: 0, y: 10, z: 0 }, { x: 1, y: -1, z: 0 }, 0)!
    expect(hit.x).toBeCloseTo(10_000, 6)
    expect(hit.y).toBeCloseTo(0, 6)
  })

  it('向きの長さ（正規化の有無）によらない', () => {
    const a = rayHitPlaneMm({ x: 1, y: 6, z: 2 }, { x: 0.3, y: -0.6, z: 0.1 }, 0)!
    const b = rayHitPlaneMm({ x: 1, y: 6, z: 2 }, { x: 3, y: -6, z: 1 }, 0)!
    expect(a.x).toBeCloseTo(b.x, 6)
    expect(a.y).toBeCloseTo(b.y, 6)
  })

  it('高さを指定すると、その高さの水平な面との交点（高さ 4 m の面）', () => {
    expect(rayHitPlaneMm({ x: 1, y: 10, z: 1 }, { x: 0, y: -1, z: 0 }, 4)).toEqual({ x: 1000, y: 1000 })
  })

  it('地面と平行な視線は交わらない（null）', () => {
    expect(rayHitPlaneMm({ x: 0, y: 10, z: 0 }, { x: 1, y: 0, z: 0 }, 0)).toBeNull()
  })

  it('面が視線の後ろにあるとき（視線が地面から離れる向き）は交わらない（null）', () => {
    expect(rayHitPlaneMm({ x: 0, y: 10, z: 0 }, { x: 0, y: 1, z: 0 }, 0)).toBeNull()
  })

  it('重心の右（three の +x 側）から上（mm の +y = three の +z 側）へ指を回すと、回す量は +90°', () => {
    const pivot: Pt = ORIGIN
    const grab = rayHitPlaneMm({ x: 1, y: 10, z: 0 }, { x: 0, y: -1, z: 0 }, 0)!
    const now = rayHitPlaneMm({ x: 0, y: 10, z: 1 }, { x: 0, y: -1, z: 0 }, 0)!
    expect(knobAngleDeg(pivot, grab, now)).toBeCloseTo(90, 9)
  })
})

describe('平面の点（mm）と高さ（mm）を、3D の位置（three の x・高さ・z。m）にする', () => {
  it('平面の (x, y) mm は three の (x, 高さ, y) m。mm は 1/1000 で m', () => {
    expect(scenePosition({ x: 2000, y: 3000 }, 6000)).toEqual([2, 6, 3])
    expect(scenePosition({ x: -1500, y: 0 }, 0)).toEqual([-1.5, 0, 0])
  })
})
