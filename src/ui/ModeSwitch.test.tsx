// 仕様（ハブ A-03 G100・G125。代表「かな」2026-11-05 の仮決め。設計グリルの依頼）:
// 仕様 1（置き場）: モードの切替は、ヘッダー右端に三つ並べる（仮決め。部品は ModeSwitch）。
// 仕様 2（並び）: 画面で使えるモードを、表の順にボタンで出す。名前は表（screenModes の name）から出す。
// 仕様 3（今のモード）: 今のモードのボタンは押されている（aria-pressed="true"）。ほかは押されていない。
// 仕様 4（一つだけの画面）: 使えるモードが一つだけの画面（P5）は、切替を出さない。
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ModeSwitch } from './ModeSwitch'

// 描画の結果から、ボタンの名前（aria-label。代表の依頼 2026-11-06 で文字を消し、名前は aria-label に入った）と押されているかを取り出す
function buttonsOf(html: string): { name: string; pressed: boolean }[] {
  return [...html.matchAll(/<button([^>]*)>[\s\S]*?<\/button>/g)].map((m) => ({
    name: /aria-label="([^"]+)"/.exec(m[1]!)![1]!,
    pressed: /aria-pressed="true"/.test(m[1]!),
  }))
}

const render = (screen: string, activeMode: string) =>
  buttonsOf(renderToStaticMarkup(createElement(ModeSwitch, { screen, activeMode, onPick: () => undefined })))

describe('モードの切替（G125・代表の仮決め）', () => {
  // Codex の版を正とする（代表の決定 2026-11-08）: P2 の切替から Drawing を外した（ModeSwitch.tsx で P2 だけ drawing を除く）
  it('仕様 1・2: P2 は System・Chat の二つを表の順に出す（Drawing は出さない）', () => {
    expect(render('P2', 'system').map((b) => b.name)).toEqual(['System', 'Chat'])
    // 今のモードが drawing でも、P2 の切替には押されたボタンが無い
    expect(render('P2', 'drawing')).toEqual([
      { name: 'System', pressed: false },
      { name: 'Chat', pressed: false },
    ])
  })

  it('仕様 2: P1 と P4 は System・Chat の二つ', () => {
    expect(render('P1', 'system').map((b) => b.name)).toEqual(['System', 'Chat'])
    expect(render('P4', 'system').map((b) => b.name)).toEqual(['System', 'Chat'])
  })

  it('仕様 3: 今のモードのボタンだけ押されている', () => {
    expect(render('P3', 'drawing')).toEqual([
      { name: 'System', pressed: false },
      { name: 'Chat', pressed: false },
      { name: 'Drawing', pressed: true },
    ])
  })

  it('仕様 4: 使えるモードが一つだけの P5 は、切替を出さない', () => {
    expect(render('P5', 'system')).toEqual([])
  })
})
