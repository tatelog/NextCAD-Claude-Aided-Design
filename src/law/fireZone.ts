// 防火・準防火地域の判定の文（ハブ A-03 G28・D-02 C11）。地点に当たる地域の区分（PLATEAU の urf: function 24＝防火、25＝準防火）から、法 61 条 1 項の結果の文を決める。決定論。
// 判定の中身は変えない（統括の判断 2026-11-05、案 B）。数値条件（階数・延べ面積）は政令に委ねられていて、ここでは確かめていないので、防火・準防火は「判定不能」。
// 文には、どの区域に入っているか（防火地域・準防火地域）と、何が未確認で判定不能なのかを添える。

/** 地点に当たる地域の区分（function）。不明は null */
export interface FireZoneLike {
  function: number | null
}

const FIRE = 24
const QUASI_FIRE = 25
const HEAD = '法 61 条 1 項: '
const UNDETERMINED = '数値条件（階数・延べ面積）は政令・告示の基準が未確認のため判定不能'

/** 法 61 条 1 項の判定の文 */
export function fireDecisionLine(zones: readonly FireZoneLike[]): string {
  if (zones.some((z) => z.function === null || (z.function !== FIRE && z.function !== QUASI_FIRE))) {
    return `${HEAD}判定不能（区分が未取得）`
  }
  const hasFire = zones.some((z) => z.function === FIRE)
  const hasQuasi = zones.some((z) => z.function === QUASI_FIRE)
  if (hasFire && hasQuasi) return `${HEAD}判定不能（防火地域と準防火地域が重なる。元データの確認が要る）`
  if (hasFire) return `${HEAD}防火地域。${UNDETERMINED}`
  if (hasQuasi) return `${HEAD}準防火地域。${UNDETERMINED}`
  return `${HEAD}指定なし。61 条の対象外`
}
