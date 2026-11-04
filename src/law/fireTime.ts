// 耐火性能検証法の算出方法（平成12年建設省告示第1433号 第四・第五）の式。G28（延焼防止時間）の部品。決定論。
// 注: 延焼防止時間の組み合わせ（外壁と開口部の値をどう合わせて建築物の値にするか）は、告示と令の本文で確認できていない。
// ここは告示の式だけを置く。組み合わせは未確認として、呼び出し側で扱う。
const HEAT_CONST = 460

/**
 * RC 造の外壁（耐力壁、かぶり 3 cm 以上）の屋外火災保有耐火時間（分）。
 * tf = min［max｛1.7 (cd)² / (log_e(0.673 / (cd)^(1/3)))², 1.29｝, 0.012 · CD · D²］
 * c は熱特性係数、d は熱劣化深さ（mm）、CD は遮熱特性係数、D は壁の厚さ（mm）。
 */
export function outerWallFireTimeMin(input: { c: number; d: number; CD: number; D: number }): number {
  const { c, d, CD, D } = input
  if (!(c > 0) || !(d > 0) || !(CD > 0) || !(D > 0)) throw new Error('c・d・CD・D は正の数であること')
  const cd = c * d
  const denom = Math.log(0.673 / Math.cbrt(cd))
  if (denom === 0) throw new Error('cd が 0.673³ に等しく、式が定まらない')
  const first = Math.max((1.7 * cd * cd) / (denom * denom), 1.29)
  const second = 0.012 * CD * D * D
  return Math.min(first, second)
}

function holdBase(alpha: number): number {
  if (!(alpha > 0)) throw new Error('α は正の数であること')
  return Math.pow(HEAT_CONST / alpha, 1.5)
}

/** 防火戸の保有遮炎時間（分）= 20 · (460/α)^(3/2) */
export function fireDoorHoldMin(alpha: number): number {
  return 20 * holdBase(alpha)
}

/** 特定防火設備の保有遮炎時間（分）= 60 · (460/α)^(3/2) */
export function specifiedFireDoorHoldMin(alpha: number): number {
  return 60 * holdBase(alpha)
}
