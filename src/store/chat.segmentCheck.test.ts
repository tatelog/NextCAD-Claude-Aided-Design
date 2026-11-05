// 仕様（統括の依頼 2026-11-06。2）: 返事の線の id が、選んだ線に無いときは、図面を変えず「線を選んでから指示してください」と出す。
// 仕様 2a（店舗）: 選んでいない線（存在しない id）への変更が来たら、同じ返事の階数も含めて図面を変えない。
// 仕様 2b（店舗）: 選んだ線への変更は、いつもどおり反映する。
import { beforeEach, describe, expect, it } from 'vitest'
import type { Segment } from '../model/schema'
import { useChat, type ChatTransport } from './chat'
import { useDrawing, type StrokeEntry } from './drawing'
import { useSelection } from './selection'
import { useSemantic } from './semantic'

const seg = { id: 's1', stage: 'F5', x1: 0, y1: 0, x2: 1000, y2: 0, start_node_id: 'n1', end_node_id: 'n2', snap: 'none', revision: 0 } as unknown as Segment
const entry = { id: 'k1', screen: 'P2', stroke: { id: 'k1' }, segments: [seg], nodes: [] } as unknown as StrokeEntry

const replyWith = (changes: unknown[]): ChatTransport => async () => ({ type: 'changes', text: '変えます', changes })

beforeEach(() => {
  useChat.setState({ messages: [], notice: null, sending: false, undo: null, transport: null })
  useDrawing.setState({ entries: [entry], past: [], redoStack: [], storeyCount: 3 })
  useSelection.setState({ segmentIds: [] })
  useSemantic.setState({ assignments: {} })
})

describe('無い線の指示では図面を変えない（仕様 2a・2b）', () => {
  it('仕様 2a: 選んでいない線への種類の変更が来たら、同じ返事の階数も変えず「線を選んでから指示してください」と出す', async () => {
    useChat.setState({
      transport: replyWith([
        { op: 'setStoreyCount', count: 6 },
        { op: 'setKind', segmentId: 'selected', kind: 'wall' },
      ]),
    })
    await useChat.getState().send('この壁を厚くして', 'P2')
    expect(useDrawing.getState().storeyCount).toBe(3)
    expect(useSemantic.getState().assignments.s1).toBeUndefined()
    const last = useChat.getState().messages.at(-1)
    expect(last?.text).toContain('線を選んでから指示してください')
  })

  it('仕様 2b: 選んだ線への種類の変更は、いつもどおり反映する', async () => {
    useSelection.setState({ segmentIds: ['s1'] })
    useChat.setState({ transport: replyWith([{ op: 'setKind', segmentId: 's1', kind: 'wall' }]) })
    await useChat.getState().send('この壁を厚くして', 'P2')
    expect(useSemantic.getState().assignments.s1?.kind).toBe('wall')
  })
})
