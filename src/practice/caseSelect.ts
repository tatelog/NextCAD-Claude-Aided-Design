// 練習セットの出題（ハブ A-03 G11。代表の決定 2026-11-04）: 間取り収集の 39 案から、乱数で 1 案を選ぶ。決定論（乱数は呼び出し側が渡す）。
export function pickPracticeCase<T>(cases: readonly T[], random: () => number): T {
  if (cases.length === 0) throw new Error('出題できる案が無い')
  const i = Math.min(cases.length - 1, Math.floor(random() * cases.length))
  return cases[i]!
}
