// 練習の案（ハブ A-03 G11）。案の JSON の形は草案・未確定（収集セッションの報告で決め直す）。
// 案は、id・型・間口と奥行（mm）・部屋の枠（mm、左上が原点）を持つ。正解の線は部屋の枠どうしの境目から引く（plan/practiceSet）。
import { practiceLinesOfRooms, type PracticeLine } from '../plan/practiceSet'

export interface PracticeCase {
  id: string
  type: string
  /** 間口（mm） */
  widthMm: number
  /** 奥行（mm） */
  depthMm: number
  /** 部屋の枠（mm） */
  rooms: { x0: number; y0: number; x1: number; y1: number; kind?: string }[]
}

/** 案の正解の線 */
export function truthLinesOfCase(c: PracticeCase): PracticeLine[] {
  return practiceLinesOfRooms(c.rooms)
}

/** SVG の px を mm に直す縮尺（mm/px）。間口（mm）÷ SVG の幅（px） */
export function mmScaleOf(c: PracticeCase, svgWidthPx: number): number {
  return c.widthMm / svgWidthPx
}

/** px の点を mm の点にする */
export function pxToMm(p: { x: number; y: number }, scale: number): { x: number; y: number } {
  return { x: p.x * scale, y: p.y * scale }
}
