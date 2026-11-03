// Google Identity Services（トークンの取得）。アプリ自身の OAuth クライアント ID を使う。
// クライアント ID は環境変数 VITE_GOOGLE_CLIENT_ID（ビルド時に埋める。リポジトリには書かない）。
// 権限は drive.file（アプリが作るファイルだけ）。トークンは取得の都度だけ使い、保存しない・更新しない（今回の範囲）。
export const DRIVE_CLIENT_ID: string | undefined = import.meta.env.VITE_GOOGLE_CLIENT_ID || undefined

const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file'
const GIS_SRC = 'https://accounts.google.com/gsi/client'

interface TokenResponse {
  access_token?: string
  error?: string
}

interface GoogleOauth2 {
  initTokenClient(config: {
    client_id: string
    scope: string
    callback: (resp: TokenResponse) => void
    error_callback?: (err: { type?: string }) => void
  }): { requestAccessToken(overrides?: { prompt?: string }): void }
}

declare global {
  interface Window {
    google?: { accounts: { oauth2: GoogleOauth2 } }
  }
}

function loadGis(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = GIS_SRC
    s.async = true
    s.onload = () => resolve()
    s.onerror = () => reject(new Error('Google の認証スクリプトを読めなかった'))
    document.head.appendChild(s)
  })
}

export async function requestDriveToken(clientId: string): Promise<string> {
  await loadGis()
  return new Promise((resolve, reject) => {
    const client = window.google!.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: DRIVE_SCOPE,
      callback: (resp) => {
        if (resp.error || !resp.access_token) reject(new Error('Google の認証が完了しなかった'))
        else resolve(resp.access_token)
      },
      error_callback: () => reject(new Error('Google の認証が中断された')),
    })
    client.requestAccessToken()
  })
}
