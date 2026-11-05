// 仕様（ハブ A-03 G96・G97・G14。統括の依頼 t55、2026-11-04）: Claude とのチャットの状態。Claude の呼び出しは未接続（Worker の設定が入るまで）。
// 仕様 1（未接続）: 返信の仕組み（transport）が無いとき、送った文は残り、「未接続」の注記を出す。図面は変えない。
// 仕様 2（自由な文・G96）: 指示は自由な文で送れる。利用者の文が履歴に入り、Claude の返答が続く。
// 仕様 3（質問・G96）: 質問の返答は選択肢つきで履歴に入る。選ぶと、その文が次の指示として送られる。
// 仕様 4（変更・G97）: 変更の返答は、その場で図面に入り、変更の説明が履歴に出て、戻せる状態になる。
// 仕様 5（戻す・G97）: 戻すと図面が変更の前に戻り、戻したことが履歴に残る。戻せるのは直前の一回。
// 仕様 6（型）: 型に合わない返答は、図面を変えず、読めなかったと注記する。
// 仕様 7（送信中）: 送信中は、次の文を送れない。
import { beforeEach, describe, expect, it } from 'vitest'
import { useChat, type ChatTransport } from './chat'
import { useDrawing } from './drawing'
import { useSemantic } from './semantic'

const drawingWithS1 = [{ id: 'e1', segments: [{ id: 's1' }] }] as unknown as ReturnType<typeof useDrawing.getState>['entries']
const reply = (r: unknown): ChatTransport => async () => r

beforeEach(() => {
  useChat.setState({ messages: [], sending: false, notice: null, undo: null, transport: null })
  useDrawing.setState({ entries: drawingWithS1, storeyCount: 3, storeyHeightMm: 3000 })
  useSemantic.setState({ assignments: {} })
})

describe('未接続（仕様 1）', () => {
  it('返信の仕組みが無いとき、送った文は残り、未接続の注記を出す。図面は変わらない', async () => {
    await useChat.getState().send('階数を 5 に', 'P2')
    expect(useChat.getState().messages.map((m) => m.role)).toEqual(['user'])
    expect(useChat.getState().notice).toContain('未接続')
    expect(useDrawing.getState().storeyCount).toBe(3)
  })
})

describe('自由な文と答え（仕様 2）', () => {
  it('利用者の文が履歴に入り、Claude の答えが続く。空の文は送らない', async () => {
    useChat.setState({ transport: reply({ type: 'answer', text: '階数は 3 です。' }) })
    await useChat.getState().send('  いま何階？ ', 'P2')
    await useChat.getState().send('   ', 'P2')
    const m = useChat.getState().messages
    expect(m.map((x) => [x.role, x.text])).toEqual([
      ['user', 'いま何階？'],
      ['claude', '階数は 3 です。'],
    ])
  })
})

describe('質問と選択肢（仕様 3）', () => {
  it('質問の返答は選択肢つきで入り、選ぶと、その文が次の指示として送られる', async () => {
    useChat.setState({ transport: reply({ type: 'question', text: 'どちらですか', choices: ['壁', '柱'] }) })
    await useChat.getState().send('これを直して', 'P3')
    const last = useChat.getState().messages.at(-1)!
    expect(last).toMatchObject({ role: 'claude', choices: ['壁', '柱'] })

    useChat.setState({ transport: reply({ type: 'answer', text: '壁にしました。' }) })
    await useChat.getState().send('壁', 'P3')
    expect(useChat.getState().messages.map((x) => [x.role, x.text])).toEqual([
      ['user', 'これを直して'],
      ['claude', 'どちらですか'],
      ['user', '壁'],
      ['claude', '壁にしました。'],
    ])
  })
})

describe('変更と戻す（仕様 4・5）', () => {
  it('変更の返答は図面に入り、変更の説明が履歴に出て、戻せる状態になる', async () => {
    useChat.setState({ transport: reply({ type: 'changes', text: '直しました', changes: [{ op: 'setStoreyCount', count: 5 }] }) })
    await useChat.getState().send('5 階にして', 'P2')
    expect(useDrawing.getState().storeyCount).toBe(5)
    expect(useChat.getState().messages.at(-1)).toMatchObject({ role: 'claude', changes: ['階数を 5 にする'] })
    expect(useChat.getState().undo).not.toBeNull()
  })

  it('戻すと図面が変更の前に戻り、戻したことが履歴に残る。戻せるのは直前の一回', async () => {
    useChat.setState({ transport: reply({ type: 'changes', text: '直しました', changes: [{ op: 'setStoreyCount', count: 5 }] }) })
    await useChat.getState().send('5 階にして', 'P2')
    useChat.getState().undoLast('P2')
    expect(useDrawing.getState().storeyCount).toBe(3)
    expect(useChat.getState().messages.at(-1)).toMatchObject({ role: 'system' })
    expect(useChat.getState().undo).toBeNull()
    useChat.getState().undoLast('P2')
    expect(useDrawing.getState().storeyCount).toBe(3)
  })
})

describe('型に合わない返答（仕様 6）', () => {
  it('型に合わない返答は、図面を変えず、読めなかったと注記する', async () => {
    useChat.setState({ transport: reply({ type: 'changes', text: 'x', changes: [{ op: 'setStoreyCount', count: 99 }] }) })
    await useChat.getState().send('直して', 'P2')
    expect(useDrawing.getState().storeyCount).toBe(3)
    expect(useChat.getState().notice).toContain('読めませんでした')
    expect(useChat.getState().undo).toBeNull()
  })
})

describe('送信中（仕様 7）', () => {
  it('送信中は、次の文を送れない', async () => {
    let finish: (v: unknown) => void = () => undefined
    useChat.setState({ transport: () => new Promise((resolve) => (finish = resolve)) })
    const first = useChat.getState().send('一つ目', 'P2')
    await useChat.getState().send('二つ目', 'P2')
    expect(useChat.getState().messages.map((m) => m.text)).toEqual(['一つ目'])
    finish({ type: 'answer', text: '返事' })
    await first
    expect(useChat.getState().sending).toBe(false)
  })
})
