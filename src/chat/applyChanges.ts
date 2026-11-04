// Claude の変更を図面に入れる（ハブ A-03 G97・G14、統括の依頼 t55）。変更は店舗（階数・階高・意味づけ）に、その場で入る。
// 変更の前の状態（ChangeSnapshot）を返すので、それを戻せば Undo になる。線の追加などは Worker の配備後に足す。決定論。
import { useDrawing } from '../store/drawing'
import { useSemantic } from '../store/semantic'
import { kindName, type Assignment } from '../plan/semanticConfirm'
import type { Change } from './claudeReply'

/** 変更の前の図面の状態（Undo に使う） */
export interface ChangeSnapshot {
  storeyCount: number
  storeyHeightMm: number
  assignments: Record<string, Assignment>
}

export interface AppliedBatch {
  /** 変更の前の状態。これで戻せる */
  before: ChangeSnapshot
  /** 反映した変更の説明 */
  summary: string[]
  /** 図面に無い線などで反映しなかった変更の説明 */
  skipped: string[]
}

export function snapshotOfState(): ChangeSnapshot {
  const d = useDrawing.getState()
  return { storeyCount: d.storeyCount, storeyHeightMm: d.storeyHeightMm, assignments: useSemantic.getState().assignments }
}

/** 変更の説明（人が読める文。右側でまとめて確認する。G14） */
export function describeChange(c: Change): string {
  switch (c.op) {
    case 'setStoreyCount':
      return `階数を ${c.count} にする`
    case 'setStoreyHeight':
      return `階高を ${c.mm} mm にする`
    case 'setKind':
      return `線 ${c.segmentId} の種類を ${kindName(c.kind)} にする`
  }
}

function hasSegment(segmentId: string): boolean {
  return useDrawing.getState().entries.some((e) => e.segments.some((s) => s.id === segmentId))
}

/** 変更を、図面の店舗に入れる。図面に無い線への変更はスキップする */
export function applyChangeBatch(changes: readonly Change[]): AppliedBatch {
  const before = snapshotOfState()
  const summary: string[] = []
  const skipped: string[] = []
  for (const c of changes) {
    const text = describeChange(c)
    switch (c.op) {
      case 'setStoreyCount':
        useDrawing.getState().setStoreyCount(c.count)
        summary.push(text)
        break
      case 'setStoreyHeight':
        useDrawing.getState().setStoreyHeightMm(c.mm)
        summary.push(text)
        break
      case 'setKind':
        if (hasSegment(c.segmentId)) {
          useSemantic.getState().setKind(c.segmentId, c.kind)
          summary.push(text)
        } else {
          skipped.push(text)
        }
        break
    }
  }
  return { before, summary, skipped }
}

/** 変更の前の状態に戻す（Undo） */
export function restoreSnapshot(s: ChangeSnapshot): void {
  useDrawing.setState({ storeyCount: s.storeyCount, storeyHeightMm: s.storeyHeightMm })
  useSemantic.setState({ assignments: s.assignments })
}
