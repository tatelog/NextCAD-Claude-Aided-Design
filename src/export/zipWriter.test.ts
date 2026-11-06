// 仕様（統括の依頼 2026-11-06。1-b: zip は自前の無圧縮（STORE）。依存は足さない）:
// Z1: CRC-32 は標準の値（"123456789" は 0xCBF43926）。
// Z2: 書いた zip は、読み戻すと名前と中身が同じ（日本語の名前も）。
// Z3: 同じ名前を二度入れたら、書かずに失敗する。
// Z4: 中身が空のファイルも入る。
import { describe, expect, it } from 'vitest'
import { buildZip, crc32 } from './zipWriter'

// 試験の中だけで読む（書き出しと同じ構造を、逆向きにたどる）
function readZip(zip: Uint8Array): { path: string; data: Uint8Array; crc: number }[] {
  const v = new DataView(zip.buffer, zip.byteOffset, zip.byteLength)
  const eocd = zip.byteLength - 22
  expect(v.getUint32(eocd, true)).toBe(0x06054b50)
  const count = v.getUint16(eocd + 10, true)
  let p = v.getUint32(eocd + 16, true)
  const dec = new TextDecoder()
  const out: { path: string; data: Uint8Array; crc: number }[] = []
  for (let i = 0; i < count; i++) {
    expect(v.getUint32(p, true)).toBe(0x02014b50)
    const crc = v.getUint32(p + 16, true)
    const size = v.getUint32(p + 20, true)
    const nameLen = v.getUint16(p + 28, true)
    const local = v.getUint32(p + 42, true)
    const path = dec.decode(zip.subarray(p + 46, p + 46 + nameLen))
    expect(v.getUint32(local, true)).toBe(0x04034b50)
    const dataStart = local + 30 + v.getUint16(local + 26, true)
    out.push({ path, data: zip.subarray(dataStart, dataStart + size), crc })
    p += 46 + nameLen
  }
  return out
}

describe('zip の書き出し（仕様 Z1〜Z4）', () => {
  it('Z1: CRC-32 は標準の値', () => {
    expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926)
  })

  it('Z2: 書いた zip は、読み戻すと名前と中身が同じ（日本語の名前も）', () => {
    const enc = new TextEncoder()
    const zip = buildZip([
      { path: '00_書類一覧.txt', data: enc.encode('要る（1）\n確認申請書') },
      { path: '02_図面/図枠.svg', data: enc.encode('<svg></svg>') },
    ])
    const back = readZip(zip)
    expect(back.map((e) => e.path)).toEqual(['00_書類一覧.txt', '02_図面/図枠.svg'])
    expect(new TextDecoder().decode(back[0]!.data)).toBe('要る（1）\n確認申請書')
    expect(back[1]!.crc).toBe(crc32(enc.encode('<svg></svg>')))
  })

  it('Z3: 同じ名前を二度入れたら失敗する', () => {
    const enc = new TextEncoder()
    expect(() => buildZip([{ path: 'a.txt', data: enc.encode('1') }, { path: 'a.txt', data: enc.encode('2') }])).toThrow()
  })

  it('Z4: 中身が空のファイルも入る', () => {
    const back = readZip(buildZip([{ path: '空.txt', data: new Uint8Array() }]))
    expect(back).toHaveLength(1)
    expect(back[0]!.data.byteLength).toBe(0)
  })
})
