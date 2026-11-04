// 仕様（ハブ D-04 共通部品「数値入力」: 描いた線の長さや位置を数値で指定して確定する。置くかどうかは未決。仮置き）:
// 仕様 1: 始点・長さ（mm）・角度（度。0 は x 軸の正の向き、90 は y 軸の正の向き。反時計回り）から、終点を整数 mm で求める。
// 仕様 2: 長さが 0 以下なら、例外（RangeError）。
// 仕様 3: 数値で入れた線は、描いた線として入る（指定した始点と終点の mm どおり。向きは問わない）。
import { beforeEach, describe, expect, it } from 'vitest'
import { addNumericLine, lineEndFromLength } from './numericLine'
import { useDrawing } from '../store/drawing'

describe('lineEndFromLength（始点・長さ・角度から終点）', () => {
  it('0 度は x の正の向き、90 度は y の正の向き', () => {
    expect(lineEndFromLength({ x: 0, y: 0 }, 1000, 0)).toEqual({ x: 1000, y: 0 })
    expect(lineEndFromLength({ x: 0, y: 0 }, 1000, 90)).toEqual({ x: 0, y: 1000 })
  })

  it('180 度と 270 度', () => {
    expect(lineEndFromLength({ x: 5000, y: 5000 }, 1000, 180)).toEqual({ x: 4000, y: 5000 })
    expect(lineEndFromLength({ x: 5000, y: 5000 }, 1000, 270)).toEqual({ x: 5000, y: 4000 })
  })

  it('斜めは整数 mm に四捨五入する（45 度・長さ 1000 は 707、707）', () => {
    expect(lineEndFromLength({ x: 0, y: 0 }, 1000, 45)).toEqual({ x: 707, y: 707 })
  })

  it('長さが 0 以下なら、例外（RangeError）', () => {
    expect(() => lineEndFromLength({ x: 0, y: 0 }, 0, 0)).toThrow(RangeError)
    expect(() => lineEndFromLength({ x: 0, y: 0 }, -10, 0)).toThrow(RangeError)
  })
})

// 仕様 4（円弧。G130・t70）: 中心と始点と終点で描いた円弧（中心方式）も、二点とずらしで描いた円弧（二点方式）も、
// 描いた線として入り、始点から終点まで続く。
describe('円弧（中心方式・二点方式）は、描いた線として入る', () => {
  beforeEach(() => {
    useDrawing.setState({ entries: [], past: [], redoStack: [], fitted: false })
  })

  it('中心方式: 中心・始点・終点で指定した円弧は、始点から終点まで、つながった線分として入る', async () => {
    const { addArcCenterStroke } = await import('./numericLine')
    addArcCenterStroke({ x: 0, y: 0 }, { x: 1000, y: 0 }, { x: 0, y: 1000 })
    const entries = useDrawing.getState().entries
    expect(entries).toHaveLength(1)
    const segs = entries[0]!.segments
    expect(segs.length).toBeGreaterThan(1)
    const ends = segs.flatMap((s) => [
      { x: s.x1, y: s.y1 },
      { x: s.x2, y: s.y2 },
    ])
    expect(ends).toEqual(expect.arrayContaining([{ x: 1000, y: 0 }, { x: 0, y: 1000 }]))
  })

  it('二点方式: 二点とずらしで指定した円弧は、二点の間を、つながった線分として入る', async () => {
    const { addArcTwoPointStroke } = await import('./numericLine')
    addArcTwoPointStroke({ x: -1000, y: 0 }, { x: 1000, y: 0 }, 1000)
    const entries = useDrawing.getState().entries
    expect(entries).toHaveLength(1)
    const segs = entries[0]!.segments
    expect(segs.length).toBeGreaterThan(1)
    const ends = segs.flatMap((s) => [
      { x: s.x1, y: s.y1 },
      { x: s.x2, y: s.y2 },
    ])
    expect(ends).toEqual(expect.arrayContaining([{ x: -1000, y: 0 }, { x: 1000, y: 0 }]))
  })
})

describe('addNumericLine（数値で入れた線は、描いた線として入る）', () => {
  beforeEach(() => {
    useDrawing.setState({ entries: [], past: [], redoStack: [], fitted: false })
  })

  it('指定した始点と終点の mm どおりの線分が 1 本、描いた線として入る', () => {
    addNumericLine({ x: 1000, y: 2000 }, 3000, 0)
    const entries = useDrawing.getState().entries
    expect(entries).toHaveLength(1)
    const seg = entries[0]!.segments[0]!
    const ends = [
      { x: seg.x1, y: seg.y1 },
      { x: seg.x2, y: seg.y2 },
    ]
    expect(ends).toEqual(expect.arrayContaining([{ x: 1000, y: 2000 }, { x: 4000, y: 2000 }]))
    expect(ends).toHaveLength(2)
  })
})
