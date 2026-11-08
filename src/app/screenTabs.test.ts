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

// 仕様（代表の決定 2026-11-08）: 画面は「次へ」を一つずつ押して進む。先の画面へ一足飛びに移れない。戻るのはいつでもできる。
// 仕様 7-1: はじめは敷地（P1）だけ開ける。
// 仕様 7-2: ある画面の「次へ」を押すと、その次の画面まで開ける（開けた範囲は狭くならない）。
// 仕様 7-3: 開けた範囲より先のタブは開けず、何を済ませればよいかの理由を返す。開けた範囲の中なら、どこへでも戻れる。
// 仕様 7-4: 保存した案件を開いたときは、全部の画面を開ける。
import { lockReasonOf, reachedAfterNext, screenOpen, ALL_REACHED } from './screenTabs'

describe('画面の順番（仕様 7。代表の決定 2026-11-08）', () => {
  it('仕様 7-1: はじめは敷地だけ開ける', () => {
    expect(SCREENS.map((s) => screenOpen(s.id, 0))).toEqual([true, false, false, false, false])
  })

  it('仕様 7-2: 次へを押すと、その次の画面まで開ける。戻ってからもう一度押しても狭くならない', () => {
    let reached = 0
    reached = reachedAfterNext(reached, 'P2')
    expect(SCREENS.map((s) => screenOpen(s.id, reached))).toEqual([true, true, false, false, false])
    reached = reachedAfterNext(reached, 'P3')
    reached = reachedAfterNext(reached, 'P4')
    expect(reachedAfterNext(reached, 'P2')).toBe(reached)
    expect(SCREENS.map((s) => screenOpen(s.id, reached))).toEqual([true, true, true, true, false])
  })

  it('仕様 7-3: 開けていない画面は、前の画面で済ませることを理由に返す。開けている画面は理由なし', () => {
    expect(lockReasonOf('P2', 0)).toContain('敷地')
    expect(lockReasonOf('P3', 1)).toContain('ボリューム')
    expect(lockReasonOf('P4', 2)).toContain('平面')
    expect(lockReasonOf('P5', 3)).toContain('積算')
    expect(lockReasonOf('P1', 0)).toBeNull()
    expect(lockReasonOf('P2', 3)).toBeNull()
  })

  it('仕様 7-4: 保存した案件を開いたときは全部開ける', () => {
    expect(SCREENS.every((s) => screenOpen(s.id, ALL_REACHED))).toBe(true)
  })
})
