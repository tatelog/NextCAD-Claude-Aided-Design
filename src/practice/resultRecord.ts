// 練習の結果の記録（ハブ A-03 G11・G10）。案ごとに再現率・適合率を保存する（G10 の閾値を測る素材）。決定論。
// 練習の線は作業ログ（T-06）に残さず、Claude の意味づけ（W1）も呼ばない。この部品は計算と書き出しだけ。
import { matchPracticeLines, MATCH_TOLERANCE_MM, type MatchLine } from '../plan/practiceMatch'

export interface PracticeRecord {
  caseId: string
  /** 許容差（mm）。既定は仮置き 50 mm */
  tolMm: number
  truthCount: number
  drawnCount: number
  recall: number
  precision: number
}

export function practiceRecordOf(caseId: string, truth: readonly MatchLine[], drawn: readonly MatchLine[], tolMm: number = MATCH_TOLERANCE_MM): PracticeRecord {
  const r = matchPracticeLines(truth, drawn, tolMm)
  return { caseId, tolMm, truthCount: truth.length, drawnCount: drawn.length, recall: r.recall, precision: r.precision }
}

/** 記録を案の番号の順に並べて、JSON に書き出す（入力は書き換えない） */
export function recordsToJson(records: readonly PracticeRecord[]): string {
  const sorted = [...records].sort((p, q) => (p.caseId < q.caseId ? -1 : p.caseId > q.caseId ? 1 : 0))
  return JSON.stringify(sorted, null, 2)
}
