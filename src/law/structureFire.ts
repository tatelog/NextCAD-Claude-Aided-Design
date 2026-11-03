// 第 107 条の耐火時間（ハブ A-03 G28）。部材ごとの必要時間（分）と、入力された耐火時間からの判定。決定論。
// 根拠: 建築基準法施行令 第 107 条（e-Gov、325CO0000000338、2026-11-04 に表を確認。表は WebFetch の要約）。
// 階数の区分は「最上階からの階数」で、建物の必要時間は最も厳しい地上の最下階の区分で決める。

export type Component = '柱' | 'はり' | '床' | '間仕切壁' | '外壁' | '屋根' | '階段'

export const COMPONENTS: readonly Component[] = ['柱', 'はり', '床', '間仕切壁', '外壁', '屋根', '階段']

/** 区分 1〜5 ごとの必要時間（分）。間仕切壁・外壁は耐力壁に限る */
const REQUIRED: Record<Component, readonly [number, number, number, number, number]> = {
  柱: [60, 90, 120, 150, 180],
  はり: [60, 90, 120, 150, 180],
  床: [60, 90, 120, 120, 120],
  間仕切壁: [60, 90, 120, 120, 120],
  外壁: [60, 90, 120, 120, 120],
  屋根: [30, 30, 30, 30, 30],
  階段: [30, 30, 30, 30, 30],
}

/** 地上の階数から区分（1〜5）。最上階から数えて、1〜4 は区分 1、5〜9 は区分 2、10〜14 は区分 3、15〜19 は区分 4、20 以上は区分 5 */
export function storeyClass(storeys: number): 1 | 2 | 3 | 4 | 5 {
  if (storeys <= 4) return 1
  if (storeys <= 9) return 2
  if (storeys <= 14) return 3
  if (storeys <= 19) return 4
  return 5
}

/** 部材の必要時間（分）。建物の地上の階数で決まる */
export function requiredMinutes(component: Component, storeys: number): number {
  return REQUIRED[component][storeyClass(storeys) - 1]!
}

/** 部材の耐火時間（入力・分）と必要時間の判定。入力が無ければ判定不能 */
export function judgeComponent(component: Component, storeys: number, ratingMinutes: number | null): '適合' | '不適合' | '判定不能' {
  if (ratingMinutes === null) return '判定不能'
  return ratingMinutes >= requiredMinutes(component, storeys) ? '適合' : '不適合'
}
