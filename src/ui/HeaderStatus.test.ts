// 仕様（代表の依頼 2026-11-06。状態の表示（保留・保存済み／未保存）は、小さなアイコンと数字（または色の点）にする。文字は出さない）:
// HS1: 保存の状態は、色の点だけを出す。名前（保存済み／未保存の変更あり）は aria-label と title に入る。
// HS2: 保留は、小さなアイコンと数字（見えるのは数字だけ）。名前（保留 N 件）は aria-label と title に入る。
import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { PendingIndicator, SaveDot } from './HeaderStatus'

const html = (el: ReturnType<typeof createElement>) => renderToStaticMarkup(el)
const visibleTextOf = (markup: string): string => markup.replace(/<svg[\s\S]*?<\/svg>/g, '').replace(/<[^>]+>/g, '').trim()

describe('状態の表示（仕様 HS1・HS2）', () => {
  it('HS1: 保存済みは色の点だけ。名前は aria-label と title', () => {
    const out = html(createElement(SaveDot, { status: '保存済み' }))
    expect(out).toContain('aria-label="保存済み"')
    expect(out).toContain('title="保存済み"')
    expect(visibleTextOf(out)).toBe('')
  })

  it('HS1: 未保存の変更ありは、別の色の点（名前は同じ仕組みで出る）', () => {
    const saved = html(createElement(SaveDot, { status: '保存済み' }))
    const unsaved = html(createElement(SaveDot, { status: '未保存の変更あり' }))
    expect(unsaved).toContain('aria-label="未保存の変更あり"')
    expect(unsaved).not.toBe(saved)
  })

  it('HS2: 保留は、アイコンと数字（見えるのは数字だけ）。名前は「保留 N 件」', () => {
    const out = html(createElement(PendingIndicator, { count: 0 }))
    expect(out).toContain('aria-label="保留 0 件"')
    expect(visibleTextOf(out)).toBe('0')
  })
})
