// 条例の値の補完（ハブ A-03 G15・D-02 C4「条例の補完の出力（W4）」）。Claude が条例本文から補った値は、ここで決定論の検査をしてから画面に渡す。
// 検査: 項目は日影の三項目だけ、出典は空でない、値は数で入る。採った値は未確認のまま（確認済みの印を付けない）。決定論。
import { z } from 'zod'
import { numberOf, SHADOW_KEYS } from './shadowOrdinance'

/** 補完の項目（日影の三項目）。OrdinanceForm の項目と揃える */
const SUGGEST_KEYS = [SHADOW_KEYS.near, SHADOW_KEYS.far, SHADOW_KEYS.height] as const

const ItemSchema = z.object({
  item: z.enum(SUGGEST_KEYS),
  value: z.string(),
  source: z.string(),
})

/** 採った補完の値。確認済みの印は持たない（人が確認するまで未確認） */
export interface OrdinanceSuggestion {
  key: (typeof SUGGEST_KEYS)[number]
  value: string
  source: string
}

/** 補完の出力を検査する。採った数と捨てた数を返す。形が配列でなければ、何も採らない */
export function acceptSuggestions(raw: unknown): { accepted: OrdinanceSuggestion[]; dropped: number } {
  if (!Array.isArray(raw)) return { accepted: [], dropped: 0 }
  const accepted: OrdinanceSuggestion[] = []
  let dropped = 0
  for (const row of raw) {
    const parsed = ItemSchema.safeParse(row)
    if (!parsed.success) {
      dropped++
      continue
    }
    const { item, value, source } = parsed.data
    if (source.trim() === '' || numberOf(value) === null) {
      dropped++
      continue
    }
    accepted.push({ key: item, value: value.trim(), source: source.trim() })
  }
  return { accepted, dropped }
}
