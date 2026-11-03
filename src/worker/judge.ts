// 線の意味づけを Worker に判定させる（D-02 C12、A-03 G9・G14・G31）。結果は「提案（要確認）」として店舗に入れ、人が確かめる。
// 送らない条件（意味づけオフ・Worker の URL が空・線が 0 本）と、失敗時の保留（再試行は classifyViaWorker の 1 回）をここで決める。
import { classifyViaWorker } from './client'
import type { SegmentIn } from './classify'
import type { Kind } from '../plan/semantic'

export type JudgeOutcome =
  | { state: 'unconnected'; reason: string }
  | { state: 'skipped' }
  | { state: 'applied'; count: number }
  | { state: 'pending'; error: string }

export interface JudgeSinks {
  /** Claude の提案を一本ずつ入れる（店舗が、人の確定を守る） */
  suggest: (segmentId: string, kind: Kind, confidence: number) => void
  /** 再試行でも失敗した判定を、保留の一覧に積む */
  addPending: (error: string) => void
}

/** 判定の結果を、画面に出す一行の文言にする */
export function judgeText(o: JudgeOutcome): string {
  switch (o.state) {
    case 'unconnected':
      return `判定できない（${o.reason}）`
    case 'skipped':
      return '判定する線が無い（F5・F9 の線を描いてから）'
    case 'applied':
      return `判定の提案を ${o.count} 本に入れた（要確認。確かめて確定する）`
    case 'pending':
      return '判定が保留になった（再試行でも失敗。保留の一覧へ）'
  }
}

export async function judgeSegments(
  input: { segments: SegmentIn[]; workerUrl: string; enabled: boolean; fetchImpl: (url: string, init: RequestInit) => Promise<Response> },
  sinks: JudgeSinks,
): Promise<JudgeOutcome> {
  if (!input.enabled) return { state: 'unconnected', reason: '意味づけ（Claude）が切れている' }
  if (input.workerUrl.trim() === '') return { state: 'unconnected', reason: 'Worker の URL が未設定' }
  if (input.segments.length === 0) return { state: 'skipped' }
  try {
    const out = await classifyViaWorker(input.segments, input.workerUrl, input.fetchImpl)
    for (const r of out) sinks.suggest(r.segment_id, r.kind, r.confidence)
    return { state: 'applied', count: out.length }
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e)
    sinks.addPending(error)
    return { state: 'pending', error }
  }
}
