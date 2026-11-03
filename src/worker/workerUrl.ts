// 判定の送り先（Worker の URL）を決める（B: アプリも Cloudflare に上げる）。決定論の処理だけ。
// 設定（VITE_WORKER_URL）があればそれを使う。無ければ、配備したアプリ（本番）ではアプリと同じ場所（Worker がアプリも配る）、
// 手元の開発では空（送れない）。URL は秘密ではない。キーは Worker の Secret にあり、ここには入らない。
export interface WorkerUrlInput {
  /** 設定（VITE_WORKER_URL）。無ければ undefined */
  configured: string | undefined
  /** アプリを開いている場所（window.location.origin） */
  origin: string
  /** 配備したアプリ（本番）かどうか（import.meta.env.PROD） */
  prod: boolean
}

export function workerUrlFor(input: WorkerUrlInput): string {
  const configured = input.configured?.trim() ?? ''
  if (configured !== '') return configured
  return input.prod ? input.origin : ''
}
