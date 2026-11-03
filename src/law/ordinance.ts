// 条例の値の確認（ハブ A-03 G15・D-02 C4）。条例の値は、人が出典つきで入力し、人が確認して初めて判定に使う。決定論。
// 値の出どころ（条例本文の読み取り）は、Claude（W4）の補完を想定するが、ここでは人の入力だけを扱う。

export interface OrdinanceEntry {
  /** 項目（例: 日影時間、測定面の高さ、高度地区の勾配） */
  key: string
  /** 値（文字） */
  value: string
  /** 出典（条例名と条項）。空のままでは確認できない */
  source: string
  /** 人が確認したか */
  confirmed: boolean
}

export type OrdinanceState =
  | { status: '未入力' }
  | { status: '未確認'; value: string }
  | { status: '確認済み'; value: string }

/** 項目の状態。確認は出典が空でないときだけ有効 */
export function ordinanceStatus(entries: readonly OrdinanceEntry[], key: string): OrdinanceState {
  const e = entries.find((x) => x.key === key)
  if (!e) return { status: '未入力' }
  if (e.confirmed && e.source.trim() !== '') return { status: '確認済み', value: e.value }
  return { status: '未確認', value: e.value }
}

/** 条例の値で判定する。確認済みの値だけを使い、ほかは判定不能（理由を付ける） */
export function judgeWithOrdinance(entries: readonly OrdinanceEntry[], key: string, judge: (value: string) => string): string {
  const s = ordinanceStatus(entries, key)
  if (s.status === '確認済み') return judge(s.value)
  return s.status === '未確認' ? '判定不能（条例の値が未確認）' : '判定不能（条例の値が未入力）'
}
