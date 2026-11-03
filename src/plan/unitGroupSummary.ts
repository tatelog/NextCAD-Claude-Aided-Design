// 左の一覧の住戸グループの数（ハブ A-03 G58）。オブジェクト表（objectTable）の行から、住戸の数と、住戸の中身（部屋・PS・置いた什器）の数を出す。決定論。
import type { ObjectRow } from './objectTable'

export interface UnitGroupSummary {
  /** 住戸の数（親なしの住戸グループ） */
  units: number
  /** 住戸の中の部屋の数 */
  rooms: number
  /** 住戸の中の PS の数 */
  shafts: number
  /** 住戸に置いた什器の数 */
  fixtures: number
}

export function unitGroupSummary(rows: readonly ObjectRow[]): UnitGroupSummary {
  const units = new Set(rows.filter((r) => r.attr === '住戸' && r.parent_id === null).map((r) => r.id))
  const inUnit = rows.filter((r) => r.parent_id !== null && units.has(r.parent_id))
  return {
    units: units.size,
    rooms: inUnit.filter((r) => r.kind === 'room').length,
    shafts: inUnit.filter((r) => r.attr === 'PS').length,
    fixtures: inUnit.filter((r) => r.attr === '什器').length,
  }
}
