// 仕様（統括の依頼 2026-11-06。6: 「K 練習」の入口を外す。タブは P1〜P5 の五つ）:
// 仕様 6-1: タブは、敷地・ボリューム・平面・積算・出力の順の五つ（id は P1〜P5）。
// 仕様 6-2: 練習（K）のタブは無い。
import { describe, expect, it } from 'vitest'
import { SCREENS } from './screenTabs'

describe('画面のタブ（仕様 6-1・6-2）', () => {
  it('仕様 6-1: 敷地・ボリューム・平面・積算・出力の順の五つ（id は P1〜P5）', () => {
    expect(SCREENS.map((s) => s.name)).toEqual(['敷地', 'ボリューム', '平面', '積算', '出力'])
    expect(SCREENS.map((s) => s.id)).toEqual(['P1', 'P2', 'P3', 'P4', 'P5'])
  })

  it('仕様 6-2: 練習（K）のタブは無い', () => {
    expect(SCREENS.map((s) => s.id)).not.toContain('K')
    expect(SCREENS.map((s) => s.name)).not.toContain('練習')
  })
})
