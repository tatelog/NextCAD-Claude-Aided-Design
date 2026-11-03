// 令 136 条の 2 の号ごとの、構造・性能の項目（ハブ A-03 G28）。部材の耐火性能の入力は、この app には無いので、どの項目も「判定不能」。決定論。
// 根拠: 建築基準法施行令 第 136 条の 2 第 1 項（e-Gov、325CO0000000338、2026-11-04 に本文を確認。項目の名前は要約に基づく）。

import type { FireClass } from './fireZoneClass'

export interface StructureItem {
  /** 項目の名前（号の中の、イ・ロなど） */
  label: string
  /** 判定の状態。部材の性能の入力が無いので、今は常に「判定不能」 */
  status: '判定不能'
}

const ITEM_A: StructureItem = { label: 'イ: 他の条（第 107 条・第 108 条の 4 など）の基準に適合する（耐火性能）', status: '判定不能' }
const ITEM_B: StructureItem = { label: 'ロ: 延焼防止時間が、イの基準の場合の時間以上（代替の方法）', status: '判定不能' }
const ITEM_OPENING: StructureItem = { label: '外壁の開口部の設備: 加熱開始後 20 分間、火炎を出さない（第三号イ）', status: '判定不能' }
const ITEM_FENCE: StructureItem = { label: '延焼防止上支障のない構造（第五号）', status: '判定不能' }

/** 号ごとの項目。対象外は空 */
export function fireStructureItems(cls: FireClass): StructureItem[] {
  if (cls === '対象外') return []
  if (cls === '第五号') return [ITEM_FENCE]
  if (cls === '第三号') return [ITEM_A, ITEM_B, ITEM_OPENING]
  return [ITEM_A, ITEM_B]
}
