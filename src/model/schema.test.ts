// 仕様: D-03 E-01 Stroke / E-02 Segment の項目定義。
// D-02 C3「型の表現」: TypeScript の型で定義し、実行時の検証は同じ定義から作る（Zod）。
// E-02: x1..y2 は整数 mm。curve は 直線／円弧／自由曲線。snap は D-02 C1 の5段階＋なし。
import { describe, expect, it } from 'vitest'
import { SegmentSchema, StrokeSchema } from './schema'

const okSegment = {
  id: 'seg-1',
  x1: 0,
  y1: 0,
  x2: 10_000,
  y2: 0,
  start_node_id: 'n-1',
  end_node_id: 'n-2',
  snap: 'none',
  stage: 'F4',
  revision: 1,
  curve: 'line',
}

describe('SegmentSchema', () => {
  it('整数 mm の直線 Segment を受け付ける', () => {
    expect(SegmentSchema.parse(okSegment)).toEqual(okSegment)
  })

  it('mm が整数でない Segment は弾く', () => {
    expect(() => SegmentSchema.parse({ ...okSegment, x2: 10_000.5 })).toThrow()
  })

  it('curve の列挙外は弾く', () => {
    expect(() => SegmentSchema.parse({ ...okSegment, curve: 'bezier' })).toThrow()
  })

  it('snap は なし／端点／交点／線分上／水平垂直／グリッド の6つ', () => {
    for (const snap of ['none', 'node', 'intersection', 'on_segment', 'axis', 'grid']) {
      expect(SegmentSchema.parse({ ...okSegment, snap }).snap).toBe(snap)
    }
    expect(() => SegmentSchema.parse({ ...okSegment, snap: 'magnet' })).toThrow()
  })

  it('F4 の線は semantic_object_id を持たない（省略可で、省いたときは未定義）', () => {
    expect(SegmentSchema.parse(okSegment).semantic_object_id).toBeUndefined()
  })
})

describe('StrokeSchema', () => {
  const okStroke = {
    id: 'st-1',
    points: [
      { px: 10, py: 20 },
      { px: 30, py: 40 },
    ],
    view_scale: 25,
    view_origin: { px: 100, py: 400 },
    stage: 'F4',
    pen_mode: 'line',
    created_at: '2026-11-03T00:00:00.000Z',
    pen_input: 'mouse',
  }

  it('px の点列と描いた時点のビュー（倍率と原点）を持つ Stroke を受け付ける', () => {
    expect(StrokeSchema.parse(okStroke)).toEqual(okStroke)
  })

  it('pen_mode は line か curve だけ', () => {
    expect(() => StrokeSchema.parse({ ...okStroke, pen_mode: 'auto' })).toThrow()
  })

  it('pen_input は pen / touch / mouse（指・マウス・ペンのどれでも描く。G23 と代表の補足）', () => {
    for (const pen_input of ['pen', 'touch', 'mouse']) {
      expect(StrokeSchema.parse({ ...okStroke, pen_input }).pen_input).toBe(pen_input)
    }
    expect(() => StrokeSchema.parse({ ...okStroke, pen_input: 'apple_pencil' })).toThrow()
  })

  it('view_scale は正の数', () => {
    expect(() => StrokeSchema.parse({ ...okStroke, view_scale: 0 })).toThrow()
  })
})
