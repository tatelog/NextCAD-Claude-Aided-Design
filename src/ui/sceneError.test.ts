// 仕様（統括の依頼 2026-11-06（急ぎ）。3: 3D の部分で例外が出ても、アプリ全体を白くしない）:
// 仕様 3a: 3D の例外は「3D を描けなかった（理由）」の文言にする。
// 仕様 3b: エラー境界は、例外を受けると失敗の状態になる（枠の中に文言を出し、アプリは止めない）。
import { describe, expect, it } from 'vitest'
import { SceneErrorBoundary, sceneErrorTextOf } from './SceneErrorBoundary'

describe('3D の例外の扱い（仕様 3a・3b）', () => {
  it('仕様 3a: 例外の文言は「3D を描けなかった（理由）」', () => {
    expect(sceneErrorTextOf(new Error('壊れた'))).toBe('3D を描けなかった（壊れた）')
  })

  it('仕様 3b: 例外を受けると、失敗の状態になる（アプリ全体は落とさない）', () => {
    expect(SceneErrorBoundary.getDerivedStateFromError(new Error('壊れた'))).toEqual({ failed: true, message: '壊れた' })
  })
})
