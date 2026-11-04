// 仕様（ハブ A-03 G32・D-03 §4「同時書き込みの方式」。決めた方式: 版番号による楽観的な確認）: 案件のファイルには版番号（revision）があり、保存のたびに 1 つ増える。
// 仕様 1: 保存先に、いま読んだ版と同じ版がある（または保存先が無い）なら、保存してよい。
// 仕様 2: 保存先の版が、読んだ版より新しい（ほかで保存された）なら、上書きせず「衝突」と返す。
// 仕様 3: 保存先の版が、読んだ版より古い・違う形なら、上書きせず「衝突」と返す（判断は人が行う）。
// 仕様 4: 次の保存の版は、いまの版 + 1。
import { describe, expect, it } from 'vitest'
import { decideSave, nextRevision } from './saveDecision'

describe('保存の版番号による確認（仕様 1〜4）', () => {
  it('仕様 1: 同じ版、または保存先が無ければ保存してよい', () => {
    expect(decideSave({ loadedRevision: 3, remoteRevision: 3 })).toBe('save')
    expect(decideSave({ loadedRevision: 0, remoteRevision: null })).toBe('save')
  })

  it('仕様 2: 保存先の版が新しければ衝突（上書きしない）', () => {
    expect(decideSave({ loadedRevision: 3, remoteRevision: 4 })).toBe('conflict')
  })

  it('仕様 3: 保存先の版が古い、または版が読めなければ衝突', () => {
    expect(decideSave({ loadedRevision: 3, remoteRevision: 2 })).toBe('conflict')
    expect(decideSave({ loadedRevision: 3, remoteRevision: Number.NaN })).toBe('conflict')
  })

  it('仕様 4: 次の版は、いまの版 + 1', () => {
    expect(nextRevision(3)).toBe(4)
    expect(nextRevision(0)).toBe(1)
  })
})
