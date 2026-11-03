// 用途地域ごとの日影規制の値（建築基準法 別表第四、出典は e-Gov 法令 API の本文、2026-11-03 取得）。
// 規制時間は「十メートル以内」「十メートル超」の二つ。水準（一）（二）（三）は、地方公共団体の指定で決まるため引数で選ぶ。
// 注: 東京都の条例・江東区の指定が別の値を定める場合がある（未確認。P2 の表示で「要確認」と出す）。
// 測定面は 4 m と 6.5 m のうち 4 m を採る（6.5 m の指定は条例で確認）。「道の区域」の緩和は含めない。
import type { ShadowRule } from './shadowRegulation'
import type { Zone } from './slopeRules'

export type ShadowLevel = 1 | 2 | 3

// 水準ごとの規制時間（時間）: [10 m 以内, 10 m 超]
const HOURS: Record<'low' | 'mid' | 'res', Partial<Record<ShadowLevel, [number, number]>>> = {
  low: { 1: [3, 2], 2: [4, 2.5], 3: [5, 3] },
  mid: { 1: [3, 2], 2: [4, 2.5], 3: [5, 3] },
  res: { 1: [4, 2.5], 2: [5, 3] },
}

export function shadowRuleFor(zone: Zone, level: ShadowLevel): ShadowRule | null {
  const group: 'low' | 'mid' | 'res' | null =
    zone === '低層住専' || zone === '田園住居' ? 'low' : zone === '中高層住専' ? 'mid' : zone === '住居系' ? 'res' : null
  if (group === null) return null
  const hours = HOURS[group][level]
  if (!hours) return null
  return {
    measurementHeightM: group === 'low' ? 1.5 : 4,
    minHeightMm: group === 'low' ? 7_000 : 10_000,
    bands: [
      { maxDistanceM: 10, hours: hours[0] },
      { maxDistanceM: Infinity, hours: hours[1] },
    ],
  }
}
