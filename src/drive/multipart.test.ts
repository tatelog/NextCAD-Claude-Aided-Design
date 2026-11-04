// 仕様: Google Drive の multipart アップロードの本文（Drive の「ファイルをアップロードする」の手順）。
// 仕様 1: Content-Type は multipart/related; boundary=… で、境界の文字列を含む。
// 仕様 2: 本文は 2 つの部分。1 つ目は metadata（application/json; charset=UTF-8）、2 つ目は media（指定の MIME 型）。
// 仕様 3: 境界の行は先頭に -- を付け、最後の境界は -- で閉じる。
// 仕様 4: 本文の JSON は metadata をそのまま入れる（順序も含めて決定論）。
import { describe, expect, it } from 'vitest'
import { buildDriveMultipart } from './multipart'

describe('buildDriveMultipart（Drive の multipart 本文）', () => {
  const built = buildDriveMultipart({
    metadata: { name: '案件.json' },
    content: '{"a":1}',
    contentType: 'application/json',
    boundary: 'bnd_test',
  })

  it('Content-Type に境界を入れる', () => {
    expect(built.contentType).toBe('multipart/related; boundary=bnd_test')
  })

  it('metadata を先、media を後に置き、境界は -- で始め最後は -- で閉じる', () => {
    expect(built.body).toBe(
      '--bnd_test\r\n' +
        'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
        '{"name":"案件.json"}\r\n' +
        '--bnd_test\r\n' +
        'Content-Type: application/json\r\n\r\n' +
        '{"a":1}\r\n' +
        '--bnd_test--',
    )
  })
})
