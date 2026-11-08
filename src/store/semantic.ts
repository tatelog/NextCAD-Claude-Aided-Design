// 意味づけの店舗（ハブ A-03 G13・G14・G65、D-04 共通部品「意味づけの結果表示」「要確認の修正」）。
// 線（Segment）の id ごとに、種類（KINDS のどれか）・状態（確定・要確認）・誰が（人・Claude）を持つ。
// 種類を持つ線だけが入る。種類を持たない線は「未分類」で、ここには無い。
// 判定（Claude）は未接続。種類は人が選ぶので、誰が は 'human' だけ。値は保存しない（画面の中だけ）。
// 線が動いたときの要確認の印は drawing の transform が付ける（G65 の既定。仮置き。再判定は Worker の配備後）。
import { create } from 'zustand'
import type { Kind } from '../plan/semantic'
import type { Assignment } from '../plan/semanticConfirm'
import { confidenceBandOf } from '../plan/confidenceBand'
import { recordWorkLog } from '../app/workLogStore'

/** 判定の一回分の戻し方。変えた線ごとに、判定の前の値と判定で入れた後の値を持つ（後から人が変えた線を残すため） */
export interface JudgementUndo {
  changed: { id: string; before: Assignment | undefined; after: Assignment }[]
}

export interface SemanticState {
  /** 線の id → 意味づけ。種類を持つ線だけが入る */
  assignments: Record<string, Assignment>
  /** 直前の判定の一回分（戻せる状態のときだけ） */
  judgementUndo: JudgementUndo | null
  /** 人が種類を選ぶ。その線は「選んだ種類・確定・人」になる。要確認の線に同じ種類を選べば、種類は変わらず確定になる */
  setKind: (segmentId: string, kind: Kind) => void
  /** その線の種類を消す（未分類に戻す）。種類を持たない線には何も起きない */
  clearKind: (segmentId: string) => void
  /** 要確認の印を付ける。種類を持つ線だけに付き、種類と誰がは変えない。種類を持たない線には何も作らない */
  markNeedsReview: (segmentIds: readonly string[]) => void
  /** Claude の提案。要確認の Claude の割り当てとして入れる。人が確定した線は上書きしない（G14） */
  suggest: (segmentId: string, kind: Kind, confidence: number) => void
  /**
   * Claude の判定の一回分を入れる。確定と要確認だけを入れ、人が選ぶ帯は入れない。入った線の数を返す。
   * 入れたときは作業ログに一行残し、直前の一回として戻せる状態にする（G14・G97）。
   */
  applyJudgementBatch: (items: readonly { id: string; kind: Kind; confidence: number }[], screen: string) => number
  /** 直前の判定の一回分を戻す。判定で変えた線だけを戻し、判定のあとに人が変えた線は残す。戻したら true（作業ログに残す） */
  undoJudgementBatch: (screen: string) => boolean
  /** 全部消す */
  clear: () => void
}

/** Claude の提案を一つ入れた割り当て。入らなければ同じ参照を返す（人の確定と、人が選ぶ帯は変えない） */
function withSuggestion(current: Record<string, Assignment>, id: string, kind: Kind, confidence: number): Record<string, Assignment> {
  // 0.5 未満と数でない値は、種類を入れずに人が選ぶ（D-02 の閾値の行・G82）
  const band = confidenceBandOf(confidence)
  if (band === 'human') return current
  const cur = current[id]
  if (cur !== undefined && cur.by === 'human') return current
  return { ...current, [id]: { kind, status: band === 'confirmed' ? 'confirmed' : 'needs_review', by: 'claude' } }
}

const sameAssignment = (a: Assignment | undefined, b: Assignment | undefined): boolean =>
  a !== undefined && b !== undefined && a.kind === b.kind && a.status === b.status && a.by === b.by

export const useSemantic = create<SemanticState>((set, get) => ({
  assignments: {},
  judgementUndo: null,
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
      const next = withSuggestion(s.assignments, segmentId, kind, confidence)
      return next === s.assignments ? s : { assignments: next }
    }),
  applyJudgementBatch: (items, screen) => {
    const before = get().assignments
    let next = before
    const changed: JudgementUndo['changed'] = []
    for (const it of items) {
      const updated = withSuggestion(next, it.id, it.kind, it.confidence)
      if (updated === next) continue
      next = updated
      const after = updated[it.id]!
      const at = changed.findIndex((c) => c.id === it.id)
      if (at < 0) changed.push({ id: it.id, before: before[it.id], after })
      else changed[at] = { ...changed[at]!, after }
    }
    if (changed.length === 0) return 0
    set({ assignments: next, judgementUndo: { changed } })
    recordWorkLog({ at: new Date().toISOString(), screen, action: 'Drawing の判定', target: `${changed.length} 本に提案を入れた`, who: 'Claude' })
    return changed.length
  },
  undoJudgementBatch: (screen) => {
    const u = get().judgementUndo
    if (u === null) return false
    const next = { ...get().assignments }
    for (const c of u.changed) {
      // 判定のあとに人が変えた線（入れた後の値と違う）は、そのまま残す
      if (!sameAssignment(next[c.id], c.after)) continue
      if (c.before === undefined) delete next[c.id]
      else next[c.id] = c.before
    }
    set({ assignments: next, judgementUndo: null })
    recordWorkLog({ at: new Date().toISOString(), screen, action: 'Drawing の判定を戻す', target: `${u.changed.length} 本`, who: 'Claude' })
    return true
  },
  clear: () => set({ assignments: {}, judgementUndo: null }),
}))
