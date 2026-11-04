// アプリが作るファイルを Google Drive に上げる（権限は drive.file。ほかのファイルは読まない・触らない）。
// アクセストークンは呼び出し側から渡す。ここでは保存せず、再取得や更新の処理もしない（今回の範囲は接続まで）。
import { buildDriveMultipart } from './multipart'

const UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart'

export async function uploadJsonToDrive(input: {
  token: string
  name: string
  json: string
  fetchImpl?: typeof fetch
  boundary?: string
}): Promise<string> {
  const fetchImpl = input.fetchImpl ?? fetch
  const boundary = input.boundary ?? `claude-${Math.random().toString(36).slice(2)}`
  const built = buildDriveMultipart({
    metadata: { name: input.name, mimeType: 'application/json' },
    content: input.json,
    contentType: 'application/json',
    boundary,
  })
  const res = await fetchImpl(UPLOAD_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${input.token}`, 'Content-Type': built.contentType },
    body: built.body,
  })
  if (!res.ok) throw new Error(`Drive への保存に失敗（HTTP ${res.status}）`)
  const data = (await res.json()) as { id?: string }
  if (!data.id) throw new Error('Drive の応答に id がない')
  return data.id
}
