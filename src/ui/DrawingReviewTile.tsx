// 候補の確認欄（ハブ A-03 G124「間に合わせる」。設計グリル 2026-11-05）。Drawing の右メニューに出す。
// 中身は意味づけの確認（SemanticConfirm）と同じ欄の形。描いた線（F5・F9）の候補を、人が種類を選んで確定する。
// 判定（Claude）は未接続（t15）。ここでは判定を呼ばない。
import { useMemo } from 'react'
import { confirmRows } from '../plan/semanticConfirm'
import { p2Entries, useDrawing } from '../store/drawing'
import { useSemantic } from '../store/semantic'
import { SemanticConfirm } from './SemanticConfirm'

export function DrawingReviewTile() {
  const drawnAll = useDrawing((s) => s.entries)
  // 候補は P2 の線だけ（P3 の線は P3 の欄で見る）
  const entries = useMemo(() => p2Entries(drawnAll), [drawnAll])
  const assignments = useSemantic((s) => s.assignments)
  const setKind = useSemantic((s) => s.setKind)
  const clearKind = useSemantic((s) => s.clearKind)
  const rows = useMemo(() => confirmRows(entries.flatMap((e) => e.segments), assignments), [entries, assignments])
  // 直前の判定の一回分を戻す（G14・G97）。戻せる状態のときだけ出す
  const judgementUndo = useSemantic((s) => s.judgementUndo)
  const undoJudgement = useSemantic((s) => s.undoJudgementBatch)
  return (
    <>
      <SemanticConfirm
        legend="オブジェクト判定（Drawing）"
        rows={rows}
        onSelectKind={(id, kind) => (kind === null ? clearKind(id) : setKind(id, kind))}
        onConfirm={setKind}
      />
      {judgementUndo !== null ? (
        <button type="button" onClick={() => undoJudgement('P2')}>
          判定を戻す（直前の一回）
        </button>
      ) : null}
    </>
  )
}
