// 仕様: Drive へのアップロード（drive.file の権限で、アプリが作るファイルだけを扱う）。
// 仕様 1: POST https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart に送る。
// 仕様 2: Authorization は Bearer（渡されたアクセストークン）。トークンは保存しない。
// 仕様 3: 応答の JSON の id を返す。応答が正常でなければ、HTTP の状態つきのエラー。トークンは含めない。
import { describe, expect, it } from 'vitest'
import { uploadJsonToDrive } from './driveUpload'

describe('uploadJsonToDrive', () => {
  it('multipart の POST を正しい URL・Authorization で送り、id を返す', async () => {
    const calls: { url: string; init: RequestInit }[] = []
    const fetchImpl = (async (url: string, init: RequestInit) => {
      calls.push({ url, init })
      return new Response(JSON.stringify({ id: 'file-123', name: '案件.json' }), { status: 200 })
    }) as typeof fetch

    const id = await uploadJsonToDrive({ token: 'tok', name: '案件.json', json: '{"a":1}', fetchImpl, boundary: 'b1' })

    expect(id).toBe('file-123')
    expect(calls).toHaveLength(1)
    expect(calls[0]!.url).toBe('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart')
    expect(calls[0]!.init.method).toBe('POST')
    const headers = calls[0]!.init.headers as Record<string, string>
    expect(headers.Authorization).toBe('Bearer tok')
    expect(headers['Content-Type']).toBe('multipart/related; boundary=b1')
  })

  it('応答が正常でなければ、HTTP の状態を含むエラーで、トークンは含まない', async () => {
    const fetchImpl = (async () => new Response('{"error":"nope"}', { status: 403 })) as typeof fetch
    const err = await uploadJsonToDrive({ token: 'secret-tok', name: 'x.json', json: '{}', fetchImpl, boundary: 'b' }).catch((e: Error) => e)
    expect(err).toBeInstanceOf(Error)
    expect((err as Error).message).toContain('403')
    expect((err as Error).message).not.toContain('secret-tok')
  })
})
