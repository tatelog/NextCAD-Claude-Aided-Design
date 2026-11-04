// 費用の月上限（ハブ A-03 G29・D-02 C12・D-06 N7）。Claude を呼ぶ件数を、月ごとに数える。決定論の判定と、置き場（KV）への読み書きだけ。
// 置き場は Cloudflare の KV を想定（binding 名は USAGE）。KV は結果が遅れて見えることがあるので、上限は目安（厳密な課金の上限ではない）。
// 上限の数は環境変数（MONTHLY_CLASSIFY_LIMIT）で決める。既定は下の値（仮置き。費用の見積もりで決め直す）。

/** 置き場の最小の形（Cloudflare KV と同じ get/put） */
export interface KvLike {
  get(key: string): Promise<string | null>
  put(key: string, value: string): Promise<void>
}

/** 月ごとのキー（例: classify:2026-11） */
export function monthKey(now: Date): string {
  const y = now.getUTCFullYear()
  const m = String(now.getUTCMonth() + 1).padStart(2, '0')
  return `classify:${y}-${m}`
}

/** 上限に達していなければ 'ok' にして件数を 1 増やす。達していれば 'over'（件数は増やさない）。置き場が無ければ常に 'ok' */
export async function admitMonthly(kv: KvLike | undefined, now: Date, limit: number): Promise<'ok' | 'over'> {
  if (!kv) return 'ok'
  const key = monthKey(now)
  const count = Number((await kv.get(key)) ?? '0')
  if (count >= limit) return 'over'
  await kv.put(key, String(count + 1))
  return 'ok'
}
