// 容積率の判定（A-03 G28、D-02 C4・C5）。上限が無ければ判定不能。前面道路による制限（G16）は含めない。
import { z } from 'zod'

export type FarJudgement = '適合' | '不適合' | '判定不能'

export function judgeFar(ratio: number, limitPercent: number | undefined): FarJudgement {
  if (limitPercent === undefined) return '判定不能'
  const limit = z.number().positive().parse(limitPercent)
  return ratio * 100 <= limit ? '適合' : '不適合'
}
