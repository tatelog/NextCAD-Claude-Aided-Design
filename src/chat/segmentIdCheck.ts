// 返事の線の id の検査（統括の依頼 2026-11-06。2）。AI の出力をそのまま使わない（決定論）。
// 返事の線への変更（setKind）は、送った文脈の『選んだ線』の id だけを使う。それ以外は図面を変えず、線を選ぶように出す。
import { CHAT_EXCERPT_MAX } from './chatContext'
import type { Change } from './claudeReply'

/** 返事の線への変更の id のうち、選んだ線に無いもの（選んでいない・存在しない）。線に関係しない変更は見ない */
export function unknownSegmentIdsOf(changes: readonly Change[], allowedIds: readonly string[]): string[] {
  const allowed = new Set(allowedIds)
  return changes.flatMap((c) => (c.op === 'setKind' && !allowed.has(c.segmentId) ? [c.segmentId] : []))
}

/** 文脈に入れる『選んだ線』の id（図面の順。上限は CHAT_EXCERPT_MAX） */
export function contextSelectedIdsOf(segments: readonly { id: string }[], selectedIds: readonly string[]): string[] {
  return segments.filter((s) => selectedIds.includes(s.id)).slice(0, CHAT_EXCERPT_MAX).map((s) => s.id)
}
