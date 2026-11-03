// 仕様: zip を全部取らずに、中の 1 ファイルだけを範囲取得（HTTP Range）して展開する（PLATEAU の区の zip は約 736 MB）。
// 仕様 1: 末尾の終端レコード（EOCD）から、中央ディレクトリの位置と大きさと件数を読む。
// 仕様 2: 中央ディレクトリから、各ファイルの名前・圧縮方式・圧縮後と展開後のサイズ・ローカルヘッダの位置を読む。
// 仕様 3: 名前を指定すると、そのファイルを展開して返す（deflate と無圧縮の両方）。
// 仕様 4: 無い名前を指定したらエラー（名前を含むメッセージ）。
// 仕様 5: 1 ファイルを読むために、zip 全体を取らない（取った合計バイトは zip 全体の半分未満）。
import { describe, expect, it } from 'vitest'
import { randomBytes } from 'node:crypto'
import { openZip, parseCentralDirectory, parseEocd } from './zipRange'
import { buildZip, serveZip, type FixtureFile } from './zipFixture'

// 取った範囲の合計バイト数（suffix は要求の長さ、a-b は b - a + 1）
function requestedBytes(ranges: string[]): number {
  let total = 0
  for (const r of ranges) {
    const suffix = /^bytes=-(\d+)$/.exec(r)
    const span = /^bytes=(\d+)-(\d+)$/.exec(r)
    if (suffix) total += Number(suffix[1])
    else if (span) total += Number(span[2]) - Number(span[1]) + 1
  }
  return total
}

const TEXT = 'hello building '.repeat(200)
const files: FixtureFile[] = [
  { name: 'udx/bldg/53394603_bldg_6697_op.gml', data: new TextEncoder().encode(TEXT) },
  { name: 'udx/bldg/53394604_bldg_6697_op.gml', data: new TextEncoder().encode('second file') },
]

describe('parseEocd（終端レコード）', () => {
  it('中央ディレクトリの位置・大きさ・件数を読む', () => {
    const zip = buildZip(files)
    const eocd = parseEocd(new Uint8Array(zip))
    expect(eocd.entryCount).toBe(2)
    expect(eocd.cdOffset + eocd.cdSize).toBe(zip.length - 22)
  })

  it('終端レコードが無ければエラー', () => {
    expect(() => parseEocd(new Uint8Array(100))).toThrow()
  })
})

describe('parseCentralDirectory（中央ディレクトリ）', () => {
  it('各ファイルの名前・圧縮方式・サイズ・ローカルヘッダの位置を読む', () => {
    const zip = buildZip(files)
    const eocd = parseEocd(new Uint8Array(zip))
    const entries = parseCentralDirectory(new Uint8Array(zip.subarray(eocd.cdOffset, eocd.cdOffset + eocd.cdSize)))
    expect(entries.map((e) => e.name)).toEqual(files.map((f) => f.name))
    expect(entries[0]!.method).toBe(8)
    expect(entries[0]!.usize).toBe(TEXT.length)
    expect(entries[0]!.lho).toBe(0)
    expect(entries[1]!.lho).toBeGreaterThan(0)
  })
})

describe('openZip（範囲取得で 1 ファイルを読む）', () => {
  it('名前を指定すると、そのファイルを展開して返す', async () => {
    const zip = buildZip(files)
    const ranges: string[] = []
    const z = await openZip('https://example.test/ward.zip', serveZip(zip, ranges))
    const bytes = await z.read('udx/bldg/53394603_bldg_6697_op.gml')
    expect(new TextDecoder().decode(bytes)).toBe(TEXT)
  })

  it('無圧縮（method 0）のファイルもそのまま返す', async () => {
    const zip = buildZip([{ name: 'codelists/a.xml', data: new TextEncoder().encode('plain'), store: true }])
    const z = await openZip('https://example.test/ward.zip', serveZip(zip, []))
    expect(new TextDecoder().decode(await z.read('codelists/a.xml'))).toBe('plain')
  })

  it('無い名前はエラー（名前を含む）', async () => {
    const z = await openZip('https://example.test/ward.zip', serveZip(buildZip(files), []))
    await expect(z.read('udx/bldg/none.gml')).rejects.toThrow('udx/bldg/none.gml')
  })

  it('1 ファイルを読むために、zip 全体を取らない', async () => {
    const big = { name: 'udx/bldg/big.gml', data: new Uint8Array(randomBytes(200_000)), store: true }
    const small = { name: 'udx/bldg/small.gml', data: new TextEncoder().encode('small') }
    const zip = buildZip([big, small])
    const ranges: string[] = []
    const z = await openZip('https://example.test/ward.zip', serveZip(zip, ranges))
    await z.read('udx/bldg/small.gml')
    expect(requestedBytes(ranges)).toBeLessThan(zip.length / 2)
  })
})
