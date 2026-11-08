// 用途地域の取得の状態（統括の依頼 2026-11-06。1）。遅れて返った古い結果は捨てる。決定論。

/** 取得の番号を進め、番号が最新のものだけを採る（続けて取り直したとき、前の結果を採らない） */
export function createLatestGate() {
  let current = 0
  return {
    begin(): number {
      current += 1
      return current
    },
    isLatest(id: number): boolean {
      return id === current
    },
  }
}

/** 取得の状態の文言。取得中は「取得中」、取れなかったら取り直しを促す。どちらでもなければ何も出さない */
export function districtStatusTextOf(state: { loading: boolean; error: string | null }): string | null {
  if (state.loading) return '用途地域を取得中'
  if (state.error !== null) return '用途地域を取れなかった（ボタンで取り直す）'
  return null
}
