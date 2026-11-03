// 図面のオブジェクトの表（ハブ A-03 G48・G58・G75、D-03「オブジェクト」）。住戸と共用部はグループ（kind を持たない入れ物）。
// 中身は親（parent_id）で持つ。住戸の中身（部屋・PS・置いた什器）は住戸の子、共用部の中身（廊下・コア・EPS・DS）は共用部の子。
// 自動作成の結果と什器から作る。決定論。画面の表示は変えない（表の形だけ）。
import type { Rect } from './candidateCells'
import type { ShaftRect } from './autoPlan'
import type { Room } from './rooms'
import type { Kind } from './semantic'
import { FIXTURE_ATTRIBUTE, FIXTURE_KIND, fixtureLabel, type Fixture } from './fixtures'

/** コア（階段・EV ホール）。自動作成の結果の形 */
export interface ObjectCore {
  id: string
  x0: number
  y0: number
  x1: number
  y1: number
}

export interface ObjectTableInput {
  /** 住戸の区画（住戸は一行のグループ） */
  cells: readonly Rect[]
  /** 部屋（ID は住戸の ID で始まる） */
  rooms: readonly Room[]
  /** 縦シャフト（PS は住戸の子、EPS と DS は共用部の子） */
  shafts: readonly ShaftRect[]
  /** コア（階段・EV ホール）。共用部の子 */
  cores: readonly ObjectCore[]
  /** 廊下（共用部の子）。無ければ null */
  corridor: Rect | null
  /** 置いた什器。住戸に置いたものは住戸の子、区画の無いものは親なし */
  fixtures: readonly Fixture[]
}

export interface ObjectRow {
  id: string
  /** グループ（住戸・共用部）は 'group'。それ以外は G13 の種類（その他は属性で区別） */
  kind: 'group' | Kind
  attr: string | null
  name: string
  /** 親の行の ID（グループ・親なしは null）。表の中の行を必ず指す */
  parent_id: string | null
}

const COMMON_ID = 'common'
const CORE_NAMES: Record<string, string> = { stairA: '階段 A', stairB: '階段 B', evHall: 'EV ホール' }

export function objectTableOf(input: ObjectTableInput): ObjectRow[] {
  const unitIds = new Set(input.cells.map((c) => c.id))
  const hasCommon = input.corridor !== null || input.cores.length > 0 || input.shafts.some((s) => s.unitId === undefined)
  const rows: ObjectRow[] = input.cells.map((c) => ({ id: c.id, kind: 'group', attr: '住戸', name: c.id, parent_id: null }))
  if (hasCommon) rows.push({ id: COMMON_ID, kind: 'group', attr: '共用部', name: '共用部', parent_id: null })
  for (const r of input.rooms) {
    const unit = input.cells.find((c) => r.id.startsWith(c.id + '-'))
    rows.push({ id: r.id, kind: 'room', attr: null, name: r.kind, parent_id: unit ? unit.id : null })
  }
  for (const s of input.shafts) {
    const parent = s.unitId !== undefined && unitIds.has(s.unitId) ? s.unitId : s.unitId === undefined ? COMMON_ID : null
    rows.push({ id: s.id, kind: 'other', attr: s.kind, name: s.kind, parent_id: parent })
  }
  if (input.corridor) rows.push({ id: input.corridor.id, kind: 'other', attr: '廊下', name: '廊下', parent_id: COMMON_ID })
  for (const c of input.cores) rows.push({ id: c.id, kind: 'other', attr: 'コア', name: CORE_NAMES[c.id] ?? c.id, parent_id: COMMON_ID })
  for (const f of input.fixtures) {
    const parent = f.unitId !== null && unitIds.has(f.unitId) ? f.unitId : null
    rows.push({ id: f.id, kind: FIXTURE_KIND, attr: FIXTURE_ATTRIBUTE, name: fixtureLabel(f.item), parent_id: parent })
  }
  return rows
}
