// 仕様（ハブ A-03 G14・G97。統括の依頼 2026-11-05、t69 の残り）: Claude の判定で入った種類の割り当ては、一回分の操作として、その場で反映し、作業ログに残し、Undo で戻せる。
// 仕様 1（反映と記録）: 一回の判定は、確定と要確認の提案を入れ、作業ログに一行残す。人が選ぶ帯の提案は入れず、記録もしない。
// 仕様 2（戻す）: 戻すと、その判定で変えた線だけが、判定の前の状態に戻る。戻した操作は作業ログに残る。
// 仕様 3（一回だけ）: 戻せるのは直前の一回。二度目は何もしない。
// 仕様 4（後の人の操作）: 判定のあとに人が変えた線は、戻しても残す。人が確定した線は、判定で上書きしない。
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useSemantic } from './semantic'
import { recordWorkLog } from '../app/workLogStore'

vi.mock('../app/workLogStore', () => ({ recordWorkLog: vi.fn() }))

beforeEach(() => {
  useSemantic.setState({ assignments: {}, judgementUndo: null })
  vi.mocked(recordWorkLog).mockClear()
})

describe('反映と記録（仕様 1）', () => {
  it('確定と要確認を入れ、人が選ぶ帯は入れない。作業ログに一行残す', () => {
    const n = useSemantic.getState().applyJudgementBatch(
      [
        { id: 'a', kind: 'wall', confidence: 0.9 },
        { id: 'b', kind: 'beam', confidence: 0.6 },
        { id: 'c', kind: 'wall', confidence: 0.2 },
      ],
      'P2',
    )
    expect(n).toBe(2)
    const a = useSemantic.getState().assignments
    expect(a.a).toEqual({ kind: 'wall', status: 'confirmed', by: 'claude' })
    expect(a.b).toEqual({ kind: 'beam', status: 'needs_review', by: 'claude' })
    expect(a.c).toBeUndefined()
    expect(recordWorkLog).toHaveBeenCalledTimes(1)
    expect(vi.mocked(recordWorkLog).mock.calls[0]![0]).toMatchObject({ screen: 'P2', action: 'Drawing の判定' })
  })

  it('入れるものが一つも無ければ、何もせず、記録もしない', () => {
    const n = useSemantic.getState().applyJudgementBatch([{ id: 'c', kind: 'wall', confidence: 0.2 }], 'P2')
    expect(n).toBe(0)
    expect(useSemantic.getState().judgementUndo).toBeNull()
    expect(recordWorkLog).not.toHaveBeenCalled()
  })
})

describe('戻す（仕様 2・3）', () => {
  it('戻すと、その判定で変えた線だけが前の状態に戻り、戻した操作が記録される', () => {
    useSemantic.getState().suggest('a', 'column', 0.95)
    useSemantic.getState().applyJudgementBatch([{ id: 'a', kind: 'wall', confidence: 0.6 }, { id: 'b', kind: 'beam', confidence: 0.9 }], 'P2')
    expect(useSemantic.getState().assignments.a).toEqual({ kind: 'wall', status: 'needs_review', by: 'claude' })
    expect(useSemantic.getState().undoJudgementBatch('P2')).toBe(true)
    const a = useSemantic.getState().assignments
    expect(a.a).toEqual({ kind: 'column', status: 'confirmed', by: 'claude' })
    expect(a.b).toBeUndefined()
    expect(vi.mocked(recordWorkLog).mock.calls.at(-1)![0]).toMatchObject({ action: 'Drawing の判定を戻す' })
  })

  it('戻せるのは直前の一回。二度目は何もしない', () => {
    useSemantic.getState().applyJudgementBatch([{ id: 'b', kind: 'beam', confidence: 0.9 }], 'P2')
    expect(useSemantic.getState().undoJudgementBatch('P2')).toBe(true)
    expect(useSemantic.getState().undoJudgementBatch('P2')).toBe(false)
  })
})

describe('後の人の操作（仕様 4）', () => {
  it('判定のあとに人が変えた線は、戻しても残す。人が確定した線は判定で上書きしない', () => {
    useSemantic.getState().setKind('h', 'column')
    useSemantic.getState().applyJudgementBatch([{ id: 'h', kind: 'wall', confidence: 0.95 }, { id: 'b', kind: 'beam', confidence: 0.9 }], 'P2')
    expect(useSemantic.getState().assignments.h).toEqual({ kind: 'column', status: 'confirmed', by: 'human' })
    useSemantic.getState().setKind('b', 'opening')
    useSemantic.getState().undoJudgementBatch('P2')
    expect(useSemantic.getState().assignments.b).toEqual({ kind: 'opening', status: 'confirmed', by: 'human' })
    expect(useSemantic.getState().assignments.h).toEqual({ kind: 'column', status: 'confirmed', by: 'human' })
  })
})
