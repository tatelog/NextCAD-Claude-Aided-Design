// 意味づけの店舗（ハブ A-03 G13・G14・G65、D-04 共通部品「意味づけの結果表示」「要確認の修正」）。
// 線（Segment）の id ごとに、種類（KINDS のどれか）・状態（確定・要確認）・誰が（人・Claude）を持つ。
// 種類を持つ線だけが入る。種類を持たない線は「未分類」で、ここには無い。
// 判定（Claude）は未接続。種類は人が選ぶので、誰が は 'human' だけ。値は保存しない（画面の中だけ）。
// 線が動いたときの要確認の印は drawing の transform が付ける（G65 の既定。仮置き。再判定は Worker の配備後）。
import { create } from 'zustand'
import type { Kind } from '../plan/semantic'
import type { Assignment } from '../plan/semanticConfirm'
import { reviewStatusOf } from '../plan/reviewThreshold'

export interface SemanticState {
  /** 線の id → 意味づけ。種類を持つ線だけが入る */
  assignments: Record<string, Assignment>
  /** 人が種類を選ぶ。その線は「選んだ種類・確定・人」になる。要確認の線に同じ種類を選べば、種類は変わらず確定になる */
  setKind: (segmentId: string, kind: Kind) => void
  /** その線の種類を消す（未分類に戻す）。種類を持たない線には何も起きない */
  clearKind: (segmentId: string) => void
  /** 要確認の印を付ける。種類を持つ線だけに付き、種類と誰がは変えない。種類を持たない線には何も作らない */
  markNeedsReview: (segmentIds: readonly string[]) => void
  /** Claude の提案。要確認の Claude の割り当てとして入れる。人が確定した線は上書きしない（G14） */
  suggest: (segmentId: string, kind: Kind, confidence: number) => void
  /** 全部消す */
  clear: () => void
}

export const useSemantic = create<SemanticState>((set) => ({
  assignments: {},
  setKind: (segmentId, kind) =>
    set((s) => ({ assignments: { ...s.assignments, [segmentId]: { kind, status: 'confirmed', by: 'human' } } })),
  clearKind: (segmentId) =>
    set((s) => {
      if (!(segmentId in s.assignments)) return s
      const next = { ...s.assignments }
      delete next[segmentId]
      return { assignments: next }
    }),
  markNeedsReview: (segmentIds) =>
    set((s) => {
      const next = { ...s.assignments }
      let marked = false
      for (const id of segmentIds) {
        const a = next[id]
        if (a === undefined) continue
        next[id] = { ...a, status: 'needs_review' }
        marked = true
      }
      return marked ? { assignments: next } : s
    }),
  suggest: (segmentId, kind, confidence) =>
    set((s) => {
      const current = s.assignments[segmentId]
      if (current !== undefined && current.by === 'human') return s
      return { assignments: { ...s.assignments, [segmentId]: { kind, status: reviewStatusOf(confidence), by: 'claude' } } }
    }),
  clear: () => set({ assignments: {} }),
}))
