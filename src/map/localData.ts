// 利用者が置いたデータを、JSON として読む。gzip（先頭 1f 8b）なら展開し、そうでなければそのまま読む。
export async function decodeLocalJson(bytes: Uint8Array): Promise<unknown> {
  let text: string
  if (bytes[0] === 0x1f && bytes[1] === 0x8b) {
    const stream = new Blob([new Uint8Array(bytes)]).stream().pipeThrough(new DecompressionStream('gzip'))
    text = await new Response(stream).text()
  } else {
    text = new TextDecoder().decode(bytes)
  }
  return JSON.parse(text)
}
