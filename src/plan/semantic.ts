// P3 線の意味判定（D-02 C2、D-03 T-03、A-03 G8・G9・G13・G14）。
// Claude の出力は JSON スキーマで強制し、外れた出力は全体を弾く。その判断は決定論の幾何検証で裏を取る。
// 実効信頼度の式は未決（D-02 C2）のため、ここでは作らない。二段閾値は仮置き（G10）で、この関数には持たせない。
import { z } from 'zod'
import type { Point } from '../geom/viewport'

export const KINDS = ['wall', 'column', 'beam', 'opening', 'grid', 'room', 'other'] as const
export type Kind = (typeof KINDS)[number]

const ClassifierOutputSchema = z.array(
  z.object({
    segment_id: z.string().min(1),
    kind: z.enum(KINDS),
    confidence: z.number().min(0).max(1),
  }),
)

// Claude の出力を検証する。外れた種別・範囲外の確信度は全体を弾く（C12）。
export function parseClassifierOutput(raw: unknown): z.infer<typeof ClassifierOutputSchema> {
  return ClassifierOutputSchema.parse(raw)
}

export interface SegmentForCheck {
  a: Point
  b: Point
  /** 曲線なら true（直交は見ない。G8） */
  curved?: boolean
}

const ORTHO_TOLERANCE_DEG = 3

// 直線の線分が、最も近い軸（X・Y）と ±3° 以内なら合格。曲線は対象外（null）。
export function checkOrthogonal(seg: SegmentForCheck): { pass: boolean; angleDeg: number } | null {
  if (seg.curved) return null
  const dx = Math.abs(seg.b.x - seg.a.x)
  const dy = Math.abs(seg.b.y - seg.a.y)
  const angleDeg = (Math.atan2(Math.min(dx, dy), Math.max(dx, dy)) * 180) / Math.PI
  return { pass: angleDeg <= ORTHO_TOLERANCE_DEG, angleDeg }
}

// T-03 の結果: 幾何検証が不合格なら「要確認」、合格なら「適合」。曲線は直交を見ないので「適合」。
export function judgeSegment(seg: SegmentForCheck): '適合' | '要確認' {
  const r = checkOrthogonal(seg)
  if (r === null) return '適合'
  return r.pass ? '適合' : '要確認'
}
