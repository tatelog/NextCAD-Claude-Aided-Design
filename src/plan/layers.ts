// レイヤー（ハブ D-04 共通部品「レイヤー」、A-03 G66）。線分は必ずレイヤーを持ち、意味が決まると自動でそのレイヤーに入る（手で移す操作は無い）。
// 決定論の処理だけ。レイヤーの表示とロックの状態は store/layers.ts が持つ。
import type { Kind } from './semantic'
import type { Stage } from '../model/schema'

export const LAYER_NAMES = [
  '筆界',
  '外形',
  '通り芯',
  '柱',
  '梁',
  '壁',
  '開口',
  '部屋',
  'コア',
  'その他',
  '寸法',
  '日影',
  '縦シャフト',
] as const

export type LayerName = (typeof LAYER_NAMES)[number]

/** 筆界のレイヤーは、ロックを外せない（仕様 3） */
export const FIXED_LOCKED: readonly LayerName[] = ['筆界']

const LAYER_OF_KIND: Record<Kind, LayerName> = {
  wall: '壁',
  column: '柱',
  beam: '梁',
  opening: '開口',
  grid: '通り芯',
  room: '部屋',
  other: 'その他',
}

/** 線（段階と意味）のレイヤー。F4 は外形。F5・F9 は種類のレイヤー（種類が無ければその他） */
export function layerOfSegment(stage: Stage, kind: Kind | null): LayerName {
  if (stage === 'F4') return '外形'
  return kind === null ? 'その他' : LAYER_OF_KIND[kind]
}
