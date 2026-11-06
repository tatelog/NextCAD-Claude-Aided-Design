/** 画面の実寸変換に合わせた 1・2・5 系列の距離尺。 */
export function scaleBarOf(mmPerPx: number) {
  const target = mmPerPx * 120
  const base = 10 ** Math.floor(Math.log10(target))
  const lengthMm = [5, 2, 1].map(n => n * base).find(n => n <= target) ?? base
  return { lengthMm, widthPx: lengthMm / mmPerPx }
}
