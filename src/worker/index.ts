// Worker の受け口（D-02 C12、A-03 G29・G31）。Cloudflare Worker で動かす（配備先は利用者の Cloudflare アカウント）。
// POST /classify に {segments} を送ると、判定結果を {segments} で返す。キーは Secrets（env.ANTHROPIC_API_KEY）から読む。
import { z } from 'zod'
import { classifySegments, PENDING, type Env as ClassifyEnv } from './classify'
import { proxyPlateau } from './plateauProxy'
import { admitMonthly, type KvLike } from './monthlyCap'
import { suggestOrdinance } from './ordinanceClaude'

export interface Env extends ClassifyEnv {
  /** ブラウザの接続元として許すオリジン（例: 利用者のアプリの URL）。未設定なら CORS のヘッダーは返さない */
  ALLOWED_ORIGIN?: string
  /** 今月の判定の件数を数える置き場（Cloudflare KV。binding 名 USAGE）。無ければ月の上限は効かない（D-06 N7） */
  USAGE?: KvLike
  /** 月の判定の上限（件数）。文字列の数。未設定なら DEFAULT_MONTHLY_LIMIT */
  MONTHLY_CLASSIFY_LIMIT?: string
}

type FetchLike = (url: string, init: RequestInit) => Promise<Response>

/** 一度に送れる線分の数（D-02 C12） */
const MAX_SEGMENTS = 200
/** 月の判定の既定の上限（件数。仮置き。費用の見積もりで決め直す） */
const DEFAULT_MONTHLY_LIMIT = 1000

const BodySchema = z.object({
  segments: z.array(
    z.object({
      id: z.string().min(1),
      a: z.object({ x: z.number(), y: z.number() }),
      b: z.object({ x: z.number(), y: z.number() }),
    }),
  ),
})

function corsHeaders(request: Request, env: Env): Record<string, string> {
  const origin = request.headers.get('origin')
  if (!env.ALLOWED_ORIGIN || origin !== env.ALLOWED_ORIGIN) return {}
  return {
    'access-control-allow-origin': env.ALLOWED_ORIGIN,
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': 'content-type',
  }
}

function json(status: number, body: unknown, headers: Record<string, string>): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } })
}

export async function handleRequest(request: Request, env: Env, fetchImpl: FetchLike): Promise<Response> {
  const cors = corsHeaders(request, env)
  const url = new URL(request.url)

  if (url.pathname.startsWith('/plateau-assets/')) return proxyPlateau(request, env, fetchImpl)
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
  if (url.pathname === '/ordinance') return handleOrdinance(request, env, fetchImpl, cors)
  if (url.pathname !== '/classify') return json(404, { error: 'not found' }, cors)
  if (request.method !== 'POST') return json(405, { error: 'method not allowed' }, cors)
  // 接続元の制限（D-06 N6）。ALLOWED_ORIGIN が設定されていれば、その接続元からの呼び出しだけ受ける。Claude は呼ばない
  if (env.ALLOWED_ORIGIN && request.headers.get('origin') !== env.ALLOWED_ORIGIN) {
    return json(403, { error: '接続元が許されていない' }, cors)
  }

  let parsed: z.infer<typeof BodySchema>
  try {
    parsed = BodySchema.parse(await request.json())
  } catch {
    return json(400, { error: '線分の形が正しくない' }, cors)
  }
  // 一度に送れる線分の上限（D-02 C12。費用の月あたりの上限は別に決める）
  if (parsed.segments.length > MAX_SEGMENTS) {
    return json(413, { error: `一度に送れる線分は ${MAX_SEGMENTS} 本まで` }, cors)
  }

  // 月の上限（D-06 N7）。上限に達していれば、Claude は呼ばない
  const limit = Number(env.MONTHLY_CLASSIFY_LIMIT ?? DEFAULT_MONTHLY_LIMIT)
  if ((await admitMonthly(env.USAGE, new Date(), limit)) === 'over') {
    return json(429, { error: '今月の判定の上限に達した' }, cors)
  }

  try {
    const segments = await classifySegments(parsed.segments, env, fetchImpl)
    return json(200, { segments }, cors)
  } catch (e) {
    if (e instanceof Error && (e as { code?: string }).code === PENDING) {
      return json(503, { code: PENDING, error: '判定を保留した' }, cors)
    }
    // キーなどの設定の中身は返さない
    return json(500, { error: 'Worker の設定が足りない、または内部の失敗' }, cors)
  }
}

// 条例の値の補完（W4）。POST /ordinance に {city, zone, text} を送ると、検査を通った項目を返す。判定はしない（人が確認する）
const OrdinanceBodySchema = z.object({
  city: z.string().min(1).max(100),
  zone: z.string().min(1).max(40),
  text: z.string().min(1).max(2000),
})

async function handleOrdinance(request: Request, env: Env, fetchImpl: FetchLike, cors: Record<string, string>): Promise<Response> {
  if (request.method !== 'POST') return json(405, { error: 'method not allowed' }, cors)
  if (env.ALLOWED_ORIGIN && request.headers.get('origin') !== env.ALLOWED_ORIGIN) {
    return json(403, { error: '接続元が許されていない' }, cors)
  }
  let parsed: z.infer<typeof OrdinanceBodySchema>
  try {
    parsed = OrdinanceBodySchema.parse(await request.json())
  } catch {
    return json(400, { error: '条例本文の形が正しくない（2000 字まで）' }, cors)
  }
  // 月の上限は判定と同じ数に数える（どちらも Claude を呼ぶため）
  const limit = Number(env.MONTHLY_CLASSIFY_LIMIT ?? DEFAULT_MONTHLY_LIMIT)
  if ((await admitMonthly(env.USAGE, new Date(), limit)) === 'over') {
    return json(429, { error: '今月の判定の上限に達した' }, cors)
  }
  try {
    const result = await suggestOrdinance(parsed, env, fetchImpl)
    return json(200, result, cors)
  } catch (e) {
    if (e instanceof Error && (e as { code?: string }).code === PENDING) {
      return json(503, { code: PENDING, error: '補完を保留した' }, cors)
    }
    return json(500, { error: 'Worker の設定が足りない、または内部の失敗' }, cors)
  }
}

export default {
  fetch(request: Request, env: Env): Promise<Response> {
    return handleRequest(request, env, (url, init) => fetch(url, init))
  },
}
