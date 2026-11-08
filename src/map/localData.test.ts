// 仕様（利用者が置いたデータを読む）から書いたテスト。実装を読まずに書いている。
// 仕様:
// - 置かれたファイルは gzip のこともあれば、展開済みの JSON のこともある
// - 先頭が gzip（1f 8b）なら展開してから JSON として読む。そうでなければ、そのまま JSON として読む
// - 筆の識別は「地図名 + 筆ID」で行う（筆IDは地図（シート）の中でしか一意でない）
// - デモの筆は、地図名 10121_hosei_20121129083849 の筆 H000000013（地番 2-7）
import { describe, expect, it } from 'vitest'
import { gzipSync } from 'node:zlib'
import { decodeLocalJson } from './localData'
import { DEMO_PARCEL_UID } from './initialView'
import { parcelUid } from './parcelInfo'

describe('decodeLocalJson', () => {
  it('gzip で圧縮されたファイルを展開して、JSON として読む', async () => {
    const bytes = new Uint8Array(gzipSync(JSON.stringify({ features: [1, 2] })))
    await expect(decodeLocalJson(bytes)).resolves.toEqual({ features: [1, 2] })
  })

  it('展開済みの JSON は、そのまま読む', async () => {
    const bytes = new TextEncoder().encode(JSON.stringify({ roads: [] }))
    await expect(decodeLocalJson(bytes)).resolves.toEqual({ roads: [] })
  })
})

describe('parcelUid と DEMO_PARCEL_UID', () => {
  it('筆の識別子は「地図名|筆ID」になる', () => {
    expect(parcelUid({ 地図名: '10121_hosei_20121129083849', 筆ID: 'H000000013' })).toBe(
      '10121_hosei_20121129083849|H000000013',
    )
  })

  it('デモの筆は、地図名 10121 の H000000013（地番 2-7）', () => {
    expect(DEMO_PARCEL_UID).toBe('10121_hosei_20121129083849|H000000013')
  })
})
