// 仕様（統括の依頼 2026-11-05、t69。G98・G108〜G113・G122・G124・G126・G82）: Drawing モードで、ペンを押さえている間に描いた線だけを判定する。
// 仕様 1（送る条件）: 押さえた時間が閾値（HOLD_JUDGE_MS）に達し、意味づけがオン、Worker の URL があり、線が 1 本以上のときだけ送る。
// 仕様 2（三つの帯）: 実効信頼度 0.85 以上は確定、0.5 以上 0.85 未満は要確認、0.5 未満と数でない値は人が種類を選ぶ（種類を入れない）。
// 仕様 3（店舗）: 人が選ぶ（種類を入れない）帯の線は、店舗に種類を入れない。確定と要確認は入れる（確定は確定、要確認は要確認の印）。
// 仕様 4（送る中身）: Worker に送るのは描いた線の座標だけ。チャットの文は含めない（G112）。
// 仕様 5（種類）: 種類は 7 種（KINDS）に限る。列挙外が返ったら保留（G113）。
// 仕様 6（対応づけ）: 押さえている間に送った候補は、離したあとの線（同じ数）に順番で対応づける。数が違うときは対応づけない。
import { describe, expect, it, beforeEach } from 'vitest'
import { drawingBandOf, suggestDrawnSegment, DRAWING_CONFIRM_MIN, DRAWING_REVIEW_MIN } from './drawingBand'
import { HOLD_JUDGE_MS, holdJudgeDecision, rekeyBySegmentOrder } from './drawingHold'
import { judgeSegments, type JudgeOutcome } from './judge'
import { useSemantic } from '../store/semantic'

const seg = (id: string) => ({ id, a: { x: 0, y: 0 }, b: { x: 1000, y: 0 } })

describe('送る条件（仕様 1）', () => {
  it('押さえた時間が閾値に届くまでは待つ', () => {
    expect(holdJudgeDecision({ heldMs: HOLD_JUDGE_MS - 1, segmentCount: 1, enabled: true, workerUrl: 'https://w.example' })).toEqual({ kind: 'wait' })
  })

  it('閾値に届き、意味づけがオン、URL があり、線が 1 本以上なら送る', () => {
    expect(holdJudgeDecision({ heldMs: HOLD_JUDGE_MS, segmentCount: 1, enabled: true, workerUrl: 'https://w.example' })).toEqual({ kind: 'send' })
  })

  it('線が 0 本なら送らない', () => {
    expect(holdJudgeDecision({ heldMs: HOLD_JUDGE_MS, segmentCount: 0, enabled: true, workerUrl: 'https://w.example' })).toEqual({ kind: 'skip' })
  })

  it('意味づけが切れている、または URL が空なら送らず、理由を出す', () => {
    expect(holdJudgeDecision({ heldMs: HOLD_JUDGE_MS, segmentCount: 1, enabled: false, workerUrl: 'https://w.example' })).toEqual({
      kind: 'unconnected',
      reason: '意味づけ（Claude）が切れている',
    })
    expect(holdJudgeDecision({ heldMs: HOLD_JUDGE_MS, segmentCount: 1, enabled: true, workerUrl: ' ' })).toEqual({
      kind: 'unconnected',
      reason: 'Worker の URL が未設定',
    })
  })
})

describe('三つの帯（仕様 2）', () => {
  it('0.85 以上は確定、0.5 以上 0.85 未満は要確認、0.5 未満は人が選ぶ', () => {
    expect(drawingBandOf(0.9)).toBe('confirmed')
    expect(drawingBandOf(DRAWING_CONFIRM_MIN)).toBe('confirmed')
    expect(drawingBandOf(0.6)).toBe('review')
    expect(drawingBandOf(DRAWING_REVIEW_MIN)).toBe('review')
    expect(drawingBandOf(0.3)).toBe('human')
  })

  it('数でない値は人が選ぶ。検査が落ちたら実効信頼度が下がり、人が選ぶ側に寄る', () => {
    expect(drawingBandOf(Number.NaN)).toBe('human')
    expect(drawingBandOf(0.9, [false])).toBe('human')
  })
})

describe('店舗（仕様 3）', () => {
  beforeEach(() => {
    useSemantic.getState().clear()
  })

  it('人が選ぶ帯の線には種類を入れない', () => {
    suggestDrawnSegment('s1', 'wall', 0.3)
    expect(useSemantic.getState().assignments['s1']).toBeUndefined()
  })

  it('確定の帯は確定（人が選んだ扱いではなく Claude の割り当て）、要確認の帯は要確認の印で入る', () => {
    suggestDrawnSegment('s2', 'wall', 0.9)
    suggestDrawnSegment('s3', 'beam', 0.6)
    expect(useSemantic.getState().assignments['s2']).toEqual({ kind: 'wall', status: 'confirmed', by: 'claude' })
    expect(useSemantic.getState().assignments['s3']).toEqual({ kind: 'beam', status: 'needs_review', by: 'claude' })
  })
})

describe('送る中身と種類（仕様 4・5）', () => {
  it('Worker に送るのは線の座標だけで、チャットの文は含まない', async () => {
    let body = ''
    const fetchImpl = async (_url: string, init: RequestInit): Promise<Response> => {
      body = String(init.body)
      return new Response(JSON.stringify({ segments: [{ segment_id: 's1', kind: 'wall', confidence: 0.9 }] }), { status: 200 })
    }
    const outcomes: JudgeOutcome[] = []
    const out = await judgeSegments(
      { segments: [seg('s1')], workerUrl: 'https://w.example', enabled: true, fetchImpl },
      { suggest: () => {}, addPending: () => {} },
    )
    outcomes.push(out)
    expect(out).toEqual({ state: 'applied', count: 1 })
    expect(body).toContain('"segments"')
    expect(body).not.toMatch(/"text"|"message"|"chat"/)
  })

  it('列挙外の種類が返ったら、再試行しても失敗して保留になる', async () => {
    const fetchImpl = async (): Promise<Response> =>
      new Response(JSON.stringify({ segments: [{ segment_id: 's1', kind: 'table', confidence: 0.9 }] }), { status: 200 })
    const out = await judgeSegments({ segments: [seg('s1')], workerUrl: 'https://w.example', enabled: true, fetchImpl }, { suggest: () => {}, addPending: () => {} })
    expect(out.state).toBe('pending')
  })
})

describe('対応づけ（仕様 6）', () => {
  it('同じ数なら、送った候補の id を離したあとの線の id に順番で対応づける', () => {
    const m = rekeyBySegmentOrder(['p1', 'p2'], ['c1', 'c2'])
    expect(m).toEqual(new Map([
      ['p1', 'c1'],
      ['p2', 'c2'],
    ]))
  })

  it('数が違うときは対応づけない（null）', () => {
    expect(rekeyBySegmentOrder(['p1', 'p2'], ['c1'])).toBeNull()
  })
})
