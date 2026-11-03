// 層ごとの線の見え方（ハブ D-04 共通部品「キャンバス」。仮置きの値）。意味が付いた後の見え方を、層から決める。
// 二重線と切り欠きは、今は太さと破線で近似する（仮置き）。部屋の塗りは別の作業。
import type { LayerName } from './layers'

export interface LineStyle {
  color: string
  /** 線の太さ（px） */
  width: number
  /** 破線の並び（px）。空なら実線 */
  dash: number[]
}

const INK = '#1f2a44'

const STYLE_OF: Record<LayerName, LineStyle> = {
  筆界: { color: INK, width: 2, dash: [] },
  外形: { color: INK, width: 3, dash: [] },
  通り芯: { color: '#c44', width: 1.5, dash: [24, 6, 4, 6] },
  柱: { color: INK, width: 6, dash: [] },
  梁: { color: INK, width: 3, dash: [10, 4] },
  壁: { color: INK, width: 4, dash: [] },
  開口: { color: INK, width: 2, dash: [10, 6] },
  部屋: { color: '#8a7f6a', width: 1, dash: [] },
  コア: { color: INK, width: 2, dash: [] },
  その他: { color: INK, width: 2.5, dash: [] },
  寸法: { color: '#1f5f8b', width: 1, dash: [] },
  日影: { color: '#3a4450', width: 1, dash: [6, 4] },
  縦シャフト: { color: INK, width: 2, dash: [2, 2] },
}

/** 層の見え方（同じ層は同じ見え方） */
export function lineStyleOf(layer: LayerName): LineStyle {
  const s = STYLE_OF[layer]
  return { color: s.color, width: s.width, dash: [...s.dash] }
}
