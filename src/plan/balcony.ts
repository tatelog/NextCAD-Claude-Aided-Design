// バルコニー（仮置き。ハブ A-03 G62・D-03 T-02 外装 part「バルコニー」・G76）。住戸の外周の辺に付く、奥行の一定の帯として数える。決定論。
// 面（下・上・左・右）と奥行は仮置き。出典が無いので、A-07 で確認するまでは既定の値で出す。
import type { Rect } from './candidateCells'
import type { Side } from './unitDetail'

export interface BalconyOptions {
  /** 外形（建物の外周の位置） */
  outline: { W: number; D: number }
  /** バルコニーを付ける面。既定は下（外形の下の辺＝南面を想定。真北の向きは未決） */
  faces?: readonly Side[]
  /** 奥行（mm）。既定は 1600（仮置き） */
  depthMm?: number
}

export interface Balcony {
  /** 実際に付いた面（外形の外周に接するものだけ） */
  faces: Side[]
  /** バルコニーの面積（m²） */
  areaM2: number
}

const SIDE_ORDER: readonly Side[] = ['左', '上', '右', '下']

/** 区画に付くバルコニー。面が外形の外周に接しているものだけ、辺の長さ × 奥行で数える */
export function balconyOfUnit(cell: Rect, options: BalconyOptions): Balcony {
  const faces = options.faces ?? ['下']
  const depth = options.depthMm ?? 1600
  const onOuter = (side: Side): boolean => {
    if (side === '左') return cell.x0 === 0
    if (side === '上') return cell.y0 === 0
    if (side === '右') return cell.x1 === options.outline.W
    return cell.y1 === options.outline.D
  }
  const used = SIDE_ORDER.filter((s) => faces.includes(s) && onOuter(s))
  const areaMm2 = used.reduce((sum, s) => {
    const length = s === '上' || s === '下' ? cell.x1 - cell.x0 : cell.y1 - cell.y0
    return sum + length * depth
  }, 0)
  return { faces: used, areaM2: areaMm2 / 1_000_000 }
}
