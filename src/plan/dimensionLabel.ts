// 寸法線の表記（ハブ A-03 G134。統括の依頼 2026-11-05）: mm の整数。小数は四捨五入して出す。
// 3D には寸法線を出さない（G134）。P1 の敷地からの離れは例外で、表記は未決（t72）。

/** 寸法の値（mm）を、整数の mm の表記にする */
export function mmLabel(valueMm: number): string {
  return `${Math.round(valueMm)} mm`
}

/** 敷地からの離れ（mm）を、m・小数 2 桁の表記にする（G134 の例外。設計グリル・統括 2026-11-05、t72）。負の値は符号を付ける */
export function setbackLabel(valueMm: number): string {
  return `${(valueMm / 1000).toFixed(2)} m`
}
