// ブラウザ側の中継の呼び出し（D-02 C12、A-03 G29・G31）。Claude の API は直接呼ばず、Worker の URL へ送る。
// Worker の URL は引数で受ける（配備先は未決）。出力は parseClassifierOutput で検証する。
import { parseClassifierOutput } from '../plan/semantic'
import { PendingError, type SegmentIn } from './classify'

type FetchLike = (url: string, init: RequestInit) => Promise<Response>

/** Worker に届かなかった（接続の失敗）。保留ではなく「つながらない」と分けて伝える（G154） */
export class WorkerUnreachableError extends Error {
  constructor() {
    super('Worker につながりません')
    this.name = 'WorkerUnreachableError'
  }
}

async function once(segments: SegmentIn[], workerUrl: string, fetchImpl: FetchLike) {
  let res: Response
  try {
    res = await fetchImpl(`${workerUrl.replace(/\/$/, '')}/classify`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ segments }),
    })
  } catch {
    throw new WorkerUnreachableError()
  }
  if (!res.ok) throw new Error(`Worker が失敗: ${res.status}`)
  const json = (await res.json()) as { segments?: unknown }
  return parseClassifierOutput(json.segments)
}

export async function classifyViaWorker(segments: SegmentIn[], workerUrl: string, fetchImpl: FetchLike) {
  if (workerUrl.trim() === '') throw new Error('Worker の URL が空')
  let lastError: unknown = null
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      return await once(segments, workerUrl, fetchImpl)
    } catch (e) {
      // つながらないときは、再試行せずに伝える（何度呼んでも届かない）
      if (e instanceof WorkerUnreachableError) throw e
      lastError = e
    }
  }
  throw new PendingError(`判定を保留（再試行しても失敗）: ${lastError instanceof Error ? lastError.message : String(lastError)}`)
}
