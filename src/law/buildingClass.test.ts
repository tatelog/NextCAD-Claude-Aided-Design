// 仕様（ハブ A-03 G28・D-02 C11。出典: e-Gov 法令 API 建築基準法（325AC0000000201）を 2026-11-04 に WebFetch で確認。第20条は抜粋の範囲で、逐語の一部は要約）:
// 法第6条第1項の号区分（確認申請の対象）と、法第20条第1項の号区分（構造計算の対象）を、建物の事実（構造・高さ・階数・床面積）から決める。決定論。
// 6 条 1 項: 第一号 = 別表第一（い）欄の特殊建築物で、用途部分の床面積の合計が 200 ㎡超。第二号 = 第一号を除き、2 階以上 または 延べ面積 200 ㎡超。
//   第三号 = 第一・第二号を除き、都市計画区域・準都市計画区域内。区域外で第一・第二号に当たらないものは対象外。
// 20 条 1 項: 第一号 = 高さ 60 m 超。第二号 = 60 m 以下で、木造は地階を除く階数 4 以上 または高さ 16 m 超、木造以外は階数 4 以上の鉄骨造、高さ 20 m 超の RC・SRC。
//   第三号 = 第二号を除き、6 条 1 項 1 号 または 2 号の建築物（木造は階数 3 以上 または 延べ面積 300 ㎡ 超に限る）。第四号 = それ以外。
// 仕様 1: 特殊建築物の用途部分が 200 ㎡超なら、6 条 1 項 1 号。
// 仕様 2: 特殊建築物でなくても、2 階以上か延べ面積 200 ㎡超なら 2 号。どちらも満たさず区域内なら 3 号、区域外なら対象外。
// 仕様 3: 20 条 1 項: RC で高さ 20 m 超は第二号。60 m 超は第一号。
// 仕様 4: 20 条 1 項: RC で高さ 20 m 以下でも、6 条 1 項 1 号・2 号に当たれば第三号。当たらなければ第四号。
// 仕様 5: 20 条 1 項: 木造で 4 階以上 または 高さ 16 m 超なら第二号。木造で 3 階以下・300 ㎡ 以下・16 m 以下は第四号。
// 仕様 6: 20 条 1 項: 鉄骨造で地上 4 階以上は第二号。
import { describe, expect, it } from 'vitest'
import { article20Class, article6Class, classLabelsOf, type BuildingFacts } from './buildingClass'

const RC_SMALL: BuildingFacts = { structure: 'RC', heightM: 15, aboveGroundStoreys: 5, totalFloorAreaM2: 2000, specialUseAreaM2: 2000, inPlanningArea: true }

describe('法 6 条 1 項の号区分（仕様 1・2）', () => {
  it('仕様 1: 特殊建築物の用途部分が 200 ㎡超なら 1 号', () => {
    expect(article6Class(RC_SMALL)).toBe(1)
    expect(article6Class({ ...RC_SMALL, specialUseAreaM2: 200 })).toBe(2)
  })

  it('仕様 2: 特殊建築物でも、2 階以上か延べ面積 200 ㎡超なら 2 号。どちらでもなければ区域内は 3 号、区域外は対象外', () => {
    const small: BuildingFacts = { structure: 'RC', heightM: 4, aboveGroundStoreys: 1, totalFloorAreaM2: 150, specialUseAreaM2: 0, inPlanningArea: true }
    expect(article6Class(small)).toBe(3)
    expect(article6Class({ ...small, inPlanningArea: false })).toBe('対象外')
    expect(article6Class({ ...small, aboveGroundStoreys: 2 })).toBe(2)
  })
})

describe('法 20 条 1 項の号区分（仕様 3〜6）', () => {
  it('仕様 3: RC で高さ 20 m 超は 2 号、60 m 超は 1 号', () => {
    expect(article20Class({ ...RC_SMALL, heightM: 25 })).toBe(2)
    expect(article20Class({ ...RC_SMALL, heightM: 61 })).toBe(1)
  })

  it('仕様 4: RC で高さ 20 m 以下でも、6 条 1 項 1 号・2 号なら 3 号。当たらなければ 4 号', () => {
    expect(article20Class(RC_SMALL)).toBe(3)
    const none: BuildingFacts = { structure: 'RC', heightM: 4, aboveGroundStoreys: 1, totalFloorAreaM2: 150, specialUseAreaM2: 0, inPlanningArea: true }
    expect(article20Class(none)).toBe(4)
  })

  it('仕様 5: 木造は 4 階以上、または高さ 16 m 超で 2 号。3 階以下・300 ㎡ 以下・16 m 以下は 4 号', () => {
    expect(article20Class({ structure: 'wood', heightM: 10, aboveGroundStoreys: 4, totalFloorAreaM2: 400, specialUseAreaM2: 0, inPlanningArea: true })).toBe(2)
    expect(article20Class({ structure: 'wood', heightM: 17, aboveGroundStoreys: 2, totalFloorAreaM2: 100, specialUseAreaM2: 0, inPlanningArea: true })).toBe(2)
    expect(article20Class({ structure: 'wood', heightM: 10, aboveGroundStoreys: 2, totalFloorAreaM2: 250, specialUseAreaM2: 0, inPlanningArea: true })).toBe(4)
  })

  it('仕様 6: 鉄骨造で地上 4 階以上は 2 号', () => {
    expect(article20Class({ structure: 'steel', heightM: 14, aboveGroundStoreys: 4, totalFloorAreaM2: 900, specialUseAreaM2: 0, inPlanningArea: true })).toBe(2)
  })
})

// 仕様 7（表示）: 号区分を、画面に出す文に直す。号は数字の前に「第」と「号」を付け、区域外の 6 条は「対象外」と出す。
describe('号区分の文（仕様 7）', () => {
  it('仕様 7: 法 6 条 1 項と法 20 条 1 項の号を、画面の文にする', () => {
    expect(classLabelsOf(RC_SMALL)).toEqual({ article6: '法 6 条 1 項 第 1 号', article20: '法 20 条 1 項 第 3 号' })
    const outside = { ...RC_SMALL, specialUseAreaM2: 0, aboveGroundStoreys: 1, totalFloorAreaM2: 100, inPlanningArea: false }
    expect(classLabelsOf(outside)).toEqual({ article6: '法 6 条 1 項 対象外（区域外）', article20: '法 20 条 1 項 第 4 号' })
  })
})
