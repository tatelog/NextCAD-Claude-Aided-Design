// コアと縦シャフトの寸法（ハブ A-03 G138・G83・G84。統括の依頼 2026-11-05）。
// 差し替えられるブロック: EV ホールの奥行と縦シャフトの寸法は、この二つの関数から出す。
// 当面は仮置き（出典なし。A-07 で裏取りするまで）。定員ごとの表と MEP の計算は、後でこの中身だけを変える（t36・t37）。
// 縦シャフトは MEP の検討結果を手で入れたとき、その値を使う（G84）。

export type ShaftKind = 'PS' | 'EPS' | 'DS'

/** EV ホールの奥行（mm）。仮置き。定員ごとの表はまだ無いので、今はどの定員でも同じ */
const EV_HALL_LEN_PROVISIONAL_MM = 3_000

/** 縦シャフトの一辺（mm）。仮置き（600 mm 角）。種類ごとに差し替えられるように表で持つ */
const SHAFT_PROVISIONAL_MM: Readonly<Record<ShaftKind, number>> = { PS: 600, EPS: 600, DS: 600 }

/** EV ホールの奥行（mm）。今は仮置き 3,000 mm（G77）。定員ごとの表に替えるときは、この関数の中だけを変える */
export function evHallLenMm(): number {
  return EV_HALL_LEN_PROVISIONAL_MM
}

/** 縦シャフトの一辺（mm）。MEP の結果を手で入れたときはその値、無ければ仮置き */
export function shaftSizeMm(kind: ShaftKind, manualMm?: number): number {
  return manualMm ?? SHAFT_PROVISIONAL_MM[kind]
}
