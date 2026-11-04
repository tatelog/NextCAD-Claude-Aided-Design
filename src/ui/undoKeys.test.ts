// 仕様（ハブ A-03 G68。設計グリルの依頼 2026-11-05、項目 5）: Ctrl+Z で Undo、Ctrl+Y で Redo。Mac の ⌘ も同じ。Ctrl+Shift+Z も Redo。
// 仕様 1: Ctrl+Z（⌘Z）は Undo。
// 仕様 2: Ctrl+Y（⌘Y）と Ctrl+Shift+Z（⌘Shift+Z）は Redo。
// 仕様 3: 修飾キーが無い Z・Y、Ctrl と無関係のキーは、何もしない。
// 仕様 4: 文字の入力欄（input・textarea・select・編集できる要素）にいるときは、ブラウザの元に戻す（文字）を優先し、図面の Undo・Redo はしない。
import { describe, expect, it } from 'vitest'
import { undoActionOf, type KeyLike } from './undoKeys'

const press = (key: string, mods: { ctrl?: boolean; meta?: boolean; shift?: boolean } = {}, target: Partial<NonNullable<KeyLike['target']>> | null = {}): KeyLike => ({
  key,
  ctrlKey: mods.ctrl ?? false,
  metaKey: mods.meta ?? false,
  shiftKey: mods.shift ?? false,
  target: target === null ? null : { tagName: 'DIV', isContentEditable: false, ...target },
})

describe('Undo と Redo の割り当て（仕様 1・2）', () => {
  it('Ctrl+Z と ⌘Z は Undo', () => {
    expect(undoActionOf(press('z', { ctrl: true }))).toBe('undo')
    expect(undoActionOf(press('z', { meta: true }))).toBe('undo')
  })

  it('Ctrl+Y と ⌘Y、Ctrl+Shift+Z は Redo（Z は大文字で来ても同じ）', () => {
    expect(undoActionOf(press('y', { ctrl: true }))).toBe('redo')
    expect(undoActionOf(press('y', { meta: true }))).toBe('redo')
    expect(undoActionOf(press('Z', { ctrl: true, shift: true }))).toBe('redo')
  })
})

describe('何もしない場合（仕様 3）', () => {
  it('修飾キーが無い Z・Y、Ctrl と無関係のキーは null', () => {
    expect(undoActionOf(press('z'))).toBeNull()
    expect(undoActionOf(press('y'))).toBeNull()
    expect(undoActionOf(press('s', { ctrl: true }))).toBeNull()
  })

  it('Ctrl+Y のような組み合わせで、Shift を伴う Y は Redo ではない', () => {
    expect(undoActionOf(press('y', { ctrl: true, shift: true }))).toBeNull()
  })
})

describe('文字の入力欄では図面を戻さない（仕様 4）', () => {
  it('input・textarea・select にいるときは null（ブラウザの元に戻す（文字）に任せる）', () => {
    for (const tagName of ['INPUT', 'TEXTAREA', 'SELECT']) {
      expect(undoActionOf(press('z', { ctrl: true }, { tagName }))).toBeNull()
    }
  })

  it('編集できる要素（contentEditable）にいるときも null', () => {
    expect(undoActionOf(press('z', { ctrl: true }, { tagName: 'DIV', isContentEditable: true }))).toBeNull()
  })

  it('目標（target）が無いときは図面の操作として扱う', () => {
    expect(undoActionOf(press('z', { ctrl: true }, null))).toBe('undo')
  })
})
