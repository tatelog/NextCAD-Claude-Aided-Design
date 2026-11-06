// 第二号様式・第三号様式の数値欄に入れる値（t31）。欄 ID は permitForms.json に従う（ゼロ埋め）。
// 値の出どころは「ボリューム」（ボリュームの値から毎回決まる）か「案件」（入力）か「公図」（筆のデータ）。
// 敷地面積は筆の面積で、公図からの参考値（測量の値で直す）。出典は「公図の参考値」。
// 簡易の扱い（未決）: 建築面積は外形の水平投影（壁の中心線）、延べ面積は容積率不算入の部分を引いていない。
import type { Point } from '../geom/viewport'
import { polygonAreaMm2 } from '../geom/polygon'
import type { Volume } from '../volume/extrude'

export interface FormValue {
  value: string
  from: 'ボリューム' | '案件' | '公図' | '公図の参考値'
}

/** 敷地面積が公図からの参考値であることの文（ビューアと空欄の一覧で同じ文。統括の依頼 2026-11-06。3） */
export const AREA_REFERENCE_NOTE = '敷地面積は公図からの参考値。測量の値で直す'

const m2 = (mm2: number) => (mm2 / 1_000_000).toFixed(2)
const m = (mm: number) => (mm / 1_000).toFixed(2)

/** 筆の平面（mm）の面積（㎡）。筆が無いときは undefined */
export function siteAreaM2Of(lot: readonly Point[] | null): number | undefined {
  if (lot === null || lot.length < 3) return undefined
  return polygonAreaMm2(lot) / 1_000_000
}

export function formValuesFromVolume(
  volume: Volume,
  project: { structure: string; siteAreaM2?: number; chiban?: string },
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
  // 第二号様式 第四面（建築物別概要）
  v['F2-4-04'] = cas(project.structure)
  v['F2-4-08'] = vol(String(volume.storey_count))
  v['F2-4-09.最高の高さ'] = vol(m(volume.total_height))
  v['F2-4-12'] = vol(m2(volume.gross_floor_area_mm2))
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
  return v
}
