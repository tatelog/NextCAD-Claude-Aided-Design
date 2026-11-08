// 図面のオブジェクトの表（ハブ A-03 G48・G58・G75、D-03「オブジェクト」）。住戸と共用部はグループ（kind を持たない入れ物）。
// 中身は親（parent_id）で持つ。住戸の中身（部屋・PS・置いた什器）は住戸の子、共用部の中身（廊下・コア・EPS・DS）は共用部の子。
// 自動作成の結果と什器から作る。決定論。画面の表示は変えない（表の形だけ）。
import type { Point } from '../geom/viewport'
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
  columns?: readonly Point[]
  /** 住戸の区画（住戸は一行のグループ） */
  cells: readonly Rect[]
  /** 部屋（ID は住戸の ID で始まる） */
  rooms: readonly Room[]
  /** 縦シャフト（PS は住戸の子、EPS と DS は共用部の子） */
  shafts: readonly ShaftRect[]
  /** コア（階段・EV ホール）。共用部の子 */
  cores: readonly ObjectCore[]
  /** 廊下（共用部の子）。ツインは 2 本。無ければ空 */
  corridors: readonly Rect[]
  /** 外形（閉じた輪郭の頂点列）。3 点未満・閉じていないときは null。外形の行は 1 つ */
  outline?: readonly Point[] | null
  /** 仮の筆界（敷地）の行を持つか（P2 の仮の筆界）。G78 の左の一覧の件数に使う */
  siteBoundary?: boolean
  /** 通り芯の位置（mm）。位置ごとに一行（kind は通り芯） */
  gridLines?: readonly number[]
  /** 置いた什器。住戸に置いたものは住戸の子、区画の無いものは親なし */
  fixtures: readonly Fixture[]
}

/** 何も入っていない入力（P2 のように一部だけ使う画面で、足りない種類を空にする） */
export function emptyObjectTableInput(): ObjectTableInput {
  return { cells: [], rooms: [], shafts: [], cores: [], corridors: [], outline: null, siteBoundary: false, gridLines: [], fixtures: [] }
}

export interface ObjectRow {
  id: string
  /** グループ（住戸・共用部）は 'group'。床版は 'slab'（ハブ A-03 G92。線の種類 Kind には入れない）。それ以外は G13 の種類（その他は属性で区別） */
  kind: 'group' | Kind | 'slab'
  attr: string | null
  name: string
  /** 親の行の ID（グループ・親なしは null）。表の中の行を必ず指す */
  parent_id: string | null
  /** 集計列（G129）: 面積（m²）。住戸・部屋・廊下・コア・縦シャフトだけ。それ以外は null。objectTableOf は必ず入れる（外から作る行は省略してよい） */
  area_m2?: number | null
  /** 集計列（G129）: 数量。置いた什器は 1。それ以外は null。objectTableOf は必ず入れる（外から作る行は省略してよい） */
  quantity?: number | null
}

/** 矩形の面積（m²）。入力は mm */
function areaM2(r: { x0: number; y0: number; x1: number; y1: number }): number {
  return ((r.x1 - r.x0) * (r.y1 - r.y0)) / 1_000_000
}

const COMMON_ID = 'common'
const CORE_NAMES: Record<string, string> = { stairA: '階段 A', stairB: '階段 B', evHall: 'EV ホール' }

export function objectTableOf(input: ObjectTableInput): ObjectRow[] {
  const unitIds = new Set(input.cells.map((c) => c.id))
  const hasCommon = input.corridors.length > 0 || input.cores.length > 0 || input.shafts.some((s) => s.unitId === undefined)
  const rows: ObjectRow[] = input.cells.map((c) => ({ id: c.id, kind: 'group', attr: '住戸', name: c.id, parent_id: null, area_m2: areaM2(c), quantity: null }))
  if (hasCommon) rows.push({ id: COMMON_ID, kind: 'group', attr: '共用部', name: '共用部', parent_id: null, area_m2: null, quantity: null })
  for (const r of input.rooms) {
    const unit = input.cells.find((c) => r.id.startsWith(c.id + '-'))
    rows.push({ id: r.id, kind: 'room', attr: null, name: r.kind, parent_id: unit ? unit.id : null, area_m2: areaM2(r), quantity: null })
  }
  for (const s of input.shafts) {
    const parent = s.unitId !== undefined && unitIds.has(s.unitId) ? s.unitId : s.unitId === undefined ? COMMON_ID : null
    rows.push({ id: s.id, kind: 'other', attr: s.kind, name: s.kind, parent_id: parent, area_m2: areaM2(s), quantity: null })
  }
  for (const c of input.corridors) rows.push({ id: c.id, kind: 'other', attr: '廊下', name: '廊下', parent_id: COMMON_ID, area_m2: areaM2(c), quantity: null })
  for (const c of input.cores) rows.push({ id: c.id, kind: 'other', attr: 'コア', name: CORE_NAMES[c.id] ?? c.id, parent_id: COMMON_ID, area_m2: areaM2(c), quantity: null })
  // 外形・仮の筆界・通り芯は、左の一覧の件数に使う（G78）。外形は 3 点以上の輪郭だけ
  if (input.outline && input.outline.length >= 3) rows.push({ id: 'outline', kind: 'other', attr: '外形', name: '外形', parent_id: null, area_m2: null, quantity: null })
  if (input.siteBoundary) rows.push({ id: 'parcel', kind: 'other', attr: '筆界', name: '筆界', parent_id: null, area_m2: null, quantity: null })
  ;(input.gridLines ?? []).forEach((_, i) => rows.push({ id: `grid-${i}`, kind: 'grid', attr: '通り芯', name: `通り芯 ${i + 1}`, parent_id: null, area_m2: null, quantity: null }))
  for(const [i,c] of (input.columns??[]).entries())rows.push({id:`column-${i}`,kind:'column',attr:'計画柱',name:`計画柱 ${i+1} (${c.x}, ${c.y})`,parent_id:null,area_m2:null,quantity:1})
  for (const f of input.fixtures) {
    const parent = f.unitId !== null && unitIds.has(f.unitId) ? f.unitId : null
    rows.push({ id: f.id, kind: FIXTURE_KIND, attr: FIXTURE_ATTRIBUTE, name: fixtureLabel(f.item), parent_id: parent, area_m2: null, quantity: 1 })
  }
  return rows
}
