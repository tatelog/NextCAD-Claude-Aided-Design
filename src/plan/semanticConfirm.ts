// P3 の右に出す「意味づけの確認」の純粋な計算（ハブ A-03 G9・G13・G14・G65、D-04 共通部品「意味づけの結果表示」「要確認の修正」）。
// 画面にも店舗にも依存しない。確認欄の行を作り、状態ごとに数え、つまみや回転で動いた線を見つける。
// 判定（Claude）は未接続。種類は人が選ぶ。割り当て（種類・状態・誰が）は店舗（store/semantic）が持ち、型だけここで決める。
import type { Segment, Stage } from '../model/schema'
import type { Kind } from './semantic'

/** 割り当ての状態。確定は人が選んだか確認したもの。要確認は、線が動いたため見直しが要るもの（G65 の既定。仮置き） */
export type AssignmentStatus = 'confirmed' | 'needs_review'
/** 誰が付けたか。Claude の判定は未接続のため、いまは 'human' だけが入る */
export type AssignedBy = 'human' | 'claude'

/** 線 1 本の意味づけ。線の id ごとに店舗が持つ */
export interface Assignment {
  kind: Kind
  status: AssignmentStatus
  by: AssignedBy
}

/** 確認欄の行の状態。割り当ての無い線は unclassified（未分類） */
export type ConfirmStatus = 'unclassified' | AssignmentStatus

export interface ConfirmRow {
  /** 線（Segment）の id */
  id: string
  /** 種類。無ければ null（select の値に使う） */
  kind: Kind | null
  /** 種類の日本語の名前。種類が無ければ「未分類」 */
  kindName: string
  status: ConfirmStatus
}

const KIND_NAMES: Record<Kind, string> = {
  wall: '壁',
  column: '柱',
  beam: '梁',
  opening: '開口',
  grid: '通り芯',
  room: '部屋',
  other: 'その他',
}

/** 種類が無い線の、種類の名前でもあり、状態の名前でもある */
const UNCLASSIFIED_NAME = '未分類'

const STATUS_NAMES: Record<ConfirmStatus, string> = {
  unclassified: UNCLASSIFIED_NAME,
  needs_review: '要確認',
  confirmed: '確定',
}

export function kindName(kind: Kind): string {
  return KIND_NAMES[kind]
}

export function statusName(status: ConfirmStatus): string {
  return STATUS_NAMES[status]
}

/** 判定の対象（G9）。F5（柱割り）と F9（間取り）の線。F4（外形）の線は対象外 */
const TARGET_STAGES: ReadonlySet<Stage> = new Set<Stage>(['F5', 'F9'])

/** 確認欄の行。対象の線だけを、線の並びのまま。割り当ての無い線は「未分類」 */
export function confirmRows(
  segments: readonly Pick<Segment, 'id' | 'stage'>[],
  assignments: Readonly<Record<string, Assignment>>,
): ConfirmRow[] {
  const rows: ConfirmRow[] = []
  for (const s of segments) {
    if (!TARGET_STAGES.has(s.stage)) continue
    const a = assignments[s.id]
    rows.push(
      a === undefined
        ? { id: s.id, kind: null, kindName: UNCLASSIFIED_NAME, status: 'unclassified' }
        : { id: s.id, kind: a.kind, kindName: kindName(a.kind), status: a.status },
    )
  }
  return rows
}

/** 状態ごとの行数。3 つの状態のキーを常に持つ */
export function countByStatus(rows: readonly Pick<ConfirmRow, 'status'>[]): Record<ConfirmStatus, number> {
  const n: Record<ConfirmStatus, number> = { unclassified: 0, needs_review: 0, confirmed: 0 }
  for (const r of rows) n[r.status] += 1
  return n
}

type MovedFields = Pick<Segment, 'id' | 'x1' | 'y1' | 'x2' | 'y2' | 'revision'>

/**
 * 動いた線の id（G65）。前後で同じ id の線のうち、座標（x1・y1・x2・y2）または revision が変わったもの。
 * 新しく増えた線と消えた線は含めない。ほかの項目（stage・snap など）だけの変化は見ない。after の並び。
 */
export function movedSegmentIds(before: readonly MovedFields[], after: readonly MovedFields[]): string[] {
  const prev = new Map(before.map((s) => [s.id, s]))
  const moved: string[] = []
  for (const s of after) {
    const p = prev.get(s.id)
    if (p === undefined) continue
    if (p.x1 !== s.x1 || p.y1 !== s.y1 || p.x2 !== s.x2 || p.y2 !== s.y2 || p.revision !== s.revision) moved.push(s.id)
  }
  return moved
}
