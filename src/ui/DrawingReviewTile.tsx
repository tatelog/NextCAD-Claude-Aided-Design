// 候補の確認欄（ハブ A-03 G124「間に合わせる」。設計グリル 2026-11-05）。Drawing の右メニューに出す。
// 中身は意味づけの確認（SemanticConfirm）と同じ欄の形。描いた線（F5・F9）の候補を、人が種類を選んで確定する。
// 判定（Claude）は未接続（t15）。ここでは判定を呼ばない。
import { useMemo } from 'react'
import { confirmRows } from '../plan/semanticConfirm'
import { useDrawing } from '../store/drawing'
import { useSemantic } from '../store/semantic'
import { SemanticConfirm } from './SemanticConfirm'

export function DrawingReviewTile() {
  const entries = useDrawing((s) => s.entries)
  const assignments = useSemantic((s) => s.assignments)
  const setKind = useSemantic((s) => s.setKind)
  const clearKind = useSemantic((s) => s.clearKind)
  const rows = useMemo(() => confirmRows(entries.flatMap((e) => e.segments), assignments), [entries, assignments])
  return (
    <SemanticConfirm
      legend="候補の確認（Drawing）"
      rows={rows}
      onSelectKind={(id, kind) => (kind === null ? clearKind(id) : setKind(id, kind))}
      onConfirm={setKind}
    />
  )
}
