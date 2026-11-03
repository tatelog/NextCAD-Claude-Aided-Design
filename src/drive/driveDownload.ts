// アプリが Drive に上げた案件の JSON を読む（権限は drive.file。アプリが作ったファイルだけが見える。ほかのファイルは読まない）。
// 一覧は files.list（JSON・ゴミ箱にない・新しい順）、中身は files.get（alt=media）。
// アクセストークンは呼び出し側から渡す（ここでは保存しない）。実際の Google の応答での確認は未了（VITE_GOOGLE_CLIENT_ID が未設定のため）。
const FILES_URL = 'https://www.googleapis.com/drive/v3/files'

export interface DriveProjectFile {
  id: string
  name: string
  modifiedTime: string
}

export async function listProjectFiles(input: { token: string; fetchImpl?: typeof fetch }): Promise<DriveProjectFile[]> {
  const fetchImpl = input.fetchImpl ?? fetch
  const query = new URLSearchParams({
    q: "mimeType='application/json' and trashed=false",
    fields: 'files(id,name,modifiedTime)',
    orderBy: 'modifiedTime desc',
    pageSize: '50',
  })
  const res = await fetchImpl(`${FILES_URL}?${query.toString()}`, { headers: { Authorization: `Bearer ${input.token}` } })
  if (!res.ok) throw new Error(`Drive の一覧の取得に失敗（HTTP ${res.status}）`)
  const data = (await res.json()) as { files?: DriveProjectFile[] }
  return data.files ?? []
}

export async function downloadJsonFromDrive(input: { token: string; id: string; fetchImpl?: typeof fetch }): Promise<unknown> {
  const fetchImpl = input.fetchImpl ?? fetch
  const res = await fetchImpl(`${FILES_URL}/${encodeURIComponent(input.id)}?alt=media`, {
    headers: { Authorization: `Bearer ${input.token}` },
  })
  if (!res.ok) throw new Error(`Drive からの読み込みに失敗（HTTP ${res.status}）`)
  return JSON.parse(await res.text()) as unknown
}
