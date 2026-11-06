// zip を読む（統括の依頼 2026-11-06。2-a）。無圧縮（方法 0）と deflate（方法 8）に対応する。依存は足さない（ブラウザ標準の DecompressionStream）。
const EOCD_SIG = 0x06054b50
const CEN_SIG = 0x02014b50
const LOC_SIG = 0x04034b50

async function inflateOf(method: number, raw: Uint8Array): Promise<Uint8Array> {
  if (method === 0) return raw.slice()
  if (method === 8) {
    const stream = new Blob([raw.slice() as BlobPart]).stream().pipeThrough(new DecompressionStream('deflate-raw'))
    return new Uint8Array(await new Response(stream).arrayBuffer())
  }
  throw new Error(`未対応の圧縮の方法: ${method}`)
}

/** zip の中身（名前 → 中身）を読む。zip でなければ失敗する */
export async function readZip(bytes: Uint8Array): Promise<Map<string, Uint8Array>> {
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  let eocd = -1
  for (let i = bytes.byteLength - 22; i >= Math.max(0, bytes.byteLength - 22 - 65535); i--) {
    if (v.getUint32(i, true) === EOCD_SIG) {
      eocd = i
      break
    }
  }
  if (eocd < 0) throw new Error('zip の末尾の目印が無い（zip ではない）')
  const count = v.getUint16(eocd + 10, true)
  let p = v.getUint32(eocd + 16, true)
  const dec = new TextDecoder('utf-8')
  const out = new Map<string, Uint8Array>()
  for (let i = 0; i < count; i++) {
    if (v.getUint32(p, true) !== CEN_SIG) throw new Error('zip の目録が壊れている')
    const method = v.getUint16(p + 10, true)
    const csize = v.getUint32(p + 20, true)
    const nlen = v.getUint16(p + 28, true)
    const xlen = v.getUint16(p + 30, true)
    const clen = v.getUint16(p + 32, true)
    const loc = v.getUint32(p + 42, true)
    const name = dec.decode(bytes.subarray(p + 46, p + 46 + nlen))
    if (v.getUint32(loc, true) !== LOC_SIG) throw new Error('zip の中身の位置が壊れている')
    const dstart = loc + 30 + v.getUint16(loc + 26, true) + v.getUint16(loc + 28, true)
    out.set(name, await inflateOf(method, bytes.subarray(dstart, dstart + csize)))
    p += 46 + nlen + xlen + clen
  }
  return out
}
