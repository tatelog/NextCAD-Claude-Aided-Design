// 仕様（ハブ A-03 G55。設計グリルの決定を統括が依頼 t57、2026-11-04。統括の訂正 2026-11-04（版 58）で既定を差し替え）:
// 仕様 1: 左のオブジェクト一覧は、どのモードでも開閉できる。
// 仕様 2: 既定は、ドロー（Drawing）のモードと 3D では折りたたんだ状態。3D は、モードによらず折りたたむ。
// 仕様 3: System（描画）とチャットの平面では、開いた状態。
import { describe, expect, it } from 'vitest'
import { foldedNowOf, objectMenuFoldedByDefault } from './objectMenuFold'

describe('左のオブジェクト一覧の既定（G55 仕様 2・3）', () => {
  it('ドロー（drawing）の平面は、折りたたむ', () => {
    expect(objectMenuFoldedByDefault('drawing', 'plan')).toBe(true)
  })

  it('3D は、モードによらず折りたたむ', () => {
    expect(objectMenuFoldedByDefault('system', '3d')).toBe(true)
    expect(objectMenuFoldedByDefault('chat', '3d')).toBe(true)
    expect(objectMenuFoldedByDefault('drawing', '3d')).toBe(true)
  })

  it('System（描画）とチャットの平面は、開く', () => {
    expect(objectMenuFoldedByDefault('system', 'plan')).toBe(false)
    expect(objectMenuFoldedByDefault('chat', 'plan')).toBe(false)
  })
})

// 仕様 4（開閉の上書き）: 利用者が開閉したら、その文脈（画面・モード・表示）の間だけ覚える。文脈が変わったら既定に戻る。
describe('開閉の上書き（仕様 4）', () => {
  it('上書きが無ければ、既定', () => {
    expect(foldedNowOf(null, 'P2-system-plan', true)).toBe(true)
    expect(foldedNowOf(null, 'P2-chat-plan', false)).toBe(false)
  })

  it('上書きの文脈が今と同じなら、上書きの値', () => {
    expect(foldedNowOf({ context: 'P2-system-plan', folded: false }, 'P2-system-plan', true)).toBe(false)
  })

  it('上書きの文脈が違えば（モードや表示が変わった）、既定に戻る', () => {
    expect(foldedNowOf({ context: 'P2-system-plan', folded: false }, 'P2-chat-plan', true)).toBe(true)
  })
})
