// 測定面の候補（ハブ A-07 E-87、t34）。東京都日影条例の別表第一の表から、人の入力（高度地区の区分）と PLATEAU の値（用途地域・容積率）で候補を決める。決定論。
// 候補は提案にすぎない。人が確認して条例の値に入れる（G15）。決められないときは理由を返す。
import { tokyoMeasurement, type HeightDistrict, type Measurement, type TokyoDistrict } from './shadowMeasure'

/** PLATEAU の用途地域の名前 → 東京都日影条例の区分（表に当たるものだけ） */
const DISTRICT_OF_ZONE: Record<string, TokyoDistrict> = {
  中高層住専: '中高層住専',
  住居系: '住居・準住居',
}

const FAR_CLASSES = [10, 15, 20, 30] as const

export type SuggestResult = { ok: true; measurement: Measurement } | { ok: false; reason: string }

export function suggestMeasurement(input: {
  zone: string
  /** PLATEAU の容積率（%）。未取得は null */
  farPercent: number | null
  /** 高度地区の区分（人が入れる）。未入力は null */
  heightDistrict: HeightDistrict | null
}): SuggestResult {
  const district = DISTRICT_OF_ZONE[input.zone]
  if (district === undefined) return { ok: false, reason: '用途地域が表の区分に当たらない' }
  if (input.farPercent === null) return { ok: false, reason: '容積率が未取得' }
  const far = input.farPercent / 10
  if (!(FAR_CLASSES as readonly number[]).includes(far)) return { ok: false, reason: '容積率が表の区分に当たらない' }
  if (input.heightDistrict === null) return { ok: false, reason: '高度地区の区分が未入力' }
  const measurement = tokyoMeasurement({ district, heightDistrict: input.heightDistrict, far: far as 10 | 15 | 20 | 30 })
  return measurement ? { ok: true, measurement } : { ok: false, reason: '表に無い組み合わせ' }
}
