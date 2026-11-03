// 防火・準防火地域の判定の文（ハブ A-03 G28・D-02 C11）。地点に当たる地域の区分（PLATEAU の urf: function 24＝防火、25＝準防火）から、法 61 条 1 項の結果の文を決める。決定論。
// 数値条件（階数・延べ面積）は政令に委ねられていて、ここでは確かめていないので、防火・準防火があれば「判定不能」と出す。

/** 地点に当たる地域の区分（function）。不明は null */
export interface FireZoneLike {
  function: number | null
}

const FIRE = 24
const QUASI_FIRE = 25

/** 法 61 条 1 項の判定の文 */
export function fireDecisionLine(zones: readonly FireZoneLike[]): string {
  const head = '法 61 条 1 項: '
  if (zones.some((z) => z.function === null || (z.function !== FIRE && z.function !== QUASI_FIRE))) {
    return `${head}判定不能（区分が未取得）`
  }
  if (zones.length === 0) return `${head}対象外（防火地域・準防火地域の指定なし）`
  return `${head}判定不能（政令・告示の基準が未確認）`
}
