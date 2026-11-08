// zip を全部取らずに、中の 1 ファイルだけを HTTP Range で取って展開する（PLATEAU の区の zip 用）。
// 手順: 末尾の終端レコード（EOCD）→ 中央ディレクトリ → 対象のローカルヘッダ → 圧縮データ → 展開（deflate-raw）。
// 圧縮方式は 0（無圧縮）と 8（deflate）だけ対応する。zip64 は対象外（PLATEAU の区の zip は 4 GB 未満）。

const EOCD_SIG = 0x06054b50
const CD_SIG = 0x02014b50
// 終端レコードはコメント（最大 65535 バイト）の後ろにあるので、末尾 22 + 65535 バイトを見ればよい
const TAIL_BYTES = 22 + 65535

export interface ZipEntry {
  name: string
  method: number
  csize: number
  usize: number
  /** ローカルヘッダの位置（zip の先頭からのバイト数） */
  lho: number
}

export interface ZipIndex {
  entries: ZipEntry[]
  /** 名前を指定して、そのファイルを展開したバイト列を返す */
  read(name: string): Promise<Uint8Array>
}

export function parseEocd(tail: Uint8Array): { cdOffset: number; cdSize: number; entryCount: number } {
  const view = new DataView(tail.buffer, tail.byteOffset, tail.byteLength)
  for (let i = tail.length - 22; i >= 0; i--) {
    if (view.getUint32(i, true) === EOCD_SIG) {
      return {
        entryCount: view.getUint16(i + 10, true),
        cdSize: view.getUint32(i + 12, true),
        cdOffset: view.getUint32(i + 16, true),
      }
    }
  }
  throw new Error('zip の終端レコードが見つからない')
}

export function parseCentralDirectory(bytes: Uint8Array): ZipEntry[] {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const decoder = new TextDecoder()
  const entries: ZipEntry[] = []
  let p = 0
  while (p + 46 <= bytes.length && view.getUint32(p, true) === CD_SIG) {
    const nameLength = view.getUint16(p + 28, true)
    const extraLength = view.getUint16(p + 30, true)
    const commentLength = view.getUint16(p + 32, true)
    entries.push({
      name: decoder.decode(bytes.subarray(p + 46, p + 46 + nameLength)),
      method: view.getUint16(p + 10, true),
      csize: view.getUint32(p + 20, true),
      usize: view.getUint32(p + 24, true),
      lho: view.getUint32(p + 42, true),
    })
    p += 46 + nameLength + extraLength + commentLength
  }
  return entries
}

// 範囲取得の 1 回の要求は、一時の失敗（通信の失敗・502 などの中継の失敗・本文が途中で切れた応答）なら、取り直す（統括の依頼 2026-11-06。A）
const RANGE_TRIES = 3

// 本文の長さが、content-range（無ければ要求の範囲）と合うか。途中で切れた応答を見分ける
function lengthMatches(contentRange: string | null, range: string, actual: number): boolean {
  const cr = /^bytes (\d+)-(\d+)\//.exec(contentRange ?? '')
  if (cr) return actual === Number(cr[2]) - Number(cr[1]) + 1
  const span = /^bytes=(\d+)-(\d+)$/.exec(range)
  return span ? actual === Number(span[2]) - Number(span[1]) + 1 : true
}

async function rangeGet(url: string, range: string, fetchImpl: typeof fetch): Promise<Uint8Array> {
  let last = ''
  let lastError: unknown = null
  for (let attempt = 1; attempt <= RANGE_TRIES; attempt++) {
    lastError = null
    try {
      const res = await fetchImpl(url, { headers: { Range: range } })
      if (res.status !== 206) {
        last = `範囲取得に失敗しました（${res.status}）`
        continue
      }
      const bytes = new Uint8Array(await res.arrayBuffer())
      if (!lengthMatches(res.headers.get('content-range'), range, bytes.length)) {
        last = '範囲取得の応答が途中で切れました'
        continue
      }
      return bytes
    } catch (e) {
      lastError = e
      last = e instanceof Error ? e.message : String(e)
    }
  }
  // 接続そのものの失敗は、既存の変換（周辺建物の文言）のため TypeError のまま投げる
  if (lastError instanceof TypeError) throw lastError
  throw new Error(`${last}（${RANGE_TRIES} 回取り直したが取れなかった。通信か中継を確かめて、もう一度試してください）`)
}

async function inflateRaw(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([bytes as BlobPart]).stream().pipeThrough(new DecompressionStream('deflate-raw'))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

export async function openZip(url: string, fetchImpl: typeof fetch = fetch): Promise<ZipIndex> {
  const eocd = parseEocd(await rangeGet(url, `bytes=-${TAIL_BYTES}`, fetchImpl))
  const cd = await rangeGet(url, `bytes=${eocd.cdOffset}-${eocd.cdOffset + eocd.cdSize - 1}`, fetchImpl)
  const entries = parseCentralDirectory(cd)
  const byName = new Map(entries.map((e) => [e.name, e]))

  return {
    entries,
    async read(name: string): Promise<Uint8Array> {
      const entry = byName.get(name)
      if (!entry) throw new Error(`zip に無いファイル: ${name}`)
      const head = await rangeGet(url, `bytes=${entry.lho}-${entry.lho + 29}`, fetchImpl)
      const headView = new DataView(head.buffer, head.byteOffset, head.byteLength)
      const dataStart = entry.lho + 30 + headView.getUint16(26, true) + headView.getUint16(28, true)
      const compressed =
        entry.csize === 0 ? new Uint8Array(0) : await rangeGet(url, `bytes=${dataStart}-${dataStart + entry.csize - 1}`, fetchImpl)
      if (entry.method === 0) return compressed
      if (entry.method === 8) return inflateRaw(compressed)
      throw new Error(`未対応の圧縮方式: ${entry.method}（${name}）`)
    },
  }
}
