// 日影の規制値を、確認済みの条例の値で置く（ハブ A-03 G15、D-02 C4）。条例の値は人が出典つきで入れ、人が確認したものだけを使う。決定論。
// 高さの下限と対象の用途地域は法（別表第四）の値（shadowRuleFor）を使い、時間・測定面の高さ・距離の区分だけを条例の値で置き換える。
import type { ShadowRule } from './shadowRegulation'
import { shadowRuleFor } from './shadowRule'
import { ordinanceStatus, type OrdinanceEntry } from './ordinance'
import type { Zone } from './slopeRules'

/** 条例の値の項目名（OrdinanceForm と揃える） */
export const SHADOW_KEYS = {
  near: '日影時間（10 m 以内）',
  far: '日影時間（10 m 超）',
  height: '測定面の高さ',
} as const

// 数だけを受ける（単位は「時間」「h」「m」のどれか、または無し）
const NUMBER_TEXT = /^\s*(\d+(?:\.\d+)?)\s*(?:時間|h|m)?\s*$/

export type ShadowOrdinance = { ok: true; rule: ShadowRule } | { ok: false; reason: string }

function numberOf(text: string): number | null {
  const m = NUMBER_TEXT.exec(text)
  return m ? Number(m[1]) : null
}

export function shadowRuleFromOrdinance(zone: Zone, entries: readonly OrdinanceEntry[]): ShadowOrdinance {
  const base = shadowRuleFor(zone, 2)
  if (base === null) return { ok: false, reason: '対象外（この用途地域の規制値は未確認）' }
  const values: number[] = []
  for (const key of [SHADOW_KEYS.near, SHADOW_KEYS.far, SHADOW_KEYS.height]) {
    const s = ordinanceStatus(entries, key)
    if (s.status === '未入力') return { ok: false, reason: '判定不能（条例の値が未入力）' }
    if (s.status === '未確認') return { ok: false, reason: '判定不能（条例の値が未確認）' }
    const n = numberOf(s.value)
    if (n === null) return { ok: false, reason: '判定不能（条例の値が数でない）' }
    values.push(n)
  }
  const [near, far, height] = values as [number, number, number]
  return {
    ok: true,
    rule: {
      measurementHeightM: height,
      minHeightMm: base.minHeightMm,
      bands: [
        { maxDistanceM: 10, hours: near },
        { maxDistanceM: Infinity, hours: far },
      ],
    },
  }
}
