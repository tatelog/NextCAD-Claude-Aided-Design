// 仕様（ハブ A-03 G130・t70。設計グリル 2026-11-05、統括 2026-11-05）: 任意の 2 点（始点と終点）を選ぶ。
// 中心は、その 2 点の中点を通る中心線（垂直二等分線）上にあり、利用者が中心線上を動かして決める。半径は中心の位置から決まる（半径の数値入力ではない）。
// 仕様 1（中心線上の位置）: ポインターの位置は、中心線に垂直に投影した位置で中心を決める。ずらし量は、中点から弦の左の法線方向への距離（正は左）。
// 仕様 2（確定）: 一点目 → 二点目 → 中心線上を動かす → 押して確定。確定した円弧の両端は二点ちょうど。道具は一点目の待ちに戻る。
// 仕様 3（押せない）: 二点目が一点目と同じ場所なら、押せない（状態は変わらず、理由を出す）。
// 仕様 4（動きだけ）: 一点目を押す前の動きは何もしない。中心を決める前（二点目の後）の動きも、状態は変えない。
import { describe, expect, it } from 'vitest'
import { ARC_TOOL_START, arcPreviewMm, arcToolStep, offsetOnBisector } from './twoPointArcTool'

const p1 = { x: -1000, y: 0 }
const p2 = { x: 1000, y: 0 }

describe('中心線上のずらし量（t70 仕様 1）', () => {
  it('中心線の上（左）に動かすと正、下（右）に動かすと負。左右の位置は見ない', () => {
    expect(offsetOnBisector(p1, p2, { x: 0, y: 1000 })).toBeCloseTo(1000, 10)
    expect(offsetOnBisector(p1, p2, { x: 0, y: -500 })).toBeCloseTo(-500, 10)
    expect(offsetOnBisector(p1, p2, { x: 300, y: 800 })).toBeCloseTo(800, 10)
  })
})

// 仕様 5（プレビュー。t81）: 一点目の前は何もない。二点目の前は、一点目から動かした点までの弦。中心を決める途中は、中心線上の中心でできる円弧の点列。
describe('二点の円弧の道具のプレビュー（t81 仕様 5）', () => {
  it('一点目の前は null、二点目の前は一点目から動かした点までの弦', () => {
    expect(arcPreviewMm(ARC_TOOL_START, { x: 0, y: 500 })).toBeNull()
    const s = arcToolStep(ARC_TOOL_START, { type: 'click', point: p1 }).state
    expect(arcPreviewMm(s, { x: 0, y: 500 })).toEqual([p1, { x: 0, y: 500 }])
  })

  it('中心を決める途中は、今のずらし量の円弧の点列（両端は二点）', () => {
    const s1 = arcToolStep(ARC_TOOL_START, { type: 'click', point: p1 }).state
    const s2 = arcToolStep(s1, { type: 'click', point: p2 }).state
    const s3 = arcToolStep(s2, { type: 'move', point: { x: 0, y: 1000 } }).state
    const pts = arcPreviewMm(s3, { x: 0, y: 1000 })!
    expect(pts[0]).toEqual(p1)
    expect(pts[pts.length - 1]).toEqual(p2)
    expect(pts.length).toBeGreaterThan(2)
  })
})

describe('二点の円弧の道具（t70 仕様 2〜4）', () => {
  it('仕様 2: 一点目 → 二点目 → 中心線上を動かす → 押して確定。両端は二点ちょうど、中心は動かした位置', () => {
    let s = arcToolStep(ARC_TOOL_START, { type: 'click', point: p1 })
    expect(s.state).toEqual({ phase: 'second', p1 })
    s = arcToolStep(s.state, { type: 'click', point: p2 })
    expect(s.state.phase).toBe('center')
    s = arcToolStep(s.state, { type: 'move', point: { x: 0, y: 1000 } })
    expect(s.state.phase === 'center' && s.state.offsetMm).toBeCloseTo(1000, 10)
    s = arcToolStep(s.state, { type: 'click', point: { x: 0, y: 1000 } })
    expect(s.commit).not.toBeNull()
    expect(s.commit!.center.x).toBeCloseTo(0, 10)
    expect(s.commit!.center.y).toBeCloseTo(1000, 10)
    expect(s.commit!.points[0]).toEqual(p1)
    expect(s.commit!.points[s.commit!.points.length - 1]).toEqual(p2)
    expect(s.state).toEqual(ARC_TOOL_START)
  })

  it('仕様 3: 二点目が一点目と同じ場所なら押せず、状態は変わらず、理由を出す', () => {
    const s1 = arcToolStep(ARC_TOOL_START, { type: 'click', point: p1 })
    const s2 = arcToolStep(s1.state, { type: 'click', point: p1 })
    expect(s2.state).toEqual({ phase: 'second', p1 })
    expect(s2.commit).toBeNull()
    expect(s2.error).not.toBeNull()
  })

  it('仕様 4: 一点目の前の動きは何もしない。二点目の後の動きは、中心を決めるまで状態を変えない', () => {
    const moved = arcToolStep(ARC_TOOL_START, { type: 'move', point: { x: 0, y: 500 } })
    expect(moved.state).toEqual(ARC_TOOL_START)
    const second = arcToolStep(ARC_TOOL_START, { type: 'click', point: p1 })
    const still = arcToolStep(second.state, { type: 'move', point: { x: 0, y: 500 } })
    expect(still.state).toEqual({ phase: 'second', p1 })
  })
})
