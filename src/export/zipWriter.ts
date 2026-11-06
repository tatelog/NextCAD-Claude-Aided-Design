// 無圧縮（STORE）の zip を書く。Uint8Array と TextEncoder だけを使うので、ブラウザでも Node でも動く（統括の依頼 2026-11-06。1-b。依存は足さない）。
export interface ZipEntry {
  path: string
  data: Uint8Array
}

const TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

/** CRC-32（zip の検査値） */
export function crc32(data: Uint8Array): number {
  let c = 0xffffffff
  for (let i = 0; i < data.length; i++) c = TABLE[(c ^ data[i]!) & 0xff]! ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

const enc = new TextEncoder()
/** 日付は 1980-01-01 00:00 に固定（中身の時刻に依存させない） */
const DOS_DATE = 0x0021
const FLAG_UTF8 = 0x0800
const VERSION = 20

/** エントリを zip にまとめる。同じ名前が二つあれば失敗する */
export function buildZip(entries: readonly ZipEntry[]): Uint8Array {
  const seen = new Set<string>()
  const items = entries.map((e) => {
    if (seen.has(e.path)) throw new Error(`同じ名前のファイルが二つある: ${e.path}`)
    seen.add(e.path)
    return { name: enc.encode(e.path), data: e.data, crc: crc32(e.data) }
  })
  const localLen = (it: (typeof items)[number]) => 30 + it.name.length + it.data.length
  const centralLen = (it: (typeof items)[number]) => 46 + it.name.length
  const total = items.reduce((s, it) => s + localLen(it) + centralLen(it), 0) + 22
  const out = new Uint8Array(total)
  const v = new DataView(out.buffer)
  const offsets: number[] = []
  let pos = 0
  for (const it of items) {
    offsets.push(pos)
    v.setUint32(pos, 0x04034b50, true)
    v.setUint16(pos + 4, VERSION, true)
    v.setUint16(pos + 6, FLAG_UTF8, true)
    v.setUint16(pos + 8, 0, true)
    v.setUint16(pos + 10, 0, true)
    v.setUint16(pos + 12, DOS_DATE, true)
    v.setUint32(pos + 14, it.crc, true)
    v.setUint32(pos + 18, it.data.length, true)
    v.setUint32(pos + 22, it.data.length, true)
    v.setUint16(pos + 26, it.name.length, true)
    v.setUint16(pos + 28, 0, true)
    out.set(it.name, pos + 30)
    out.set(it.data, pos + 30 + it.name.length)
    pos += localLen(it)
  }
  const cdStart = pos
  items.forEach((it, i) => {
    v.setUint32(pos, 0x02014b50, true)
    v.setUint16(pos + 4, VERSION, true)
    v.setUint16(pos + 6, VERSION, true)
    v.setUint16(pos + 8, FLAG_UTF8, true)
    v.setUint16(pos + 10, 0, true)
    v.setUint16(pos + 12, 0, true)
    v.setUint16(pos + 14, DOS_DATE, true)
    v.setUint32(pos + 16, it.crc, true)
    v.setUint32(pos + 20, it.data.length, true)
    v.setUint32(pos + 24, it.data.length, true)
    v.setUint16(pos + 28, it.name.length, true)
    v.setUint16(pos + 30, 0, true)
    v.setUint16(pos + 32, 0, true)
    v.setUint16(pos + 34, 0, true)
    v.setUint16(pos + 36, 0, true)
    v.setUint32(pos + 38, 0, true)
    v.setUint32(pos + 42, offsets[i]!, true)
    out.set(it.name, pos + 46)
    pos += centralLen(it)
  })
  v.setUint32(pos, 0x06054b50, true)
  v.setUint16(pos + 4, 0, true)
  v.setUint16(pos + 6, 0, true)
  v.setUint16(pos + 8, items.length, true)
  v.setUint16(pos + 10, items.length, true)
  v.setUint32(pos + 12, pos - cdStart, true)
  v.setUint32(pos + 16, cdStart, true)
  v.setUint16(pos + 20, 0, true)
  return out
}
