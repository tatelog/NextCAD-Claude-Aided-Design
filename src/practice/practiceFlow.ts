// 練習の照合（ハブ A-03 G11）。画面で描いた線（px）を mm に直し、短すぎる線を捨て、正解と照合して記録にする。決定論。
// 練習の線は作業ログ（T-06）に残さず、W1 も呼ばない。
import { mmScaleOf, pxToMm, truthLinesOfCase, type PracticeCase } from './caseTruth'
import { practiceRecordOf, type PracticeRecord } from './resultRecord'
import type { MatchLine } from '../plan/practiceMatch'

/** これより短い線は、誤って触っただけとして捨てる（mm） */
export const MIN_STROKE_MM = 200

export interface PxStroke {
  a: { x: number; y: number }
  b: { x: number; y: number }
}

/** 描いた線（px）を mm にし、短すぎる線を捨てる。scale は mm/px */
export function drawnLinesFromPx(strokes: readonly PxStroke[], scale: number, minMm: number = MIN_STROKE_MM): MatchLine[] {
  return strokes
    .map((s) => ({ a: pxToMm(s.a, scale), b: pxToMm(s.b, scale) }))
    .filter((l) => Math.hypot(l.b.x - l.a.x, l.b.y - l.a.y) >= minMm)
}

/** 案の上に描いた線を、正解と照合して記録にする。svgWidthPx は表示の幅（px） */
export function scoreDrawing(c: PracticeCase, strokes: readonly PxStroke[], svgWidthPx: number, tolMm?: number): PracticeRecord {
  const drawn = drawnLinesFromPx(strokes, mmScaleOf(c, svgWidthPx))
  return practiceRecordOf(c.id, truthLinesOfCase(c), drawn, tolMm)
}
