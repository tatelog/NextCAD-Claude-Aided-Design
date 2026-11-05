// 仕様（統括の依頼 2026-11-06。依頼 3「P3 の入力を店舗に移し、P4 へ行って戻っても消えないようにする」）:
// 仕様 12（既定）: 入力の既定値は、今の P3 の既定と同じ（幅 20000・奥行 12000・住戸の奥行 6000・スパン 3000・中廊下・田の字・EV 2）。
// 仕様 13（残る）: 一度入れた値は、画面の部品が外れても店舗に残る（画面を離れて戻っても、同じ値を読める）。
// 仕様 14（一つずつ）: 一つの項目を変えても、ほかの項目は変わらない。
import { beforeEach, describe, expect, it } from 'vitest'
import { corridorDefaultOf } from '../plan/corridorDefaults'
import { P3_INPUT_DEFAULTS, useP3Input } from './p3Input'

beforeEach(() => {
  useP3Input.setState({ values: { ...P3_INPUT_DEFAULTS } })
})

describe('P3 の入力の店舗（仕様 12〜14）', () => {
  it('仕様 12: 既定の値は、今の P3 の既定と同じ', () => {
    const v = { ...P3_INPUT_DEFAULTS }
    expect(v.widthText).toBe('20000')
    expect(v.depthText).toBe('12000')
    expect(v.corridorText).toBe(String(corridorDefaultOf('中廊下')?.mm ?? 2000))
    expect(v.unitDepthText).toBe('6000')
    expect(v.spanText).toBe('3000')
    expect(v.layoutText).toBe('中廊下')
    expect(v.patternText).toBe('田の字')
    expect(v.evCountText).toBe('2')
    expect(v.targetText).toBe('')
  })

  it('仕様 13: 一度入れた値は、店舗に残る（画面が外れても、後で同じ値を読める）', () => {
    useP3Input.getState().setValue('widthText', '40601')
    // 画面を離れて戻ったあとの読み出し（部品の状態ではなく店舗から読む）
    expect(useP3Input.getState().values.widthText).toBe('40601')
  })

  it('仕様 14: 一つの項目を変えても、ほかの項目は変わらない', () => {
    useP3Input.getState().setValue('widthText', '40601')
    useP3Input.getState().setValue('spanText', '6000')
    const v = useP3Input.getState().values
    expect(v.spanText).toBe('6000')
    expect(v.widthText).toBe('40601')
    expect(v.depthText).toBe('12000')
  })
})
