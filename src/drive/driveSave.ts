// 案件を Google Drive に保存する（ハブ A-03 G24・G32）。版番号（revision）で、ほかで更新されていないかを確かめてから上書きする。
// 開いたファイルが無ければ新規に作る。アクセストークンは呼び出し側から渡す（ここでは保存しない）。決定論の部分は saveDecision に任せる。
import { downloadJsonFromDrive } from './driveDownload'
import { uploadJsonToDrive } from './driveUpload'
import { decideSave, nextRevision } from './saveDecision'

const UPDATE_URL = (id: string) => `https://www.googleapis.com/upload/drive/v3/files/${encodeURIComponent(id)}?uploadType=media`

/** 保存先の版が、読んだ版と違うために上書きしなかったときのエラー。上書きはしていない */
export class DriveConflictError extends Error {
  constructor() {
    super('Drive の案件が、ほかで更新されています。上書きしていません。読み直してから保存してください')
    this.name = 'DriveConflictError'
  }
}

/** 保存先の版番号。版の無い古いファイルは 0。形が読めなければ NaN（衝突として扱う） */
function revisionOf(remote: unknown): number {
  if (typeof remote !== 'object' || remote === null) return Number.NaN
  const r = (remote as { revision?: unknown }).revision
  if (r === undefined) return 0
  return typeof r === 'number' ? r : Number.NaN
}

export async function saveProjectToDrive(input: {
  token: string
  /** 新規のときのファイル名 */
  name: string
  /** 開いているファイルの ID。新規なら null */
  fileId: string | null
  /** 読んだときの版（新規は 0） */
  loadedRevision: number
  /** 版を入れた保存の JSON を作る */
  buildJson: (revision: number) => string
  fetchImpl?: typeof fetch
}): Promise<{ id: string; revision: number }> {
  const revision = nextRevision(input.loadedRevision)
  if (input.fileId === null) {
    const id = await uploadJsonToDrive({ token: input.token, name: input.name, json: input.buildJson(revision), fetchImpl: input.fetchImpl })
    return { id, revision }
  }
  const remote = await downloadJsonFromDrive({ token: input.token, id: input.fileId, fetchImpl: input.fetchImpl })
  if (decideSave({ loadedRevision: input.loadedRevision, remoteRevision: revisionOf(remote) }) === 'conflict') throw new DriveConflictError()
  const fetchImpl = input.fetchImpl ?? fetch
  const res = await fetchImpl(UPDATE_URL(input.fileId), {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${input.token}`, 'Content-Type': 'application/json' },
    body: input.buildJson(revision),
  })
  if (!res.ok) throw new Error(`Drive への保存に失敗（HTTP ${res.status}）`)
  return { id: input.fileId, revision }
}
