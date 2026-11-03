// 仕様（ハブ A-03 G20・G72。利用者が置く単価は案件のファイルに入れる）: P4 で利用者が入れた単価（品目ごとの入力の文字）は、保存と読み込みで戻る。
// 仕様 1: 空でない単価の入力は、保存のデータに unitPriceTexts として入る。入力が無ければ項目ごと付けない。
// 仕様 2: 読み込みで、保存された単価の入力が戻る（品目ごとの文字）。単価が無い古い保存も読める。
// 仕様 3: 単価の入力が文字（string）でなければ、読み込みで弾く。
import { describe, expect, it } from 'vitest'
import { buildSaveData } from './saveData'
import { parseSaveData } from './loadData'

const base = { projectName: '試し', entries: [], storeyCount: 3, storeyHeightMm: 3000, savedAt: new Date('2026-11-04T00:00:00.000Z') }

describe('利用者が入れた単価の保存（仕様 1〜3）', () => {
  it('仕様 1: 空でない単価の入力を保存に入れ、無ければ項目ごと付けない', () => {
    const data = buildSaveData({ ...base, unitPriceTexts: { 'キッチン': '250000', '便器': '' } })
    expect(data.unitPriceTexts).toEqual({ キッチン: '250000' })
    expect(buildSaveData({ ...base, unitPriceTexts: { 便器: '' } })).not.toHaveProperty('unitPriceTexts')
    expect(buildSaveData(base)).not.toHaveProperty('unitPriceTexts')
  })

  it('仕様 2: 読み込みで、保存された単価の入力が戻る。単価の無い古い保存も読める', () => {
    const saved = JSON.parse(JSON.stringify(buildSaveData({ ...base, unitPriceTexts: { キッチン: '250000' } })))
    expect(parseSaveData(saved).unitPriceTexts).toEqual({ キッチン: '250000' })
    const old = JSON.parse(JSON.stringify(buildSaveData(base)))
    expect(parseSaveData(old).unitPriceTexts).toEqual({})
  })

  it('仕様 3: 単価の入力が文字でなければ、読み込みで弾く', () => {
    const bad = JSON.parse(JSON.stringify(buildSaveData(base)))
    bad.unitPriceTexts = { キッチン: 250000 }
    expect(() => parseSaveData(bad)).toThrow()
  })
})
