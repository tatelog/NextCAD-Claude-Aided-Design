// 仕様（ハブ A-03 G96・G97。統括の依頼 2026-11-04、t55）。Claude の返答は、型に合うものだけ通す（AGENTS.md「型付き判断はスキーマ外の出力を弾く」）。
// 仕様 1（回答）: 文を持つ回答は通る。
// 仕様 2（質問・G96）: 質問は選択肢（ボタン）を 2〜6 個持つ。1 個や 7 個は弾く。
// 仕様 3（図面の変更・G97）: 変更は既知の操作だけ通る（階数・階高・線の種類）。未知の操作・範囲外の値は弾く。
// 仕様 4: 空の文は弾く。
// 仕様 5（種類・G13）: 線の種類は、線の 7 種（plan/semantic の KINDS）のどれかだけ。
import { describe, expect, it } from 'vitest'
import { parseClaudeReply } from './claudeReply'

describe('回答（仕様 1）', () => {
  it('文を持つ回答は通る', () => {
    expect(parseClaudeReply({ type: 'answer', text: '階数は 5 です。' })).toEqual({ type: 'answer', text: '階数は 5 です。' })
  })
})

describe('質問と選択肢（仕様 2・G96）', () => {
  it('選択肢を 2〜6 個持つ質問は通る', () => {
    const q = { type: 'question', text: 'どちらにしますか', choices: ['壁', '柱'] }
    expect(parseClaudeReply(q)).toEqual(q)
  })

  it('選択肢が 1 個の質問は弾く', () => {
    expect(() => parseClaudeReply({ type: 'question', text: 'どちら', choices: ['壁'] })).toThrow()
  })

  it('選択肢が 7 個の質問は弾く', () => {
    expect(() => parseClaudeReply({ type: 'question', text: 'どれ', choices: ['1', '2', '3', '4', '5', '6', '7'] })).toThrow()
  })
})

describe('図面の変更（仕様 3・G97）', () => {
  it('既知の操作（階数・階高・線の種類）は通る', () => {
    const r = {
      type: 'changes',
      text: '直しました',
      changes: [
        { op: 'setStoreyCount', count: 5 },
        { op: 'setStoreyHeight', mm: 3000 },
        { op: 'setKind', segmentId: 's1', kind: 'wall' },
      ],
    }
    expect(parseClaudeReply(r)).toEqual(r)
  })

  it('未知の操作は弾く', () => {
    expect(() => parseClaudeReply({ type: 'changes', text: 'x', changes: [{ op: 'deleteAll' }] })).toThrow()
  })

  it('階数 0 や 31 は弾く（階数は 1〜30）', () => {
    expect(() => parseClaudeReply({ type: 'changes', text: 'x', changes: [{ op: 'setStoreyCount', count: 0 }] })).toThrow()
    expect(() => parseClaudeReply({ type: 'changes', text: 'x', changes: [{ op: 'setStoreyCount', count: 31 }] })).toThrow()
  })

  it('変更が 0 件の返答は弾く', () => {
    expect(() => parseClaudeReply({ type: 'changes', text: 'x', changes: [] })).toThrow()
  })
})

describe('空の文と種類（仕様 4・5）', () => {
  it('空の文は弾く', () => {
    expect(() => parseClaudeReply({ type: 'answer', text: '' })).toThrow()
  })

  it('線の種類は 7 種のどれかだけ（G13。その他の名前は弾く）', () => {
    expect(() => parseClaudeReply({ type: 'changes', text: 'x', changes: [{ op: 'setKind', segmentId: 's1', kind: 'door' }] })).toThrow()
  })
})
