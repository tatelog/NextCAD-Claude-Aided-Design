// 仕様（P1 の住所検索）から書いたテスト。実装を読まずに書いている。
// 仕様:
// - 住所文字列は国土地理院の住所検索 API（AddressSearch）の q に入れて呼ぶ
// - 応答は [{ geometry: { type: 'Point', coordinates: [経度, 緯度] }, properties: { title } }] の配列
// - 応答の各要素から、候補の住所名（title）・経度・緯度を取り出す。0 件なら空配列
// - 形が違う応答は、エラーにする（黙って空にしない）
// - 空白だけの入力では、通信しない
// - HTTP が 2xx 以外なら、エラーにする
// - 通信が失敗したら、エラーをそのまま伝える
import { describe, expect, it, vi } from 'vitest'
import { addressSearchUrl, parseAddressSearch, searchAddress } from './gsiAddress'

// 実 API の応答（東京都江東区東陽4-11-28 の検索結果）
const REAL_RESPONSE = [
  {
    geometry: { coordinates: [139.81636, 35.672993], type: 'Point' },
    type: 'Feature',
    properties: { addressCode: '', title: '東京都江東区東陽四丁目１１番２８号' },
  },
]

describe('addressSearchUrl', () => {
  it('住所文字列を q に入れた、国土地理院の住所検索 URL を作る', () => {
    const url = addressSearchUrl('東京都江東区東陽4-11-28')
    expect(url.startsWith('https://msearch.gsi.go.jp/address-search/AddressSearch?')).toBe(true)
    const q = new URL(url).searchParams.get('q')
    expect(q).toBe('東京都江東区東陽4-11-28')
  })
})

describe('parseAddressSearch', () => {
  it('応答の各要素から、住所名・経度・緯度を取り出す（座標は [経度, 緯度] の順）', () => {
    expect(parseAddressSearch(REAL_RESPONSE)).toEqual([
      { title: '東京都江東区東陽四丁目１１番２８号', lon: 139.81636, lat: 35.672993 },
    ])
  })

  it('0 件の応答は、空の配列にする', () => {
    expect(parseAddressSearch([])).toEqual([])
  })

  it('座標のない応答は、エラーにする（黙って空にしない）', () => {
    expect(() => parseAddressSearch([{ type: 'Feature', properties: { title: 'x' } }])).toThrow()
  })

  it('配列でない応答は、エラーにする', () => {
    expect(() => parseAddressSearch({ error: 'x' })).toThrow()
  })
})

describe('searchAddress', () => {
  it('空白だけの入力では、通信せず空の配列を返す', async () => {
    const fetchFn = vi.fn()
    await expect(searchAddress('   ', fetchFn as unknown as typeof fetch)).resolves.toEqual([])
    expect(fetchFn).not.toHaveBeenCalled()
  })

  it('入力を使って住所検索 URL に 1 回だけ通信し、結果の候補を返す', async () => {
    const fetchFn = vi.fn(async (_url: string) => new Response(JSON.stringify(REAL_RESPONSE), { status: 200 }))
    const result = await searchAddress('東京都江東区東陽4-11-28', fetchFn as unknown as typeof fetch)
    expect(fetchFn).toHaveBeenCalledTimes(1)
    expect(fetchFn.mock.calls[0]?.[0]).toBe(addressSearchUrl('東京都江東区東陽4-11-28'))
    expect(result).toEqual([{ title: '東京都江東区東陽四丁目１１番２８号', lon: 139.81636, lat: 35.672993 }])
  })

  it('HTTP が 2xx 以外なら、エラーにする', async () => {
    const fetchFn = vi.fn(async () => new Response('err', { status: 500 }))
    await expect(searchAddress('東京', fetchFn as unknown as typeof fetch)).rejects.toThrow()
  })

  it('通信が失敗したら、そのエラーを伝える', async () => {
    const fetchFn = vi.fn(async () => {
      throw new TypeError('Failed to fetch')
    })
    await expect(searchAddress('東京', fetchFn as unknown as typeof fetch)).rejects.toThrow('Failed to fetch')
  })
})
