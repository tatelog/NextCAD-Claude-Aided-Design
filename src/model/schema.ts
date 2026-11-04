// D-03 E-01 Stroke / E-02 Segment の定義。型と実行時検証を同じ定義から作る（D-02 C3）。
// 列挙は D-03 の日本語の列挙を英字にしたもの:
//   stage     F4 / F5 / F9
//   pen_mode  line（直線）/ curve（曲線）
//   pen_input pen / touch / mouse（指・マウス・ペンのどれでも描く。G23 と代表の補足）
//   snap      none（なし）/ node（端点）/ intersection（交点）/ on_segment（線分上）/ axis（水平垂直）/ grid（グリッド）
//   curve     line（直線）/ arc（円弧）/ spline（自由曲線）
import { z } from 'zod'

export const StageSchema = z.enum(['F4', 'F5', 'F9'])
export const PenModeSchema = z.enum(['line', 'curve'])
export const PenInputSchema = z.enum(['pen', 'touch', 'mouse'])
export const SnapSchema = z.enum(['none', 'node', 'intersection', 'on_segment', 'axis', 'grid'])
export const CurveSchema = z.enum(['line', 'arc', 'spline'])

const mm = z.number().int()

export const PointMmSchema = z.object({ x: mm, y: mm })
export const PointPxSchema = z.object({ px: z.number(), py: z.number() })

// E-01。view_origin は E-01 に無いが、px → mm の換算に原点が要るので持つ（D-03 への追記候補）。
export const StrokeSchema = z.object({
  id: z.string().min(1),
  points: z.array(PointPxSchema),
  view_scale: z.number().positive(),
  view_origin: PointPxSchema,
  stage: StageSchema,
  pen_mode: PenModeSchema,
  segment_ids: z.array(z.string()).optional(),
  created_at: z.string(),
  pen_input: PenInputSchema,
  // 3 点で描いた円弧の中心（mm）と向き（反時計回りなら ccw）。円弧でない線には無い（G5・D-02 C6）
  arc: z.object({ center: PointMmSchema, ccw: z.boolean() }).optional(),
})

// 端点。線分は端点 ID で参照し合う（D-02 C1「端点の共有」）。
export const NodeSchema = z.object({ id: z.string().min(1), x: mm, y: mm })

// E-02。
export const SegmentSchema = z.object({
  id: z.string().min(1),
  x1: mm,
  y1: mm,
  x2: mm,
  y2: mm,
  start_node_id: z.string().min(1),
  end_node_id: z.string().min(1),
  snap: SnapSchema,
  stroke_id: z.string().optional(),
  stage: StageSchema,
  semantic_object_id: z.string().optional(),
  revision: z.number().int().nonnegative(),
  curve: CurveSchema,
  curve_params: z.record(z.string(), z.unknown()).optional(),
})

export type Stage = z.infer<typeof StageSchema>
export type PenMode = z.infer<typeof PenModeSchema>
export type PenInput = z.infer<typeof PenInputSchema>
export type Snap = z.infer<typeof SnapSchema>
export type PointMm = z.infer<typeof PointMmSchema>
export type PointPx = z.infer<typeof PointPxSchema>
export type Stroke = z.infer<typeof StrokeSchema>
export type Node = z.infer<typeof NodeSchema>
export type Segment = z.infer<typeof SegmentSchema>
