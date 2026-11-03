// Claude の判定の保留（ハブ A-03 G31・G32）。応答が失敗した判定は、作業を止めずに保留へ積む。
// 自動で 1 回だけ再試行し、それでも失敗したものを保留にする（再試行は judgeWithOneRetry が行い、積むのは呼び出し側）。
const ATTEMPTS = 2

export type RetryResult<T> = { ok: true; value: T } | { ok: false; error: string }

export async function judgeWithOneRetry<T>(run: () => Promise<T>): Promise<RetryResult<T>> {
  let error = ''
  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    try {
      return { ok: true, value: await run() }
    } catch (e) {
      error = e instanceof Error && e.message !== '' ? e.message : '判定の応答がなかった（理由なし）'
    }
  }
  return { ok: false, error }
}
