// テスト用の最小 zip（ローカルヘッダ・中央ディレクトリ・終端レコード）と、Range 付き fetch の代用。
// 実際の PLATEAU の zip は使わない（テストに実データを入れない）。
import { Buffer } from 'node:buffer'
import { deflateRawSync } from 'node:zlib'

export interface FixtureFile {
  name: string
  data: Uint8Array
  store?: boolean
}

export function buildZip(files: FixtureFile[]): Buffer {
  const parts: Buffer[] = []
  const central: Buffer[] = []
  let offset = 0
  for (const f of files) {
    const name = Buffer.from(f.name, 'utf8')
    const method = f.store ? 0 : 8
    const comp = f.store ? Buffer.from(f.data) : deflateRawSync(f.data)
    const lh = Buffer.alloc(30)
    lh.writeUInt32LE(0x04034b50, 0)
    lh.writeUInt16LE(method, 8)
    lh.writeUInt32LE(comp.length, 18)
    lh.writeUInt32LE(f.data.length, 22)
    lh.writeUInt16LE(name.length, 26)
    parts.push(lh, name, comp)

    const cd = Buffer.alloc(46)
    cd.writeUInt32LE(0x02014b50, 0)
    cd.writeUInt16LE(method, 10)
    cd.writeUInt32LE(comp.length, 20)
    cd.writeUInt32LE(f.data.length, 24)
    cd.writeUInt16LE(name.length, 28)
    cd.writeUInt32LE(offset, 42)
    central.push(cd, name)
    offset += lh.length + name.length + comp.length
  }
  const cdBuf = Buffer.concat(central)
  const eocd = Buffer.alloc(22)
  eocd.writeUInt32LE(0x06054b50, 0)
  eocd.writeUInt16LE(files.length, 8)
  eocd.writeUInt16LE(files.length, 10)
  eocd.writeUInt32LE(cdBuf.length, 12)
  eocd.writeUInt32LE(offset, 16)
  return Buffer.concat([...parts, cdBuf, eocd])
}

// Range 付きの fetch を、メモリ上の zip で代用する。要求された範囲を ranges に記録する。
export function serveZip(zip: Buffer, ranges: string[]): typeof fetch {
  return (async (_url: string | URL | Request, init?: RequestInit) => {
    const headers = init?.headers as Record<string, string>
    const range = headers.Range ?? headers.range ?? ''
    ranges.push(range)
    const suffix = /^bytes=-(\d+)$/.exec(range)
    const span = /^bytes=(\d+)-(\d+)$/.exec(range)
    let start: number
    let end: number
    if (suffix) {
      start = Math.max(0, zip.length - Number(suffix[1]))
      end = zip.length - 1
    } else if (span) {
      start = Number(span[1])
      end = Math.min(Number(span[2]), zip.length - 1)
    } else {
      throw new Error(`想定外の Range: ${range}`)
    }
    return new Response(new Uint8Array(zip.subarray(start, end + 1)), { status: 206 })
  }) as typeof fetch
}
