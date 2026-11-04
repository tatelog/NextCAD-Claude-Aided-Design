// PLATEAU の urf:function（用途地域の区分コード）を、斜線の規則の区分（Zone）に写す。
// コードは MLIT のコードリスト Common_districtsAndZonesType（2026-11-03 に確認）。高層住居誘導地区はこのコードに無い。
import type { Zone } from './slopeRules'

const MAP: Record<number, Zone> = {
  0: '指定なし',
  1: '低層住専',
  2: '低層住専',
  3: '中高層住専',
  4: '中高層住専',
  5: '住居系',
  6: '住居系',
  7: '住居系',
  8: '田園住居',
  9: '商業系',
  10: '商業系',
  11: '準工・工業系',
  12: '準工・工業系',
  13: '準工・工業系',
}

export function zoneFromUrfFunction(code: number): Zone {
  const z = MAP[code]
  if (z === undefined) throw new Error(`知らない用途地域のコード: ${code}`)
  return z
}
