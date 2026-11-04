// 第二号様式・第三号様式の数値欄に入れる値（t31）。欄 ID は permitForms.json に従う（ゼロ埋め）。
// 値の出どころは「ボリューム」（ボリュームの値から毎回決まる）か「案件」（入力）。
// 簡易の扱い（未決）: 建築面積は外形の水平投影（壁の中心線）、延べ面積は容積率不算入の部分を引いていない。
import type { Volume } from '../volume/extrude'

export interface FormValue {
  value: string
  from: 'ボリューム' | '案件'
}

const m2 = (mm2: number) => (mm2 / 1_000_000).toFixed(2)
const m = (mm: number) => (mm / 1_000).toFixed(2)

export function formValuesFromVolume(volume: Volume, project: { structure: string; siteAreaM2?: number }): Record<string, FormValue> {
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

  // 敷地面積はボリュームからは取らない。入力があるときだけ入る
  if (project.siteAreaM2 !== undefined) v['F2-3-07.敷地面積'] = cas(project.siteAreaM2.toFixed(2))
  return v
}
