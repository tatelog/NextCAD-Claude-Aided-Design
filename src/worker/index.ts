// Worker の受け口（D-02 C12、A-03 G29・G31）。Cloudflare Worker で動かす（配備先は利用者の Cloudflare アカウント）。
// POST /classify に {segments} を送ると、判定結果を {segments} で返す。キーは Secrets（env.ANTHROPIC_API_KEY）から読む。
import { z } from 'zod'
import { classifySegments, PENDING, type Env as ClassifyEnv } from './classify'
import { proxyPlateau } from './plateauProxy'

export interface Env extends ClassifyEnv {
  /** ブラウザの接続元として許すオリジン（例: 利用者のアプリの URL）。未設定なら CORS のヘッダーは返さない */
  ALLOWED_ORIGIN?: string
}

type FetchLike = (url: string, init: RequestInit) => Promise<Response>

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
  if (url.pathname !== '/classify') return json(404, { error: 'not found' }, cors)
  if (request.method !== 'POST') return json(405, { error: 'method not allowed' }, cors)

  let parsed: z.infer<typeof BodySchema>
  try {
    parsed = BodySchema.parse(await request.json())
  } catch {
    return json(400, { error: '線分の形が正しくない' }, cors)
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

export default {
  fetch(request: Request, env: Env): Promise<Response> {
    return handleRequest(request, env, (url, init) => fetch(url, init))
  },
}
