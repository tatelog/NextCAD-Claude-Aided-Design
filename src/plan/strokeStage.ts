// 描いた線の段階（統括の依頼 2026-11-06。B）。ドローのモードで描いた線は種類の線（F5）で作る。
// 押さえている間の判定と、右側の候補の確認の対象になる。システムのモードで描いた線は外形（F4）のまま。
import type { Stage } from '../model/schema'
import type { WorkMode } from '../store/mode'

/** 描いた線の段階。ドローは F5、それ以外（システム）は F4 */
export function strokeStageOf(mode: WorkMode): Stage {
  return mode === 'drawing' ? 'F5' : 'F4'
}
