// 仕様（統括の依頼 2026-11-05、t55。G29・G140〜G144）: チャットの指示は、Claude が操作の列を返し、アプリが検査してから図面に入れる。
// 仕様 1（操作の列）: 返答の操作は、名前と引数を持つ列。スキーマ外（未知の操作・負の長さ）は弾く（G141）。
// 仕様 2（形を足す）: 「線を足す」操作は、数値の線（始点・長さ・角度）を図面に一本足す（G140）。
// 仕様 3（一指示＝一 Undo）: 一つの指示の操作列は、適用の前の状態へ一度に戻る。階数・線・種類を含む（G143）。
// 仕様 4（文脈の並び）: 固定の部分 → 案件の要約 → 選んだ周辺の抜粋 → 直近の操作、の順。直近の操作は設定の件数まで（G142・G144）。
// 仕様 5（案件の要約）: 要約は設定の文字数以内。古いものから落とし、新しい操作を残す（G144）。
// 仕様 6（要求の形）: 要求は Worker の /chat へ送る。Claude の鍵は含めない。モデル名は引数で受け、固定しない（G29・G141）。
import { describe, expect, it } from 'vitest'
import { parseClaudeReply } from './claudeReply'
import { applyChangeBatch, restoreSnapshot } from './applyChanges'
import { buildChatContext, CHAT_RECENT_OPS } from './chatContext'
import { memorySummaryOf } from './memory'
import { buildChatRequest } from './chatRequest'
import { useDrawing } from '../store/drawing'
import { useSemantic } from '../store/semantic'

describe('操作の列（仕様 1）', () => {
  it('名前と引数を持つ操作は通る', () => {
    const r = parseClaudeReply({
      type: 'changes',
      text: '線を足す',
      changes: [{ op: 'addLine', start: { x: 0, y: 0 }, lengthMm: 1000, angleDeg: 0 }],
    })
    expect(r.type).toBe('changes')
  })

  it('未知の操作と、負の長さは弾く', () => {
    expect(() => parseClaudeReply({ type: 'changes', text: 'x', changes: [{ op: 'deleteAll' }] })).toThrow()
    expect(() =>
      parseClaudeReply({ type: 'changes', text: 'x', changes: [{ op: 'addLine', start: { x: 0, y: 0 }, lengthMm: -5, angleDeg: 0 }] }),
    ).toThrow()
  })
})

describe('線を足す（仕様 2）', () => {
  it('数値の線は、図面に一本入る（始点から長さ・角度で終点が決まる）', () => {
    useDrawing.setState({ entries: [], past: [], redoStack: [], fitted: false })
    applyChangeBatch([{ op: 'addLine', start: { x: 0, y: 0 }, lengthMm: 1000, angleDeg: 0 }])
    const segs = useDrawing.getState().entries.flatMap((e) => e.segments)
    expect(segs).toHaveLength(1)
    expect(Math.round(segs[0]!.x2)).toBe(1000)
    expect(Math.round(segs[0]!.y2)).toBe(0)
  })
})

describe('一指示＝一 Undo（仕様 3）', () => {
  it('階数・線・種類を含む操作列は、適用の前の状態へ一度に戻る', () => {
    useDrawing.setState({ entries: [], past: [], redoStack: [], fitted: false, storeyCount: 3, storeyHeightMm: 3000 })
    useSemantic.getState().clear()
    const before = applyChangeBatch([{ op: 'setStoreyCount', count: 6 }, { op: 'addLine', start: { x: 0, y: 0 }, lengthMm: 500, angleDeg: 90 }]).before
    expect(useDrawing.getState().storeyCount).toBe(6)
    expect(useDrawing.getState().entries.flatMap((e) => e.segments)).toHaveLength(1)
    restoreSnapshot(before)
    expect(useDrawing.getState().storeyCount).toBe(3)
    expect(useDrawing.getState().entries).toHaveLength(0)
  })
})

describe('文脈の並び（仕様 4）', () => {
  it('固定の部分 → 案件の要約 → 周辺の抜粋 → 直近の操作の順で、直近の操作は設定の件数まで', () => {
    const recent = Array.from({ length: CHAT_RECENT_OPS + 5 }, (_, i) => `操作${i}`)
    const blocks = buildChatContext({
      screen: 'P2',
      mode: 'chat',
      memoryText: '案件の要約',
      segments: [{ id: 'seg-1', kind: 'wall' }],
      selectedSegmentIds: ['seg-1'],
      recentOps: recent,
    })
    expect(blocks[0]).toContain('P2')
    expect(blocks[0]).toContain('chat')
    expect(blocks[1]).toBe('案件の要約')
    expect(blocks[2]).toContain('seg-1')
    const last = blocks[blocks.length - 1]!
    // 直近の件数（CHAT_RECENT_OPS）だけを残す。古いもの（操作0〜4）は入らない
    expect(last).toContain('操作14')
    expect(last).not.toContain('操作0')
    expect(last).not.toContain('操作4\n')
    expect(last.split('\n').filter((l) => l.startsWith('操作'))).toHaveLength(CHAT_RECENT_OPS)
  })
})

describe('案件の要約（仕様 5）', () => {
  it('設定の文字数以内に収め、古いものから落とす', () => {
    const rows = Array.from({ length: 50 }, (_, i) => ({ at: `t${i}`, screen: 'P2', action: '操作', target: `対象${i}` }))
    const s = memorySummaryOf(rows, 200)
    expect(s.length).toBeLessThanOrEqual(200)
    expect(s).toContain('対象49')
    expect(s).not.toContain('対象0')
  })
})

describe('要求の形（仕様 6）', () => {
  it('Worker の /chat へ送り、鍵の入った見出しを持たず、モデル名は引数で受ける', () => {
    const req = buildChatRequest({ workerUrl: 'https://w.example/', model: 'model-under-test', blocks: ['固定'], history: [] })
    expect(req.url).toBe('https://w.example/chat')
    const body = JSON.parse(req.init.body as string) as { model: string; tools: { name: string }[] }
    expect(body.model).toBe('model-under-test')
    expect(body.tools.map((t) => t.name)).toContain('apply_operations')
    expect(JSON.stringify(req.init.headers)).not.toMatch(/api-key|x-api-key|authorization/i)
  })
})
