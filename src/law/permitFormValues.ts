// 第二号様式・第三号様式の数値欄に入れる値（t31）。欄 ID は permitForms.json に従う（ゼロ埋め）。
// 値の出どころは「ボリューム」（ボリュームの値から毎回決まる）か「案件」（入力）か「公図」（筆のデータ）。
// 敷地面積は筆の面積で、公図からの参考値（測量の値で直す）。出典は「公図の参考値」。
// 簡易の扱い（未決）: 建築面積は外形の水平投影（壁の中心線）、延べ面積は容積率不算入の部分を引いていない。
import type { Point } from '../geom/viewport'
import { polygonAreaMm2 } from '../geom/polygon'
import type { Volume } from '../volume/extrude'
import type { RoadWidthSource } from '../volume/roadWidthSource'

export interface FormValue {
  value: string
  /** 出典。幅員は、出どころの名前（数値指定・対岸指定・資料指定）がそのまま出典になる */
  from: 'ボリューム' | '案件' | '公図' | '公図の参考値' | '法規' | RoadWidthSource
}

/** 第五面（用途別床面積）の未決の点（空欄の一覧に出す）。記号の表の出どころと、階ごとに 1 枚（注②）の枚数が決まるまで */
export const FIFTH_OPEN_NOTE = '第五面：用途の区分の記号は空欄（記号の表が未決）。階ごとに 1 枚（注②）の枚数は未決'

/** 新築として、申請部分と合計に同じ値を書いたことの一行（空欄の一覧に出す。統括の判断 2026-11-06） */
export const NEW_BUILDING_NOTE = '新築として申請部分＝合計で記入'

/** 敷地面積が公図からの参考値であることの文（ビューアと空欄の一覧で同じ文。統括の依頼 2026-11-06。3） */
export const AREA_REFERENCE_NOTE = '敷地面積は公図からの参考値。測量の値で直す'

const m2 = (mm2: number) => (mm2 / 1_000_000).toFixed(2)
const m = (mm: number) => (mm / 1_000).toFixed(2)

/** 筆の平面（mm）の面積（㎡）。筆が無いときは undefined */
export function siteAreaM2Of(lot: readonly Point[] | null): number | undefined {
  if (lot === null || lot.length < 3) return undefined
  return polygonAreaMm2(lot) / 1_000_000
}

/** 構造の記号を、様式に書く文字にする（造の前に入る。統括の依頼 2026-11-06。6）。知らない記号はそのまま */
export function structureLabelOf(structure: string): string {
  return structure === 'RC' ? '鉄筋コンクリート' : structure
}

/** 敷地と接している部分の長さ（m）。前面道路の辺（roadEdge。範囲を超えたら最後の辺）の長さ。敷地が無ければ undefined（統括の依頼 2026-11-06。5） */
export function frontEdgeLengthM(lot: readonly Point[], roadEdge: number): number | undefined {
  const n = lot.length
  if (n < 2) return undefined
  const i = Math.min(n - 1, Math.max(0, Math.floor(roadEdge)))
  const a = lot[i]!
  const b = lot[(i + 1) % n]!
  return Math.hypot(b.x - a.x, b.y - a.y) / 1_000
}

/** 防火の区分（□の語）。区分 24 は防火地域、25 は準防火地域（防火が優先）。地域が無く、管理者不明の防火地域も無いときは指定なし。取れていない・不明があるときは null（統括の依頼 2026-11-06。4） */
export function fireLabelOf(fire: { functions: readonly (number | null)[]; unknownOwner: number } | null): string | null {
  if (fire === null) return null
  if (fire.functions.includes(24)) return '防火地域'
  if (fire.functions.includes(25)) return '準防火地域'
  return fire.unknownOwner > 0 ? null : '指定なし'
}

export function formValuesFromVolume(
  volume: Volume,
  project: {
    structure: string
    siteAreaM2?: number
    chiban?: string
    fire?: string
    frontRoadLengthM?: number
    /** 前面道路の幅員（mm）と出どころ。0 mm は未入力 */
    frontRoadWidth?: { mm: number; source: RoadWidthSource }
    /** 用途（共同住宅）。案件の入力 */
    usage?: string
  },
): Record<string, FormValue> {
  const vol = (value: string): FormValue => ({ value, from: 'ボリューム' })
  const cas = (value: string): FormValue => ({ value, from: '案件' })
  const v: Record<string, FormValue> = {}

  // 第二号様式 第三面（建築物及びその敷地）
  v['F2-3-10'] = vol(m2(volume.building_area_mm2))
  v['F2-3-11'] = vol(m2(volume.gross_floor_area_mm2))
  v['F2-3-12'] = vol('1')
  v['F2-3-13.最高の高さ'] = vol(m(volume.total_height))
  v['F2-3-13.階数（地上）'] = vol(String(volume.storey_count))
  v['F2-3-13.構造'] = cas(structureLabelOf(project.structure))
  v['F2-6-03.構造'] = cas(structureLabelOf(project.structure))
  // 第二号様式 第四面（建築物別概要）
  v['F2-4-04'] = cas(structureLabelOf(project.structure))
  v['F2-4-08'] = vol(String(volume.storey_count))
  v['F2-4-09.最高の高さ'] = vol(m(volume.total_height))
  v['F2-4-12'] = vol(m2(volume.gross_floor_area_mm2))
  // 各階の床面積（階ごと。箱の形なので、各階は建築面積と同じ。階の番号は欄の id の中の数）
  for (let f = 1; f <= volume.storey_count; f++) v[`F2-4-12.階別${f}`] = vol(m2(volume.building_area_mm2))
  // 用途別床面積（第五面）: 共同住宅の行の床面積（3 番目）は、その階の床面積（箱の形なので建築面積）。延べ床面積（第四面の 12 欄の合計）ではない。用途は案件の入力（下で入れる）
  v['F2-5-07.床面積'] = vol(m2(volume.building_area_mm2))
  // 第二号様式 第六面（建築物独立部分別概要）
  v['F2-6-01'] = vol('1')
  v['F2-6-02'] = vol(m2(volume.gross_floor_area_mm2))
  v['F2-6-03.最高の高さ'] = vol(m(volume.total_height))
  // 第三号様式 第二面（建築物及びその敷地）
  v['F3-2-10'] = vol(m2(volume.building_area_mm2))
  v['F3-2-11'] = vol(m2(volume.gross_floor_area_mm2))
  v['F3-2-12'] = vol('1')
  v['F3-2-13.最高の高さ'] = vol(m(volume.total_height))

  // 地名地番（筆のデータ。筆が無いときは入らない）
  if (project.chiban !== undefined) v['F2-3-01'] = { value: project.chiban, from: '公図' }
  // 敷地面積は、ボリュームからは取らない。筆の面積（参考値）を、イ（列 1）とホ（合計）に入れる
  if (project.siteAreaM2 !== undefined) {
    const area: FormValue = { value: project.siteAreaM2.toFixed(2), from: '公図の参考値' }
    v['F2-3-07.敷地面積'] = area
    v['F2-3-07.敷地面積の合計'] = area
  }
  // 用途（案件の入力。共同住宅）
  if (project.usage !== undefined) v['F2-5-07.用途'] = cas(project.usage)
  // 防火地域（筆の地点の法規。取れたときだけ）。接する部分の長さ（前面道路の辺。公図の辺）
  if (project.fire !== undefined) v['F2-3-04'] = { value: project.fire, from: '法規' }
  if (project.frontRoadLengthM !== undefined) v['F2-3-06.敷地と接している部分の長さ'] = { value: project.frontRoadLengthM.toFixed(2), from: '公図' }
  // 前面道路の幅員（mm → m。出典は出どころの名前）
  if (project.frontRoadWidth !== undefined && project.frontRoadWidth.mm > 0) {
    v['F2-3-06.幅員'] = { value: (project.frontRoadWidth.mm / 1_000).toFixed(2), from: project.frontRoadWidth.source }
  }
  return v
}
