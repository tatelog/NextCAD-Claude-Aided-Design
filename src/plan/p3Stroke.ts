// P3 の描く画面（D-04 P3、D-02 C1）。ドラッグの軌跡を Stroke（px・スケール・原点）にする。
// 段は F9（間取り）。入力は指・マウス・ペンのどれでもよいので、ここでは mouse として記録する。
import { StrokeSchema, type Stroke } from '../model/schema'

export function p3Stroke(input: {
  points: { px: number; py: number }[]
  viewScaleMmPerPx: number
  viewOriginPx: { px: number; py: number }
  id: string
}): Stroke {
  if (input.points.length < 2) throw new Error('線になるには点が 2 つ以上必要')
  return StrokeSchema.parse({
    id: input.id,
    points: input.points,
    view_scale: input.viewScaleMmPerPx,
    view_origin: input.viewOriginPx,
    stage: 'F9',
    pen_mode: 'line',
    created_at: new Date(0).toISOString(),
    pen_input: 'mouse',
  })
}
