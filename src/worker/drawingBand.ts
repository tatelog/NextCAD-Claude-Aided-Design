// Drawing の判定の店舗への入れ方（ハブ A-03 G82・G109・G124、t69）。帯の決め方は plan/confidenceBand.ts の一つの関数（W1 と同じ）。
import type { Kind } from '../plan/semantic'
import { useSemantic } from '../store/semantic'

/**
 * Claude の判定を店舗に入れる。人が選ぶ帯（0.5 未満・数でない値）の線には種類を入れない。
 * その判断は店舗の suggest が一つの関数で行う（W1 と同じ。G14・G109）。
 */
export function suggestDrawnSegment(segmentId: string, kind: Kind, confidence: number): void {
  useSemantic.getState().suggest(segmentId, kind, confidence)
}
