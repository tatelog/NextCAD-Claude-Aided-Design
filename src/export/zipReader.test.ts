// 仕様（統括の依頼 2026-11-06。2-a: 東京都の Word を取り込むための zip の読み）:
// R1: 無圧縮（STORE）の zip を読むと、名前と中身が同じ。
// R2: 圧縮（deflate）の zip も読める（Word の docx は圧縮されている）。
// R3: zip でないもの、末尾の目印が無いものは、読まずに失敗する。
import { deflateRawSync } from 'node:zlib'
import { describe, expect, it } from 'vitest'
import { buildZip, crc32 } from './zipWriter'
import { readZip } from './zipReader'

// 圧縮（deflate）の zip を作る試験用の部品（書き出しは使わない。読みの確認のため）
function zipWithDeflate(path: string, data: Uint8Array): Uint8Array {
  const name = new TextEncoder().encode(path)
  const comp = new Uint8Array(deflateRawSync(data))
  const crc = crc32(data)
  const local = new Uint8Array(30 + name.length + comp.length)
  const lv = new DataView(local.buffer)
  lv.setUint32(0, 0x04034b50, true)
  lv.setUint16(4, 20, true)
  lv.setUint16(6, 0x0800, true)
  lv.setUint16(8, 8, true)
  lv.setUint32(14, crc, true)
  lv.setUint32(18, comp.length, true)
  lv.setUint32(22, data.length, true)
  lv.setUint16(26, name.length, true)
  local.set(name, 30)
  local.set(comp, 30 + name.length)
  const cd = new Uint8Array(46 + name.length)
  const cv = new DataView(cd.buffer)
  cv.setUint32(0, 0x02014b50, true)
  cv.setUint16(4, 20, true)
  cv.setUint16(6, 20, true)
  cv.setUint16(8, 0x0800, true)
  cv.setUint16(10, 8, true)
  cv.setUint32(16, crc, true)
  cv.setUint32(20, comp.length, true)
  cv.setUint32(24, data.length, true)
  cv.setUint16(28, name.length, true)
  cv.setUint32(42, 0, true)
  cd.set(name, 46)
  const end = new Uint8Array(22)
  const ev = new DataView(end.buffer)
  ev.setUint32(0, 0x06054b50, true)
  ev.setUint16(8, 1, true)
  ev.setUint16(10, 1, true)
  ev.setUint32(12, cd.length, true)
  ev.setUint32(16, local.length, true)
  const out = new Uint8Array(local.length + cd.length + end.length)
  out.set(local, 0)
  out.set(cd, local.length)
  out.set(end, local.length + cd.length)
  return out
}

describe('zip の読み（仕様 R1〜R3）', () => {
  it('R1: 無圧縮の zip は、名前と中身が同じに読める', async () => {
    const enc = new TextEncoder()
    const zip = buildZip([
      { path: 'word/document.xml', data: enc.encode('<w:document/>') },
      { path: 'a/日本語.txt', data: enc.encode('確認申請') },
    ])
    const m = await readZip(zip)
    expect([...m.keys()]).toEqual(['word/document.xml', 'a/日本語.txt'])
    expect(new TextDecoder().decode(m.get('a/日本語.txt')!)).toBe('確認申請')
  })

  it('R2: 圧縮（deflate）の zip も、中身が同じに読める', async () => {
    const data = new TextEncoder().encode('<w:p><w:t>第二号様式</w:t></w:p>'.repeat(20))
    const m = await readZip(zipWithDeflate('word/document.xml', data))
    expect(m.get('word/document.xml')).toEqual(data)
  })

  it('R3: zip でないものは失敗する', async () => {
    await expect(readZip(new TextEncoder().encode('これは zip ではない'))).rejects.toThrow()
  })
})
