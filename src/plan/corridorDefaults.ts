// 廊下幅の既定（ハブ A-03 G135。統括の依頼 2026-11-05）。中廊下 1,600 mm、片廊下 1,200 mm の仮置き。
// 出典は A-07 で確認する。provisional の印は、値を仮置きから出典のある値に替えるまで残す（G22 と同じ扱い）。
// 階段室・ツインは、この決定の対象外（既定を持たない）。
import type { CorridorLayout } from './candidateCells'

export interface CorridorDefault {
  mm: number
  /** 出典のない仮置きの値。画面に未確定の印を付ける */
  provisional: true
}

const DEFAULTS: Partial<Record<CorridorLayout, CorridorDefault>> = {
  中廊下: { mm: 1600, provisional: true },
  片廊下: { mm: 1200, provisional: true },
}

/** 廊下の層に対する既定の廊下幅（mm）。既定を持たない層は null */
export function corridorDefaultOf(layout: CorridorLayout): CorridorDefault | null {
  return DEFAULTS[layout] ?? null
}
