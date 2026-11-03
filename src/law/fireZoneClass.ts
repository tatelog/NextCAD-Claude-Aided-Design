// 令 136 条の 2 第 1 項の号（防火・準防火地域の建築物。ハブ A-03 G28・D-02 C11）。階数（地階を除く）と延べ面積から、どの号の区分かを決める。決定論。
// 号の中身（構造・性能の基準）は、別の条（第 107 条・第 108 条の 4 など）と延焼防止時間で定まるので、ここでは判定しない（判定不能として扱う）。
// 根拠: 建築基準法施行令 第 136 条の 2 第 1 項（e-Gov 法令 API、325CO0000000338、2026-11-04 に本文を確認）。

export type FireZone = '防火' | '準防火' | 'なし'

export interface FireZoneFacts {
  zone: FireZone
  /** 地階を除く階数 */
  aboveGroundStoreys: number
  /** 延べ面積（㎡） */
  floorAreaM2: number
  /** 木造建築物等か（準防火の第三号・第四号を分ける） */
  wood: boolean
}

/** 令 136 条の 2 第 1 項の号。指定なしは '対象外' */
export function fireZoneClass(f: FireZoneFacts): '第一号' | '第二号' | '第三号' | '第四号' | '対象外' {
  if (f.zone === 'なし') return '対象外'
  if (f.zone === '防火') {
    return f.aboveGroundStoreys >= 3 || f.floorAreaM2 > 100 ? '第一号' : '第二号'
  }
  // 準防火地域
  if (f.aboveGroundStoreys >= 4 || f.floorAreaM2 > 1500) return '第一号'
  if ((f.aboveGroundStoreys === 3 && f.floorAreaM2 <= 1500) || (f.aboveGroundStoreys <= 2 && f.floorAreaM2 > 500)) return '第二号'
  return f.wood ? '第三号' : '第四号'
}
