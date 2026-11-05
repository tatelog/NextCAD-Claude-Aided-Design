// Drawing モードで、ペンを押さえている間に判定を送るかの決め方（ハブ A-03 G108・G110・G112）。決定論。
// 押さえ続けた時間が HOLD_JUDGE_MS に届いたら、描いた線だけを送る（チャットの文は送らない）。
// 離したあとは、候補の確認欄でまとめて確認する。ホールドの長さは未決のため、設定値で持つ（仮置き）。

/** 押さえ続けてから判定を送るまでの時間（ms）。仮置き（未決） */
export const HOLD_JUDGE_MS = 600

export type HoldDecision =
  | { kind: 'wait' }
  | { kind: 'skip' }
  | { kind: 'send' }
  | { kind: 'unconnected'; reason: string }

/** 押さえている時間と線の数で、判定を送るかを決める。並びは judgeSegments と同じ（意味づけ・URL・線の数） */
export function holdJudgeDecision(input: { heldMs: number; segmentCount: number; enabled: boolean; workerUrl: string }): HoldDecision {
  if (input.heldMs < HOLD_JUDGE_MS) return { kind: 'wait' }
  if (!input.enabled) return { kind: 'unconnected', reason: '意味づけ（Claude）が切れている' }
  if (input.workerUrl.trim() === '') return { kind: 'unconnected', reason: 'Worker の URL が未設定' }
  if (input.segmentCount === 0) return { kind: 'skip' }
  return { kind: 'send' }
}

/**
 * 押さえている間に送った線（仮の id）を、離したあとに確定した線の id に順番で対応づける。
 * 押さえている間と離したあとで線の数が違うなら、対応づけない（null）。
 */
export function rekeyBySegmentOrder(provisionalIds: readonly string[], committedIds: readonly string[]): Map<string, string> | null {
  if (provisionalIds.length !== committedIds.length) return null
  return new Map(provisionalIds.map((p, i) => [p, committedIds[i]!]))
}

