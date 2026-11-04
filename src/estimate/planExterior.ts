// 外装のうち、バルコニーと共用廊下の数量（ハブ A-03 G62・D-02 C8「数量の拾い方」）。P3 の自動作成の結果（基準階の区画・廊下・コア）から拾う。決定論。
// バルコニーの面（既定は下）と奥行（1600 mm）は仮置き。共用廊下は、廊下の矩形からコア（階段・EV）との重なりを引く。どちらも未確定の印を付ける。
// 前提: コア同士は重ならない（自動作成の配置）。重なるときは二重に引く。
import type { Rect } from '../plan/candidateCells'
import { balconyOfUnit } from '../plan/balcony'
import type { Quantity } from './quantities'

export interface PlanExteriorInput {
  /** 廊下（基準階） */
  corridor: Rect
  /** コア（階段・EV）。廊下と重なる分を、廊下の面積から引く */
  cores: readonly Rect[]
  /** 基準階の住戸の区画（バルコニーを付ける） */
  cells: readonly Rect[]
  /** 外形（建物の外周。P3 と同じ座標） */
  outline: { W: number; D: number }
  /** 階数。基準階の面積に掛ける（G30） */
  storeyCount: number
}

const M2 = 1_000_000

// 二つの矩形の重なり面積（mm²）。重ならなければ 0
function overlapMm2(a: Rect, b: Rect): number {
  const w = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0)
  const h = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0)
  return w > 0 && h > 0 ? w * h : 0
}

/** 手すりの高さ（mm）の既定。出典が無いので仮置き */
export const RAILING_HEIGHT_MM = 1100

/** 手すり（バルコニーの付く面の辺の長さ × 高さ）。階数分。仮置きの印を付ける */
export function railingQuantity(input: { cells: readonly Rect[]; outline: { W: number; D: number }; storeyCount: number }): Quantity {
  const railingMm2 = input.cells.reduce((sum, c) => {
    const faces = balconyOfUnit(c, { outline: input.outline }).faces
    return sum + faces.reduce((s, f) => s + (f === '上' || f === '下' ? c.x1 - c.x0 : c.y1 - c.y0) * RAILING_HEIGHT_MM, 0)
  }, 0)
  return { item: '手すり', category: '外装', quantity: (railingMm2 / M2) * input.storeyCount, unit: 'm2', provisional: true }
}

export function planExteriorQuantities(input: PlanExteriorInput): { balcony: Quantity; corridor: Quantity } {
  const { corridor, cores, cells, outline, storeyCount } = input
  const corridorMm2 = (corridor.x1 - corridor.x0) * (corridor.y1 - corridor.y0) - cores.reduce((sum, c) => sum + overlapMm2(corridor, c), 0)
  const balconyM2 = cells.reduce((sum, c) => sum + balconyOfUnit(c, { outline }).areaM2, 0)
  return {
    balcony: { item: 'バルコニー', category: '外装', quantity: balconyM2 * storeyCount, unit: 'm2', provisional: true },
    corridor: { item: '共用廊下', category: '外装', quantity: (corridorMm2 / M2) * storeyCount, unit: 'm2', provisional: true },
  }
}
