// 仕様（ハブ A-03 G100・G95・G88。統括の推奨案 2b を写す。代表は未確定。統括の依頼 t57、2026-11-04）:
// 右のメニューバーの中身は、「今のモード」と「画面（P1〜P5）」の組で決まる。その画面で使えないモードは、切替を出さない。
// 使えるモードの表は設定（src/config/screenModes.json）に出し、表を変えてもコードを変えずに済むようにする。
// 仕様 1（切替。代表 2026-11-05 の 2b の確定）: P1 は System・Chat。P2・P3 は System・Chat・Drawing。P4 は System・Chat。P5 は System だけ（切替は出さない。出力の指示だけ。Chat は無い）。
// 仕様 2（Drawing）: モード 3（drawing）は P2・P3 でだけ使える（available は true）。P1・P4・P5 には出ない。Drawing の右メニューは候補の確認欄（drawing-review。G124）。
// 仕様 3（右メニュー）: 右のメニューバーの中身は、モードと画面で決まる。システムは機能の調整（G43）と、その画面の項目。チャットはチャットの項目と、その画面の項目。
// 仕様 4（表を変える）: 表を変えると、コードを変えずに、出るモードと右メニューが変わる。
// 仕様 5（名前）: モード名は表から出す（仮。コードの名前は id のまま）。
// 仕様 6（検証）: 画面が知らないモードを挙げた表は、読み込みで弾く。
import { describe, expect, it } from 'vitest'
import { modeName, modesOfScreen, parseScreenModes, rightBarItems, SCREEN_MODES } from './screenModes'

describe('画面ごとに使えるモード（仕様 1・2）', () => {
  it('P1 は System と Chat', () => {
    expect(modesOfScreen(SCREEN_MODES, 'P1').map((m) => m.id)).toEqual(['system', 'chat'])
  })

  it('P2・P3 は System・Chat・Drawing', () => {
    expect(modesOfScreen(SCREEN_MODES, 'P2').map((m) => m.id)).toEqual(['system', 'chat', 'drawing'])
    expect(modesOfScreen(SCREEN_MODES, 'P3').map((m) => m.id)).toEqual(['system', 'chat', 'drawing'])
  })

  it('P4 は System と Chat（Drawing は出ない）', () => {
    expect(modesOfScreen(SCREEN_MODES, 'P4').map((m) => m.id)).toEqual(['system', 'chat'])
  })

  it('P5 は System だけ（切替は出さない。Chat は無い）', () => {
    expect(modesOfScreen(SCREEN_MODES, 'P5').map((m) => m.id)).toEqual(['system'])
  })

  it('Drawing は P2・P3 だけに出る（使える表示になっている）', () => {
    expect(modesOfScreen(SCREEN_MODES, 'P1').some((m) => m.id === 'drawing')).toBe(false)
    expect(modesOfScreen(SCREEN_MODES, 'P4').some((m) => m.id === 'drawing')).toBe(false)
    expect(SCREEN_MODES.modes.find((m) => m.id === 'drawing')?.available).toBe(true)
  })

  it('Drawing の右メニューは候補の確認欄（G124）', () => {
    expect(rightBarItems(SCREEN_MODES, 'drawing', 'P2')).toEqual(['p2-outline', 'p2-storey', 'p2-volume', 'p2-numeric', 'p2-rotate', 'drawing-review'])
    expect(rightBarItems(SCREEN_MODES, 'drawing', 'P3')).toContain('drawing-review')
  })
})

describe('右のメニューバーの中身（仕様 3）', () => {
  it('システムの P2 は、P2 の項目と機能の調整', () => {
    expect(rightBarItems(SCREEN_MODES, 'system', 'P2')).toEqual([
      'p2-outline',
      'p2-storey',
      'p2-volume',
      'p2-numeric',
      'p2-rotate',
      'feature-adjust',
    ])
  })

  it('チャットの P4 は、チャットの項目だけ（P4 の画面の項目は無い）', () => {
    expect(rightBarItems(SCREEN_MODES, 'chat', 'P4')).toEqual(['claude-chat'])
  })

  it('チャットの P1 は、チャットの項目', () => {
    expect(rightBarItems(SCREEN_MODES, 'chat', 'P1')).toEqual(['claude-chat'])
  })

  it('P5 は System だけなので、機能の調整が出る。Chat の項目は出ない（使えないモード）', () => {
    expect(rightBarItems(SCREEN_MODES, 'system', 'P5')).toEqual(['feature-adjust'])
    expect(rightBarItems(SCREEN_MODES, 'chat', 'P5')).toEqual([])
  })
})

describe('表を変える（仕様 4）', () => {
  it('表で P4 からシステムを外すと、コードを変えずに、切替と右メニューが変わる', () => {
    const changed = parseScreenModes({
      ...SCREEN_MODES,
      screens: SCREEN_MODES.screens.map((s) => (s.id === 'P4' ? { ...s, modes: ['chat'] } : s)),
    })
    expect(modesOfScreen(changed, 'P4').map((m) => m.id)).toEqual(['chat'])
    expect(rightBarItems(changed, 'system', 'P4')).toEqual([])
  })
})

describe('名前（仕様 5・G101）', () => {
  it('モード名は表から出す（1 か所）。表示名は System・Chat・Drawing', () => {
    expect(modeName(SCREEN_MODES, 'chat')).toBe('Chat')
    expect(modeName(SCREEN_MODES, 'system')).toBe('System')
    expect(modeName(SCREEN_MODES, 'drawing')).toBe('Drawing')
  })

  it('表示名は 3 つだけ（「デジタイザ」「ドロー」は使わない。仮の「（仮）」も付けない）', () => {
    expect(SCREEN_MODES.modes.map((m) => m.name)).toEqual(['System', 'Chat', 'Drawing'])
  })

  it('モードの id は system・chat・drawing（コードの名前を表示名と揃える）', () => {
    expect(SCREEN_MODES.modes.map((m) => m.id)).toEqual(['system', 'chat', 'drawing'])
  })
})

describe('表の検証（仕様 6）', () => {
  it('画面が知らないモードを挙げた表は弾く', () => {
    expect(() =>
      parseScreenModes({
        modes: [{ id: 'chat', name: 'チャット', available: true, rightTiles: ['claude-chat'] }],
        screens: [{ id: 'P1', modes: ['nope'], screenTiles: [] }],
      }),
    ).toThrow()
  })
})
