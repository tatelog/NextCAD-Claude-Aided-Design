// 条例の値の補完（W4）の呼び出し（画面から Worker の /ordinance へ）。結果は Worker で検査した項目と、捨てた数。
// 送るのは自治体・用途地域・条例本文の抜粋だけ。キーは Worker の Secrets にあり、ここには無い。
import type { OrdinanceSuggestion } from '../law/ordinanceSuggest'
import { WorkerUnreachableError } from './client'

type FetchLike = (url: string, init: RequestInit) => Promise<Response>

export interface OrdinanceSuggestRequest {
  city: string
  zone: string
  text: string
}

export async function suggestOrdinanceViaWorker(
  req: OrdinanceSuggestRequest,
  workerUrl: string,
  fetchImpl: FetchLike,
): Promise<{ accepted: OrdinanceSuggestion[]; dropped: number }> {
  if (workerUrl.trim() === '') throw new Error('Worker の URL が空')
  let res: Response
  try {
    res = await fetchImpl(`${workerUrl.replace(/\/+$/, '')}/ordinance`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(req),
    })
  } catch {
    throw new WorkerUnreachableError()
  }
  if (res.status === 503) throw new Error('補完を保留した（再試行しても失敗）。あとで試してください')
  if (!res.ok) throw new Error(`Worker が失敗: ${res.status}`)
  const json = (await res.json()) as { accepted?: OrdinanceSuggestion[]; dropped?: number }
  return { accepted: json.accepted ?? [], dropped: json.dropped ?? 0 }
}
