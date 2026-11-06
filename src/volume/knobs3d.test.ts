// 3D のつまみ（ハブ A-03 G71 の回転、G65 の高さ。D-04 P2）の仕様テスト。仕様だけから書く。
//
// 回転のつまみ（G71。代表の決定: ボリューム（建物）を回転する機能を付ける。回すと建物の回転角が変わる）。
// 画面側の案（D-04）: 3D の外形の角に回転のつまみを置く。刻み（自由・15°・90°）は右パネル。カメラの回転とは別。
// 今回の仮置き（これを 1 項目ずつテストにしている。つまみの描画・カメラを止める配線は DOM が要るので試験しない）:
//  1. 回す量は、つまんだ時点の（重心 → つまんだ点）の向きから、今の（重心 → 指の位置）の向きまでの差。
//     反時計回りが正（mm の +y が画面の上。rotateOutline と同じ向き）
//  2. 回す量は右パネルの刻み（自由・15°・90°）で丸める。自由は丸めない
//  3. 動かしている間は、回した外形を表示だけで見せる。離したときに rotateOutline が確定する外形と同じ形（整数 mm）
//  4. 指の位置は、3D の視線と地面（高さ 0）の交点。平面の (x, y) mm は three の (x, 高さ, z) m に対応する（z が y。Volume3D と同じ）
//
// 高さのつまみ（G65。代表の決定: オブジェクトにはつまみを付けて、外形の変更を容易にさせる。画面側の案（D-04）: 3D の上面に高さのつまみを置く）。
// 未決（ハブ）: 高さのつまみが何の値を動かすか。今回の仮置き: 階数を動かす（階高は右パネルの値のまま）:
//  5. つまんで動かすと、建物の高さ（階数 × 階高）が指の高さに追従する。つまんだ時点の高さから、指の動いた分だけ変える
//  6. 離したときに、高さを階高で割って最も近い整数の階数にし、1 以上・上限 30 に丸める
//  7. 指の高さは、外形の重心を通る鉛直な軸の上で、視線にいちばん近い点の高さ（真上から見下ろすと決まらない）
//
// 回転のつまみを置く角（上の「角」を複数の角と読む。今回の決定・仮置き: 外形のすべての頂点に 1 つずつ）:
//  8. 外形の頂点の数だけ置く（頂点 0 だけにしない）。並びと番号は外形の頂点の順。空の外形には置かない
//  9. 位置が同じ頂点には重ねない（先に出たほうだけ。番号は外形のまま詰めない）。位置が 1 mm でも違えば別の頂点
import { describe, expect, it } from 'vitest'
import { findClosedOutline } from '../canvas/closure'
import { rotateOutline } from '../canvas/outlineEdit'
import type { Node, Segment } from '../model/schema'
import {
  MAX_STOREYS,
  axisHeightAtRayMm,
  dragHeightMm,
  knobAngleDeg,
  knobRotationDeg,
  rayHitPlaneMm,
  rotatedFootprint,
  rotationKnobSpots,
  scenePosition,
  storeyCountFromHeight,
} from './knobs3d'
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

describe('回転のつまみを置く角: 外形のすべての頂点に 1 つずつ（頂点の番号と、平面の位置 mm）', () => {
  // 頂点が 6 つの L 字（頂点 0 は (0, 0)、頂点 5 は (0, 6000)）
  const L_SHAPE_6: Pt[] = [
    { x: 0, y: 0 },
    { x: 6000, y: 0 },
    { x: 6000, y: 2000 },
    { x: 2000, y: 2000 },
    { x: 2000, y: 6000 },
    { x: 0, y: 6000 },
  ]
  // 頂点 3 が頂点 1 と同じ位置になっている外形（頂点は 5 つ、位置は 4 か所）
  const REPEATED: Pt[] = [
    { x: 0, y: 0 },
    { x: 4000, y: 0 },
    { x: 4000, y: 4000 },
    { x: 4000, y: 0 },
    { x: 0, y: 4000 },
  ]

  it('頂点の数だけ置く（頂点 0 だけにしない）: 頂点が 4 つの正方形には 4 つ、6 つの L 字には 6 つ', () => {
    expect(rotationKnobSpots(SQUARE)).toHaveLength(4)
    expect(rotationKnobSpots(L_SHAPE_6)).toHaveLength(6)
  })

  it('並びは外形の頂点の順。番号は 0 から、位置はその頂点の平面の位置（mm）', () => {
    const spots = rotationKnobSpots(L_SHAPE_6)
    expect(spots.map((s) => s.index)).toEqual([0, 1, 2, 3, 4, 5])
    expect(spots.map((s) => s.point)).toEqual(L_SHAPE_6)
  })

  it('頂点が 1 つや 2 つの外形でも、頂点の数だけ置く', () => {
    expect(rotationKnobSpots([{ x: 1000, y: 2000 }])).toEqual([{ index: 0, point: { x: 1000, y: 2000 } }])
    expect(rotationKnobSpots([{ x: 0, y: 0 }, { x: 3000, y: 0 }]).map((s) => s.index)).toEqual([0, 1])
  })

  it('空の外形には置かない', () => {
    expect(rotationKnobSpots([])).toEqual([])
  })

  it('位置が同じ頂点には重ねない: 閉じ目（最後の頂点が最初と同じ位置）は 1 つにまとめる', () => {
    const closed = [...SQUARE, { ...SQUARE[0]! }]
    const spots = rotationKnobSpots(closed)
    expect(spots).toHaveLength(4)
    expect(spots.map((s) => s.index)).toEqual([0, 1, 2, 3])
    expect(spots.map((s) => s.point)).toEqual(SQUARE)
  })

  it('途中で同じ位置になる頂点も、先に出たほうだけ置く。番号は外形のまま（詰めない）', () => {
    const spots = rotationKnobSpots(REPEATED)
    expect(spots.map((s) => s.index)).toEqual([0, 1, 2, 4])
    expect(spots.map((s) => s.point)).toEqual([REPEATED[0], REPEATED[1], REPEATED[2], REPEATED[4]])
  })

  it('位置が 1 mm でも違えば別の頂点として置く（仮置き: 位置が完全に同じものだけをまとめる）', () => {
    const near: Pt[] = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 0, y: 1 },
    ]
    expect(rotationKnobSpots(near).map((s) => s.index)).toEqual([0, 1, 2])
  })

  it('0 と -0 は同じ位置', () => {
    const pts: Pt[] = [
      { x: 0, y: 0 },
      { x: -0, y: -0 },
      { x: 5000, y: 0 },
    ]
    expect(rotationKnobSpots(pts).map((s) => s.index)).toEqual([0, 2])
  })

  it('入力の外形は書き換えない。返した位置を書き換えても外形は変わらない（位置は写し）', () => {
    const base = SQUARE.map((p) => ({ ...p }))
    const spots = rotationKnobSpots(base)
    expect(base).toEqual(SQUARE)
    // Point は読み取り専用の型。書き換えられても外形に響かないことを見るため、型を外して書き換える
    const writable = spots.map((s) => s.point as { x: number; y: number })
    writable[0]!.x = 99_999
    writable[1]!.y = -99_999
    expect(base).toEqual(SQUARE)
  })

  it('番号は外形の頂点の番号のまま: 回している間の仮の外形の同じ番号の頂点が、そのつまみの動いた先', () => {
    const pivot = outlineCentroid(REPEATED)!
    for (const deg of [90, 30, -42.5]) {
      const preview = rotatedFootprint(REPEATED, pivot, deg)
      for (const spot of rotationKnobSpots(REPEATED)) {
        expect(preview[spot.index]).toEqual(rotatedFootprint([spot.point], pivot, deg)[0])
      }
    }
  })
})

describe('指の位置: 3D の視線と地面（高さ 0）の交点を、平面の mm で返す', () => {
  // 統括の判断 2026-11-06（鏡像の直し、方針 A）: 北は three の −z。平面の y は three の −z（m）に当たる
  it('真上から真下への視線は、真下の点。three の x と −z（m）が、平面の x と y（mm）に当たる', () => {
    expect(rayHitPlaneMm({ x: 0, y: 10, z: 0 }, { x: 0, y: -1, z: 0 }, 0)).toEqual({ x: 0, y: 0 })
    expect(rayHitPlaneMm({ x: 2, y: 10, z: 3 }, { x: 0, y: -1, z: 0 }, 0)).toEqual({ x: 2000, y: -3000 })
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
    expect(rayHitPlaneMm({ x: 1, y: 10, z: 1 }, { x: 0, y: -1, z: 0 }, 4)).toEqual({ x: 1000, y: -1000 })
  })

  it('地面と平行な視線は交わらない（null）', () => {
    expect(rayHitPlaneMm({ x: 0, y: 10, z: 0 }, { x: 1, y: 0, z: 0 }, 0)).toBeNull()
  })

  it('面が視線の後ろにあるとき（視線が地面から離れる向き）は交わらない（null）', () => {
    expect(rayHitPlaneMm({ x: 0, y: 10, z: 0 }, { x: 0, y: 1, z: 0 }, 0)).toBeNull()
  })

  // 統括の判断 2026-11-06（鏡像の直し、方針 A）: 上（画面の上 = 平面の北 = three の −z 側）
  it('重心の右（東。three の +x 側）から上（北。three の −z 側）へ指を回すと、回す量は +90°', () => {
    const pivot: Pt = ORIGIN
    const grab = rayHitPlaneMm({ x: 1, y: 10, z: 0 }, { x: 0, y: -1, z: 0 }, 0)!
    const now = rayHitPlaneMm({ x: 0, y: 10, z: -1 }, { x: 0, y: -1, z: 0 }, 0)!
    expect(knobAngleDeg(pivot, grab, now)).toBeCloseTo(90, 9)
  })
})

describe('平面の点（mm）と高さ（mm）を、3D の位置（three の x・高さ・z。m）にする', () => {
  it('平面の (x, y) mm は three の (x, 高さ, −y) m（北は −z。統括の判断 2026-11-06）。mm は 1/1000 で m', () => {
    expect(scenePosition({ x: 2000, y: 3000 }, 6000)).toEqual([2, 6, -3])
    expect(scenePosition({ x: -1500, y: 0 }, 0)).toEqual([-1.5, 0, 0])
  })
})

describe('高さのつまみ: 高さを階高で割って、最も近い整数の階数にする（1 以上・上限 30）', () => {
  it('上限は 30 階（仮置き）', () => {
    expect(MAX_STOREYS).toBe(30)
  })

  it('階高 3000 mm のとき、高さ 6500 mm は 2 階（四捨五入）', () => {
    expect(storeyCountFromHeight(6500, 3000)).toBe(2)
  })

  it('階高で割り切れる高さは、その階数（3000 → 1 階、6000 → 2 階、15000 → 5 階）', () => {
    expect(storeyCountFromHeight(3000, 3000)).toBe(1)
    expect(storeyCountFromHeight(6000, 3000)).toBe(2)
    expect(storeyCountFromHeight(15_000, 3000)).toBe(5)
  })

  it('最も近い整数へ（4400 mm は 1 階、4600 mm は 2 階。ちょうど半分の 4500 mm は切り上げて 2 階）', () => {
    expect(storeyCountFromHeight(4400, 3000)).toBe(1)
    expect(storeyCountFromHeight(4600, 3000)).toBe(2)
    expect(storeyCountFromHeight(4500, 3000)).toBe(2)
  })

  it('階高は右パネルの値（階高 2800 mm のとき、8400 mm は 3 階、7000 mm は 2.5 階分なので 3 階）', () => {
    expect(storeyCountFromHeight(8400, 2800)).toBe(3)
    expect(storeyCountFromHeight(7000, 2800)).toBe(3)
  })

  it('0 や負の高さ、1 階の半分より低い高さは 1 階', () => {
    expect(storeyCountFromHeight(0, 3000)).toBe(1)
    expect(storeyCountFromHeight(-3000, 3000)).toBe(1)
    expect(storeyCountFromHeight(1000, 3000)).toBe(1)
  })

  it('上限を超えるときは 30 階（ちょうど 30 階分は 30 階、31 階分や 100 m は 30 階）', () => {
    expect(storeyCountFromHeight(90_000, 3000)).toBe(30)
    expect(storeyCountFromHeight(93_000, 3000)).toBe(30)
    expect(storeyCountFromHeight(100_000, 3000)).toBe(30)
  })

  it('階高が 0 以下・高さが数でないときは 1 階', () => {
    expect(storeyCountFromHeight(6500, 0)).toBe(1)
    expect(storeyCountFromHeight(6500, -3000)).toBe(1)
    expect(storeyCountFromHeight(Number.NaN, 3000)).toBe(1)
    expect(storeyCountFromHeight(6500, Number.NaN)).toBe(1)
  })
})

describe('高さのつまみ: 指の高さ（重心を通る鉛直な軸の上で、視線にいちばん近い点の高さ。mm）', () => {
  it('軸の上の点 (0, 高さ 3 m, 0) を狙う視線は、高さ 3000 mm', () => {
    // 視点 (0, 5, 10) m から (0, 3, 0) m を見る
    expect(axisHeightAtRayMm({ x: 0, y: 5, z: 10 }, { x: 0, y: -2, z: -10 }, { x: 0, y: 0 })!).toBeCloseTo(3000, 6)
  })

  it('軸は平面の点 (x, y) mm の真上（three の x と −z が x と y）。軸 (4000, 7000) mm の高さ 6 m を狙う視線は 6000 mm', () => {
    // 視点 (4, 20, 17) m から、軸の高さ 6 m の点 (4, 6, −7) m を見る（平面の y = 7000 mm は three の z = −7 m）
    expect(axisHeightAtRayMm({ x: 4, y: 20, z: 17 }, { x: 0, y: -14, z: -24 }, { x: 4000, y: 7000 })!).toBeCloseTo(6000, 6)
  })

  it('真横から見る視線は、視点の高さ（高さ 3 m から -x の向きへ。軸に当たらず脇を通っても同じ）', () => {
    expect(axisHeightAtRayMm({ x: 10, y: 3, z: 0 }, { x: -1, y: 0, z: 0 }, { x: 0, y: 0 })!).toBeCloseTo(3000, 6)
    expect(axisHeightAtRayMm({ x: 10, y: 3, z: 2 }, { x: -1, y: 0, z: 0 }, { x: 0, y: 0 })!).toBeCloseTo(3000, 6)
  })

  it('斜めに見下ろす視線が軸の足元（地面）に当たるときは 0 mm', () => {
    expect(axisHeightAtRayMm({ x: 0, y: 10, z: 5 }, { x: 0, y: -10, z: -5 }, { x: 0, y: 0 })!).toBeCloseTo(0, 6)
  })

  it('向きの長さ（正規化の有無）によらない', () => {
    const a = axisHeightAtRayMm({ x: 0, y: 5, z: 10 }, { x: 0, y: -2, z: -10 }, { x: 0, y: 0 })!
    const b = axisHeightAtRayMm({ x: 0, y: 5, z: 10 }, { x: 0, y: -6, z: -30 }, { x: 0, y: 0 })!
    expect(a).toBeCloseTo(b, 6)
  })

  it('真上（鉛直から 5° 以内）から見下ろす視線は、高さを決められないので null', () => {
    expect(axisHeightAtRayMm({ x: 1, y: 10, z: 1 }, { x: 0, y: -1, z: 0 }, { x: 0, y: 0 })).toBeNull()
    expect(axisHeightAtRayMm({ x: 1, y: 10, z: 1 }, { x: 0.05, y: -1, z: 0 }, { x: 0, y: 0 })).toBeNull()
    expect(axisHeightAtRayMm({ x: 1, y: -10, z: 1 }, { x: 0, y: 1, z: 0 }, { x: 0, y: 0 })).toBeNull()
  })

  it('鉛直から 11° 傾いていれば決められる', () => {
    expect(axisHeightAtRayMm({ x: 1, y: 10, z: 1 }, { x: 0.2, y: -1, z: 0 }, { x: 0, y: 0 })).not.toBeNull()
  })

  it('向きが零のベクトルや、数でない入力は null', () => {
    expect(axisHeightAtRayMm({ x: 0, y: 5, z: 10 }, { x: 0, y: 0, z: 0 }, { x: 0, y: 0 })).toBeNull()
    expect(axisHeightAtRayMm({ x: Number.NaN, y: 5, z: 10 }, { x: 0, y: -2, z: -10 }, { x: 0, y: 0 })).toBeNull()
  })
})

describe('高さのつまみ: つまんだ時点の高さから、指の動いた分だけ高さを変える', () => {
  it('指が 3 m 上がれば、高さも 3 m 上がる（15 m → 18 m）。下げれば下がる', () => {
    expect(dragHeightMm(15_000, 15_000, 18_000)).toBe(18_000)
    expect(dragHeightMm(15_000, 15_000, 12_000)).toBe(12_000)
  })

  it('動かさなければ変わらない（つまんだ点が、つまみの中心から少し外れていても跳ばない）', () => {
    expect(dragHeightMm(15_000, 15_500, 15_500)).toBe(15_000)
  })

  it('階数に直すと、5 階（階高 3000 mm）のつまみを 3 m 上げて 6 階、1 m 上げてもまだ 5 階、2.2 m 上げて 6 階', () => {
    const storeys = (nowMm: number) => storeyCountFromHeight(dragHeightMm(15_000, 15_000, nowMm), 3000)
    expect(storeys(18_000)).toBe(6)
    expect(storeys(16_000)).toBe(5)
    expect(storeys(17_200)).toBe(6)
  })

  it('地面まで下げると 1 階、うんと上げると 30 階（上限）', () => {
    const storeys = (nowMm: number) => storeyCountFromHeight(dragHeightMm(15_000, 15_000, nowMm), 3000)
    expect(storeys(0)).toBe(1)
    expect(storeys(-5000)).toBe(1)
    expect(storeys(200_000)).toBe(30)
  })
})
