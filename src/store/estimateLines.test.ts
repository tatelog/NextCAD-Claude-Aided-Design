// 仕様（ハブ A-03 G86「見積は明細の DB」。見積の明細は SQLite の 1 表が正本、画面はそこから読む）:
// 仕様 1: 表の準備（init）の前は、入れた明細をそのまま持つ（保存はしない。persisted は false）。
// 仕様 2: 準備の後は、setLines で表に書き、表から読み出した明細を持つ（persisted は true）。読み出しは入力の順。
// 仕様 3: setLines を重ねると、表の中身は最新の入力だけになる。
// 仕様 4: 同じ入力には同じ出力。
import { describe, expect, it } from 'vitest'
import { useEstimateLines } from './estimateLines'
import type { EstimateDetail } from '../estimate/estimateDetails'

const lines: EstimateDetail[] = [
  {
    lineId: 'slab-1/formwork',
    objectId: 'slab-1',
    category: '躯体',
    item: '型枠（床版の下面）',
    quantity: 90,
    unit: 'm2',
    unitPriceRef: 'carpenter',
    amountYen: 675000,
    provisional: true,
    source: '出典なし・仮置き（G22）',
    basis: '床版と同じ面積（支保工は含めない）',
    origin: '自動',
  },
  {
    lineId: 'roof-1/roof',
    objectId: 'roof-1',
    category: '外装',
    item: '屋根防水',
    quantity: 18,
    unit: 'm2',
    unitPriceRef: null,
    amountYen: null,
    provisional: false,
    source: '計算（仮置きなし）',
    basis: '外形から',
    origin: '自動',
  },
]

describe('準備の前（仕様 1）', () => {
  it('入れた明細をそのまま持ち、保存はしない', () => {
    useEstimateLines.setState({ db: null, lines: [], persisted: false })
    useEstimateLines.getState().setLines(lines)
    expect(useEstimateLines.getState().lines).toEqual(lines)
    expect(useEstimateLines.getState().persisted).toBe(false)
  })
})

describe('準備の後（仕様 2〜3）', () => {
  it('表に書き、表から読み出した明細を持つ（入力の順）', async () => {
    await useEstimateLines.getState().init()
    useEstimateLines.getState().setLines(lines)
    expect(useEstimateLines.getState().lines).toEqual(lines)
    expect(useEstimateLines.getState().persisted).toBe(true)
  })

  it('setLines を重ねると、最新の入力だけになる', async () => {
    await useEstimateLines.getState().init()
    useEstimateLines.getState().setLines(lines)
    useEstimateLines.getState().setLines([lines[1]!])
    expect(useEstimateLines.getState().lines).toEqual([lines[1]])
  })
})

describe('同じ入力（仕様 4）', () => {
  it('同じ入力には同じ出力', async () => {
    await useEstimateLines.getState().init()
    useEstimateLines.getState().setLines(lines)
    const first = useEstimateLines.getState().lines
    useEstimateLines.getState().setLines(lines)
    expect(useEstimateLines.getState().lines).toEqual(first)
  })
})
