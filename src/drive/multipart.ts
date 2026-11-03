// Google Drive の multipart アップロードの本文（Drive の「ファイルをアップロードする」の手順）。決定論。
// 本文は metadata（JSON）と media（内容）の 2 部分。境界は呼び出し側が決める（本文に現れない文字列）。
export interface DriveMultipartInput {
  metadata: Record<string, unknown>
  content: string
  contentType: string
  boundary: string
}

export function buildDriveMultipart(input: DriveMultipartInput): { contentType: string; body: string } {
  const b = input.boundary
  const body =
    `--${b}\r\n` +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    `${JSON.stringify(input.metadata)}\r\n` +
    `--${b}\r\n` +
    `Content-Type: ${input.contentType}\r\n\r\n` +
    `${input.content}\r\n` +
    `--${b}--`
  return { contentType: `multipart/related; boundary=${b}`, body }
}
