// Claude の変更を図面に入れる（ハブ A-03 G97・G14、統括の依頼 t55）。変更は店舗（階数・階高・意味づけ）に、その場で入る。
// 変更の前の状態（ChangeSnapshot）を返すので、それを戻せば Undo になる。線の追加などは Worker の配備後に足す。決定論。
import { useDrawing } from '../store/drawing'
import { useSemantic } from '../store/semantic'
import { kindName, type Assignment } from '../plan/semanticConfirm'
import { addNumericLine } from '../input/numericLine'
import { parsePriceCsv, serializePriceCsv } from '../estimate/priceCsv'
import { changedRowsOf, usePriceTable } from '../store/priceTable'
import type { Change } from './claudeReply'

/** 変更の前の図面の状態（Undo に使う）。線（entries）も戻す（G143。一指示＝一 Undo） */
export interface ChangeSnapshot {
  storeyCount: number
  storeyHeightMm: number
  assignments: Record<string, Assignment>
  entries: ReturnType<typeof useDrawing.getState>['entries']
  /** 単価表の CSV（積算の操作を戻すため） */
  csv: string
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
  return {
    storeyCount: d.storeyCount,
    storeyHeightMm: d.storeyHeightMm,
    assignments: useSemantic.getState().assignments,
    entries: d.entries,
    csv: usePriceTable.getState().csv,
  }
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
    case 'addLine':
      return `線を ${c.lengthMm} mm 足す（始点 ${c.start.x}, ${c.start.y}、角度 ${c.angleDeg}°）`
    case 'setUnitPrice':
      return `単価 ${c.id} を ${c.unit_price} 円にする（印を残す）`
    case 'setFactor':
      return `歩掛 ${c.id} を ${c.factor} にする（印を残す）`
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
      case 'addLine':
        addNumericLine(c.start, c.lengthMm, c.angleDeg)
        summary.push(text)
        break
      case 'setUnitPrice':
      case 'setFactor': {
        // 単価・歩掛の変更（印を残す）。無い行は反映せず、スキップとして返す
        const patch = c.op === 'setUnitPrice' ? { unit_price: c.unit_price } : { factor: c.factor }
        const next = changedRowsOf(parsePriceCsv(usePriceTable.getState().csv), c.id, patch)
        if (next === null) {
          skipped.push(text)
          break
        }
        usePriceTable.getState().setCsv(serializePriceCsv(next))
        summary.push(text)
        break
      }
    }
  }
  return { before, summary, skipped }
}

/** 変更の前の状態に戻す（Undo）。一つの指示の操作列は、この一回で戻る（G143） */
export function restoreSnapshot(s: ChangeSnapshot): void {
  useDrawing.setState({ storeyCount: s.storeyCount, storeyHeightMm: s.storeyHeightMm, entries: s.entries })
  useSemantic.setState({ assignments: s.assignments })
  usePriceTable.getState().setCsv(s.csv)
}
