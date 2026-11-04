// 仕様（P1 の郵便番号検索）から書いたテスト。実装を読まずに書いている。
// 仕様:
// - 郵便番号は 7 桁。ハイフン・空白・「〒」は無視して受け付ける（例: 〒135-8383 → 1358383）
// - 7 桁でない入力は、郵便番号の検索（引き当て）より前にエラーにする
// - 郵便番号から住所の文字列（都道府県・市区町村・町域）を引く（引き当ては外から渡す）
// - 引いた住所の文字列を、住所検索（国土地理院）で経緯度の候補にする
// - 候補は住所名と座標の組で重複をなくして返す。引き当てが 0 件なら空配列
// - 引き当て・住所検索が失敗したら、エラーをそのまま伝える
import { describe, expect, it, vi } from 'vitest'
import { normalizePostalCode, searchPostal } from './postal'
import type { AddressCandidate } from './gsiAddress'

describe('normalizePostalCode', () => {
  it('ハイフン・空白・「〒」を無視して、7 桁の数字にする', () => {
    expect(normalizePostalCode('135-8383')).toBe('1358383')
    expect(normalizePostalCode('1358383')).toBe('1358383')
    expect(normalizePostalCode('〒135-8383')).toBe('1358383')
    expect(normalizePostalCode(' 135 8383 ')).toBe('1358383')
  })

  it('7 桁でない入力は、エラーにする', () => {
    expect(() => normalizePostalCode('13583')).toThrow()
    expect(() => normalizePostalCode('135-83838')).toThrow()
  })

  it('数字でない入力は、エラーにする', () => {
    expect(() => normalizePostalCode('abc1234')).toThrow()
  })
})

describe('searchPostal', () => {
  const CANDIDATE: AddressCandidate = { title: '東京都江東区東陽四丁目１１番２８号', lon: 139.81636, lat: 35.672993 }

  it('郵便番号を正規化してから引き当て、引いた住所ごとに住所検索して候補を返す', async () => {
    const lookupAddresses = vi.fn(async (_code: string) => ['東京都江東区東陽4丁目'])
    const searchAddr = vi.fn(async (_q: string) => [CANDIDATE])
    const result = await searchPostal('〒135-8383', { lookupAddresses, searchAddr })
    expect(lookupAddresses).toHaveBeenCalledWith('1358383')
    expect(searchAddr).toHaveBeenCalledWith('東京都江東区東陽4丁目')
    expect(result).toEqual([CANDIDATE])
  })

  it('同じ座標・住所名の候補は、一つにまとめる', async () => {
    const lookupAddresses = async () => ['東京都江東区東陽4丁目', '東京都江東区東陽']
    const searchAddr = async () => [CANDIDATE]
    const result = await searchPostal('1358383', { lookupAddresses, searchAddr })
    expect(result).toEqual([CANDIDATE])
  })

  it('引き当てが 0 件なら、空の配列を返す（住所検索はしない）', async () => {
    const searchAddr = vi.fn(async (_q: string) => [CANDIDATE])
    const result = await searchPostal('1000000', { lookupAddresses: async () => [], searchAddr })
    expect(result).toEqual([])
    expect(searchAddr).not.toHaveBeenCalled()
  })

  it('7 桁でない入力は、引き当てる前にエラーにする', async () => {
    const lookupAddresses = vi.fn(async (_code: string) => ['東京都江東区東陽4丁目'])
    await expect(searchPostal('13583', { lookupAddresses, searchAddr: async () => [] })).rejects.toThrow()
    expect(lookupAddresses).not.toHaveBeenCalled()
  })

  it('引き当てが失敗したら、そのエラーを伝える', async () => {
    await expect(
      searchPostal('1358383', {
        lookupAddresses: async () => {
          throw new Error('引き当て失敗')
        },
        searchAddr: async () => [],
      }),
    ).rejects.toThrow('引き当て失敗')
  })
})
