// 仕様（代表の依頼 2026-11-08。「途中から」は案 A: 同じ画面を開いている間〔再読み込みしない間〕）:
// 仕様 R1: チュートリアルを途中で止めると、止めた手順を覚える。初心者マークで再開すると、その手順から、その手順の画面で続く。
// 仕様 R2: 一度も始めていない・止めた手順が無いときの再開は、1 手目（P1）から。
// 仕様 R3: 最後の手順で「完了」すると、止めた手順は消え、次は 1 手目から。
// 仕様 R4: チュートリアル中のモードは System だけ。今のモードが Chat・Drawing でも System として扱う。終わったら元のモードに戻る。
// 仕様 R5: チュートリアル中は、モードの切替の Chat・Drawing のボタンを押せない（disabled）。System は押せる。
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it } from 'vitest'
import { ModeSwitch } from '../ui/ModeSwitch'
import { tutorialModeOf, useTutorial } from './state'
import { tutorialSteps } from './steps'

beforeEach(() => useTutorial.setState({ active: false, index: 0, pausedIndex: null }))

describe('チュートリアルの再開（案 A）', () => {
  it('仕様 R1: 途中（4 手目）で止めると、再開は 4 手目から、その手順の画面で', () => {
    const t = useTutorial.getState()
    t.start(t.resumeTarget().index)
    useTutorial.getState().setIndex(3)
    useTutorial.getState().pause()
    expect(useTutorial.getState().active).toBe(false)
    expect(useTutorial.getState().resumeTarget()).toEqual({ index: 3, screen: tutorialSteps[3]!.screen })
    useTutorial.getState().start(useTutorial.getState().resumeTarget().index)
    expect(useTutorial.getState().active).toBe(true)
    expect(useTutorial.getState().index).toBe(3)
  })

  it('仕様 R2: 止めた手順が無ければ、再開は 1 手目（P1）から', () => {
    expect(useTutorial.getState().resumeTarget()).toEqual({ index: 0, screen: 'P1' })
  })

  it('仕様 R3: 最後の手順で完了すると、止めた手順は消え、次は 1 手目から', () => {
    useTutorial.getState().start(0)
    useTutorial.getState().setIndex(tutorialSteps.length - 1)
    useTutorial.getState().finish()
    expect(useTutorial.getState().active).toBe(false)
    expect(useTutorial.getState().resumeTarget()).toEqual({ index: 0, screen: 'P1' })
  })
})

describe('チュートリアル中のモード', () => {
  it('仕様 R4: チュートリアル中は System として扱い、終われば元のモード', () => {
    expect(tutorialModeOf(true, 'chat')).toBe('system')
    expect(tutorialModeOf(true, 'drawing')).toBe('system')
    expect(tutorialModeOf(false, 'chat')).toBe('chat')
    expect(tutorialModeOf(false, 'drawing')).toBe('drawing')
  })

  it('仕様 R5: チュートリアル中は Chat・Drawing のボタンを押せず、System は押せる', () => {
    const html = renderToStaticMarkup(createElement(ModeSwitch, { screen: 'P3', activeMode: 'system', onPick: () => undefined, lockedTo: 'system' }))
    const buttons = [...html.matchAll(/<button([^>]*)>/g)].map((m) => ({ name: /aria-label="([^"]+)"/.exec(m[1]!)![1]!, disabled: /\sdisabled=""/.test(m[1]!) }))
    expect(buttons).toEqual([
      { name: 'System', disabled: false },
      { name: 'Chat', disabled: true },
      { name: 'Drawing', disabled: true },
    ])
  })

  it('仕様 R5: チュートリアル外（lockedTo なし）は、どのボタンも押せる', () => {
    const html = renderToStaticMarkup(createElement(ModeSwitch, { screen: 'P3', activeMode: 'system', onPick: () => undefined }))
    expect(html).not.toMatch(/\sdisabled=""/)
  })
})
