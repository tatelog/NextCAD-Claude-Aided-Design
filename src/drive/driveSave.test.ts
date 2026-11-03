// 仕様（ハブ A-03 G24・G32。版番号による確認。Drive の書き込み路）: 案件を Drive に保存する。
// 仕様 1: まだ Drive のファイルが無い（新規）なら、新しいファイルを作り、版は 1。
// 仕様 2: 開いたファイルが、読んだ版と同じなら、そのファイルを上書き（PATCH）し、版は +1。
// 仕様 3: 保存先の版が読んだ版より新しければ、上書きせず DriveConflictError。
// 仕様 4: 版の無い古いファイルは版 0 として扱う（読んだ版 0 なら保存してよい）。
// 仕様 5: 上書きの応答が正常でなければ HTTP の状態を含むエラー。トークンは含まない。
import { describe, expect, it } from 'vitest'
import { DriveConflictError, saveProjectToDrive } from './driveSave'

type Call = { method: string; url: string; body: unknown }

// 保存先の中身（remote）を返す偽の Drive。GET は中身、POST は新規、PATCH は上書き
function fakeDrive(remote: unknown, opts: { failUpdate?: boolean } = {}) {
  const calls: Call[] = []
  const fetchImpl = (async (url: string, init: RequestInit) => {
    const method = init.method ?? 'GET'
    calls.push({ method, url, body: init.body })
    if (method === 'GET') return new Response(JSON.stringify(remote), { status: 200 })
    if (method === 'POST') return new Response(JSON.stringify({ id: 'new-id' }), { status: 200 })
    if (method === 'PATCH') return new Response(JSON.stringify({ id: 'old-id' }), { status: opts.failUpdate ? 500 : 200 })
    return new Response('', { status: 404 })
  }) as unknown as typeof fetch
  return { calls, fetchImpl }
}

const build = (revision: number) => JSON.stringify({ revision, projectName: '試し' })

describe('Drive への保存（仕様 1〜5）', () => {
  it('仕様 1: 新規は、新しいファイルを作り、版は 1', async () => {
    const { calls, fetchImpl } = fakeDrive(null)
    const out = await saveProjectToDrive({ token: 'tok', name: '試し.json', fileId: null, loadedRevision: 0, buildJson: build, fetchImpl })
    expect(out).toEqual({ id: 'new-id', revision: 1 })
    expect(calls.map((c) => c.method)).toEqual(['POST'])
    expect(String(calls[0]!.body)).toContain('"revision":1')
  })

  it('仕様 2: 開いたファイルの版が読んだ版と同じなら上書きし、版は +1', async () => {
    const { calls, fetchImpl } = fakeDrive({ revision: 3 })
    const out = await saveProjectToDrive({ token: 'tok', name: '試し.json', fileId: 'old-id', loadedRevision: 3, buildJson: build, fetchImpl })
    expect(out).toEqual({ id: 'old-id', revision: 4 })
    expect(calls.map((c) => c.method)).toEqual(['GET', 'PATCH'])
    expect(calls[1]!.url).toContain('old-id')
    expect(calls[1]!.url).toContain('uploadType=media')
    expect(String(calls[1]!.body)).toContain('"revision":4')
  })

  it('仕様 3: 保存先の版が新しければ上書きせず DriveConflictError（PATCH は呼ばない）', async () => {
    const { calls, fetchImpl } = fakeDrive({ revision: 4 })
    await expect(saveProjectToDrive({ token: 'tok', name: '試し.json', fileId: 'old-id', loadedRevision: 3, buildJson: build, fetchImpl })).rejects.toBeInstanceOf(DriveConflictError)
    expect(calls.map((c) => c.method)).toEqual(['GET'])
  })

  it('仕様 4: 版の無い古いファイルは版 0。読んだ版 0 なら保存してよい', async () => {
    const { fetchImpl } = fakeDrive({ projectName: '古い' })
    const out = await saveProjectToDrive({ token: 'tok', name: '試し.json', fileId: 'old-id', loadedRevision: 0, buildJson: build, fetchImpl })
    expect(out.revision).toBe(1)
  })

  it('仕様 5: 上書きが失敗したら HTTP の状態を含むエラー。トークンは含まない', async () => {
    const { fetchImpl } = fakeDrive({ revision: 3 }, { failUpdate: true })
    const err = await saveProjectToDrive({ token: 'tok-secret', name: '試し.json', fileId: 'old-id', loadedRevision: 3, buildJson: build, fetchImpl }).catch((e: unknown) => e)
    expect(err).toBeInstanceOf(Error)
    expect((err as Error).message).toContain('HTTP 500')
    expect((err as Error).message).not.toContain('tok-secret')
  })
})
