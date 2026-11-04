// PLATEAU の zip の範囲取得（Range）を中継する（A-03 の出典・利用条件の範囲でだけ。データは保存しない）。
// ブラウザが PLATEAU のホストへ直接 Range 付きで取ると、CORS の事前確認で止まるため、同じ接続元の /plateau-assets/ 経由にする。
// 中継先は PLATEAU のホスト（下の定数）だけ。開いた中継にしない。
const PREFIX = '/plateau-assets'
const UPSTREAM = 'https://assets.cms.plateau.reearth.io'
// 中継で返す応答ヘッダー（範囲取得に要るもの）
const PASS_HEADERS = ['content-range', 'content-length', 'accept-ranges', 'content-type']

interface ProxyEnv {
  ALLOWED_ORIGIN?: string
}

function corsHeaders(request: Request, env: ProxyEnv): Record<string, string> {
  const origin = request.headers.get('origin')
  if (!env.ALLOWED_ORIGIN || origin !== env.ALLOWED_ORIGIN) return {}
  return {
    'access-control-allow-origin': env.ALLOWED_ORIGIN,
    'access-control-allow-methods': 'GET, HEAD, OPTIONS',
    'access-control-allow-headers': 'range',
    'access-control-expose-headers': 'content-range, content-length, accept-ranges',
  }
}

export async function proxyPlateau(
  request: Request,
  env: ProxyEnv,
  fetchImpl: (url: string, init: RequestInit) => Promise<Response>,
): Promise<Response> {
  const cors = corsHeaders(request, env)
  const url = new URL(request.url)
  if (!url.pathname.startsWith(`${PREFIX}/`)) return new Response('not found', { status: 404, headers: cors })
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
  if (request.method !== 'GET' && request.method !== 'HEAD') return new Response('method not allowed', { status: 405, headers: cors })

  const range = request.headers.get('range')
  const upstream = await fetchImpl(`${UPSTREAM}${url.pathname.slice(PREFIX.length)}${url.search}`, {
    method: request.method,
    headers: range ? { Range: range } : {},
  })
  const headers = new Headers(cors)
  for (const name of PASS_HEADERS) {
    const value = upstream.headers.get(name)
    if (value !== null) headers.set(name, value)
  }
  return new Response(upstream.body, { status: upstream.status, headers })
}
