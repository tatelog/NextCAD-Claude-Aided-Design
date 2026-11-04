// 仕様（ハブ A-03 G5・D-02 C6）: 描いた線のうち、円弧（中心と向きを持つ線）だけを、円弧の外形に戻して取り出す。円弧でない線は取らない。
// 仕様 1: 円弧の線は、始点・終点（mm）と中心・向きを持つ円弧になる。mm は、線の点（px）を view_origin と view_scale で直した値（y は上向き）。
// 仕様 2: 円弧でない線は取らない。点が 2 つ未満の線も取らない。
// 仕様 3: 入力を書き換えず、同じ入力には同じ出力。
import { describe, expect, it } from 'vitest'
import { outlineArcsOf } from './outlineArcs'

const arcStroke = {
  points: [
    { px: 0, py: 1000 },
    { px: 500, py: 0 },
    { px: 0, py: -1000 },
  ],
  view_scale: 1,
  view_origin: { px: 0, py: 0 },
  arc: { center: { x: 0, y: 0 }, ccw: true },
}
const lineStroke = { points: [{ px: 0, py: 0 }, { px: 10, py: 10 }], view_scale: 1, view_origin: { px: 0, py: 0 } }

describe('描いた円弧の外形（仕様 1〜3）', () => {
  it('仕様 1: 円弧の線は、mm の始点・終点・中心・向きを持つ円弧になる（y は上向き）', () => {
    expect(outlineArcsOf([{ stroke: arcStroke }])).toEqual([
      { kind: 'arc', a: { x: 0, y: -1000 }, b: { x: 0, y: 1000 }, center: { x: 0, y: 0 }, ccw: true },
    ])
  })

  it('仕様 2: 円弧でない線と、点が 2 つ未満の線は取らない', () => {
    expect(outlineArcsOf([{ stroke: lineStroke }, { stroke: { ...arcStroke, points: [{ px: 0, py: 0 }] } }])).toEqual([])
  })

  it('仕様 3: 入力を書き換えず、同じ入力には同じ出力', () => {
    const input = [{ stroke: arcStroke }]
    expect(outlineArcsOf(input)).toEqual(outlineArcsOf(input))
    expect(arcStroke.points[0]).toEqual({ px: 0, py: 1000 })
  })
})
