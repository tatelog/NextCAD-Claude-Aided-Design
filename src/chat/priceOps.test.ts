// 仕様（ハブ A-03 G140・G20・G22。統括の依頼 2026-11-05、t55 の積算の操作）: チャットで単価・歩掛を変えられる。変えた値には provisional の印を残す（印を残す側で作り、分岐は一か所）。
// 仕様 1（操作）: 単価（0 以上の整数）と歩掛（0 より大きい）の操作を受ける。外れた値は弾く。
// 仕様 2（単価）: 単価の操作は、単価の行の単価を変え、provisional の印を残す。
// 仕様 3（歩掛）: 歩掛の操作は、歩掛を変え、provisional の印を残す。
// 仕様 4（無い行）: 無い行の id は反映せず、スキップとして返す（黙って作らない）。
// 仕様 5（戻す）: 戻すと、単価の表（CSV）も変更の前の状態に戻る（一指示＝一 Undo。G143）。
// 仕様 6（分岐は一か所）: 印を残すかは provisionalAfterChatChange() の一か所で決める（代表の確認待ち。G140）。
// 仕様 0（往復）: 単価の表は、読んで書き戻しても同じ行になる。
import { beforeEach, describe, expect, it } from 'vitest'
import { parseClaudeReply } from './claudeReply'
import { applyChangeBatch, restoreSnapshot, snapshotOfState } from './applyChanges'
import { parsePriceCsv, serializePriceCsv } from '../estimate/priceCsv'
import { PRICE_CSV_SAMPLE, provisionalAfterChatChange, usePriceTable } from '../store/priceTable'

const rowsOf = () => parsePriceCsv(usePriceTable.getState().csv)
const carpenterOf = () => rowsOf().find((r) => r.id === 'carpenter')!

beforeEach(() => {
  usePriceTable.setState({ csv: PRICE_CSV_SAMPLE })
})

describe('往復（仕様 0）', () => {
  it('読んで書き戻しても、同じ行になる', () => {
    expect(parsePriceCsv(serializePriceCsv(parsePriceCsv(PRICE_CSV_SAMPLE)))).toEqual(parsePriceCsv(PRICE_CSV_SAMPLE))
  })
})

describe('操作の形（仕様 1）', () => {
  it('単価と歩掛の操作は通り、外れた値は弾く', () => {
    expect(parseClaudeReply({ type: 'changes', text: 'x', changes: [{ op: 'setUnitPrice', id: 'carpenter', unit_price: 26000 }] }).type).toBe('changes')
    expect(parseClaudeReply({ type: 'changes', text: 'x', changes: [{ op: 'setFactor', id: 'carpenter', factor: 0.35 }] }).type).toBe('changes')
    expect(() => parseClaudeReply({ type: 'changes', text: 'x', changes: [{ op: 'setUnitPrice', id: 'carpenter', unit_price: -1 }] })).toThrow()
    expect(() => parseClaudeReply({ type: 'changes', text: 'x', changes: [{ op: 'setFactor', id: 'carpenter', factor: 0 }] })).toThrow()
  })
})

describe('単価と歩掛（仕様 2・3）', () => {
  it('単価を変え、印を残す', () => {
    const { summary } = applyChangeBatch([{ op: 'setUnitPrice', id: 'carpenter', unit_price: 26000 }])
    expect(carpenterOf().unit_price).toBe(26000)
    expect(carpenterOf().provisional).toBe(true)
    expect(summary).toHaveLength(1)
  })

  it('歩掛を変え、印を残す', () => {
    applyChangeBatch([{ op: 'setFactor', id: 'carpenter', factor: 0.35 }])
    expect(carpenterOf().factor).toBe(0.35)
    expect(carpenterOf().provisional).toBe(true)
  })
})

describe('無い行（仕様 4）', () => {
  it('無い行の id は反映せず、スキップとして返す。表は変わらない', () => {
    const { skipped, summary } = applyChangeBatch([{ op: 'setUnitPrice', id: 'nope', unit_price: 1 }])
    expect(skipped).toHaveLength(1)
    expect(summary).toHaveLength(0)
    expect(usePriceTable.getState().csv).toBe(PRICE_CSV_SAMPLE)
  })
})

describe('戻す（仕様 5）', () => {
  it('戻すと、単価の表も変更の前の状態に戻る', () => {
    const before = snapshotOfState()
    applyChangeBatch([{ op: 'setUnitPrice', id: 'carpenter', unit_price: 26000 }, { op: 'setFactor', id: 'carpenter', factor: 0.35 }])
    expect(carpenterOf().unit_price).toBe(26000)
    restoreSnapshot(before)
    expect(usePriceTable.getState().csv).toBe(PRICE_CSV_SAMPLE)
  })
})

describe('印の分岐（仕様 6）', () => {
  it('印を残すかは、一か所（provisionalAfterChatChange）で決まる。今は残す', () => {
    expect(provisionalAfterChatChange()).toBe(true)
  })
})
