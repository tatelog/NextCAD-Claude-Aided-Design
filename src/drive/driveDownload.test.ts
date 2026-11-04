// 仕様: アプリが Drive に上げた案件の JSON を、一覧から選んで読む（権限は drive.file。アプリが作ったファイルだけが見える）。
// 仕様 1: 一覧は、JSON で・ゴミ箱にない・新しい順。アクセストークンを Authorization に付ける。
// 仕様 2: 一覧の応答に files が無ければ空の配列。
// 仕様 3: 一覧の取得が失敗（HTTP エラー）なら、その HTTP の番号を含むエラーにする。
// 仕様 4: 中身は、ファイル ID を指定して alt=media で取り、JSON として返す。
// 仕様 5: 中身の取得が失敗したら、HTTP の番号を含むエラーにする。JSON として読めなければエラーにする。
import { describe, expect, it } from 'vitest'
import { downloadJsonFromDrive, listProjectFiles } from './driveDownload'

interface Call {
  url: string
  init?: RequestInit
}

// 呼び出しを記録して、決まった応答を返す fetch
function fakeFetch(status: number, body: string, calls: Call[]): typeof fetch {
  return (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init })
    return new Response(body, { status })
  }) as typeof fetch
}

describe('listProjectFiles（Drive の案件の一覧）', () => {
  it('JSON で・ゴミ箱にない・新しい順に問い合わせ、トークンを付ける', async () => {
    const calls: Call[] = []
    await listProjectFiles({ token: 'tok', fetchImpl: fakeFetch(200, '{"files":[]}', calls) })
    const url = new URL(calls[0]!.url)
    expect(url.origin + url.pathname).toBe('https://www.googleapis.com/drive/v3/files')
    expect(url.searchParams.get('q')).toBe("mimeType='application/json' and trashed=false")
    expect(url.searchParams.get('orderBy')).toBe('modifiedTime desc')
    expect(new Headers(calls[0]!.init?.headers).get('Authorization')).toBe('Bearer tok')
  })

  it('応答の files を、id・名前・更新日時の一覧として返す', async () => {
    const calls: Call[] = []
    const body = JSON.stringify({ files: [{ id: 'f1', name: '敷地A.json', modifiedTime: '2026-11-04T01:00:00.000Z' }] })
    const files = await listProjectFiles({ token: 'tok', fetchImpl: fakeFetch(200, body, calls) })
    expect(files).toEqual([{ id: 'f1', name: '敷地A.json', modifiedTime: '2026-11-04T01:00:00.000Z' }])
  })

  it('応答に files が無ければ、空の配列', async () => {
    const calls: Call[] = []
    expect(await listProjectFiles({ token: 'tok', fetchImpl: fakeFetch(200, '{}', calls) })).toEqual([])
  })

  it('取得が失敗したら、HTTP の番号を含むエラーにする', async () => {
    const calls: Call[] = []
    await expect(listProjectFiles({ token: 'tok', fetchImpl: fakeFetch(401, '{}', calls) })).rejects.toThrow('401')
  })
})

describe('downloadJsonFromDrive（案件の中身）', () => {
  it('ファイル ID を指定し、alt=media で取り、JSON として返す', async () => {
    const calls: Call[] = []
    const json = await downloadJsonFromDrive({ token: 'tok', id: 'f1', fetchImpl: fakeFetch(200, '{"projectName":"敷地A"}', calls) })
    expect(new URL(calls[0]!.url).pathname).toBe('/drive/v3/files/f1')
    expect(new URL(calls[0]!.url).searchParams.get('alt')).toBe('media')
    expect(new Headers(calls[0]!.init?.headers).get('Authorization')).toBe('Bearer tok')
    expect(json).toEqual({ projectName: '敷地A' })
  })

  it('取得が失敗したら、HTTP の番号を含むエラーにする', async () => {
    const calls: Call[] = []
    await expect(downloadJsonFromDrive({ token: 'tok', id: 'x', fetchImpl: fakeFetch(404, '', calls) })).rejects.toThrow('404')
  })

  it('JSON として読めなければ、エラーにする', async () => {
    const calls: Call[] = []
    await expect(downloadJsonFromDrive({ token: 'tok', id: 'f1', fetchImpl: fakeFetch(200, '<html>', calls) })).rejects.toThrow()
  })
})
