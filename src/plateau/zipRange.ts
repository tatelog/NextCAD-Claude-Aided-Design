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

async function rangeGet(url: string, range: string, fetchImpl: typeof fetch): Promise<Uint8Array> {
  const res = await fetchImpl(url, { headers: { Range: range } })
  if (res.status !== 206) throw new Error(`範囲取得に失敗しました（${res.status}）`)
  return new Uint8Array(await res.arrayBuffer())
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
