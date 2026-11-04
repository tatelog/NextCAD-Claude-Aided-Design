// 令 136 条の 2 のイ（ハブ A-03 G85。統括の決定 2026-11-04、A-03 版 48）。決定論。
// 主要構造部の耐火構造（令 107 条の必要時間との比較。部材の耐火時間は入力）と、外壁開口部設備が防火設備かの入力だけで判定する。
// ロ（延焼防止時間）は計算しない。判定不能は、イの入力が足りないときだけ。
// 全体の並び（不適合 > 判定不能 > 適合）は、既存の overallFireCheck と同じ。
import { COMPONENTS, judgeComponent, requiredMinutes, type Component } from './structureFire'

/** ロの扱い。P2 と P5 にこの一行を出す */
export const ICHI_NOTE = 'ロ（延焼防止時間）は対象外（計算していない）'

export interface IchiInput {
  /** 部材の耐火時間（分）。未入力は null */
  ratings: Partial<Record<Component, number | null>>
  /** 外壁開口部設備が防火設備か。未入力は null */
  fireDoor: boolean | null
}

export interface IchiJudgment {
  result: '適合' | '不適合' | '判定不能'
  /** 不適合・判定不能の理由（部材の名前や項目の名前） */
  reasons: string[]
}

export function judgeIchi(storeys: number, input: IchiInput): IchiJudgment {
  const fails: string[] = []
  const unknowns: string[] = []
  for (const c of COMPONENTS) {
    const r = judgeComponent(c, storeys, input.ratings[c] ?? null)
    if (r === '不適合') fails.push(`${c}: 入力の耐火時間が必要時間（${requiredMinutes(c, storeys)} 分）に届かない`)
    if (r === '判定不能') unknowns.push(`${c}: 耐火時間が未入力`)
  }
  if (input.fireDoor === false) fails.push('外壁開口部設備: 防火設備ではない')
  if (input.fireDoor === null) unknowns.push('外壁開口部設備: 防火設備かどうかが未入力')
  if (fails.length > 0) return { result: '不適合', reasons: fails }
  if (unknowns.length > 0) return { result: '判定不能', reasons: unknowns }
  return { result: '適合', reasons: [] }
}
