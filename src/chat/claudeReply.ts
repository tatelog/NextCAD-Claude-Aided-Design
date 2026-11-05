// Claude の返答の型（ハブ A-03 G96・G97、統括の依頼 t55）。決定論。
// AGENTS.md の方針「型付き判断は JSON スキーマを強制し、スキーマ外の出力は弾く」に従う。返答は、この型に合うものだけ通す。
import { z } from 'zod'
import { KINDS } from '../plan/semantic'

/** 図面の変更（G97）。いまの店舗が持つ操作だけ。線の追加などは Worker の配備後に足す */
export const ChangeSchema = z.discriminatedUnion('op', [
  z.object({ op: z.literal('setStoreyCount'), count: z.number().int().min(1).max(30) }),
  z.object({ op: z.literal('setStoreyHeight'), mm: z.number().int().min(1) }),
  z.object({ op: z.literal('setKind'), segmentId: z.string().min(1), kind: z.enum(KINDS) }),
  // 数値の線を一本足す（G140。始点・長さ・角度で決まる。Worker の配備を待たずに作れる操作）
  z.object({
    op: z.literal('addLine'),
    start: z.object({ x: z.number().int(), y: z.number().int() }),
    lengthMm: z.number().positive().max(100_000),
    angleDeg: z.number().finite(),
  }),
])

export type Change = z.infer<typeof ChangeSchema>

export const ClaudeReplySchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('answer'), text: z.string().min(1) }),
  z.object({ type: z.literal('question'), text: z.string().min(1), choices: z.array(z.string().min(1)).min(2).max(6) }),
  z.object({ type: z.literal('changes'), text: z.string().min(1), changes: z.array(ChangeSchema).min(1) }),
])

export type ClaudeReply = z.infer<typeof ClaudeReplySchema>

/** Claude の返答を型に通す。型に合わなければ例外（黙って直さない） */
export function parseClaudeReply(raw: unknown): ClaudeReply {
  return ClaudeReplySchema.parse(raw)
}
