// 仕様（代表の依頼 2026-11-06。1: ボリューム画面の表示のオンオフを、画面の見えるところに出す。統括の指示）:
// 仕様 V1: 初期表示は、地図 on・周辺建物 off・影 off。
// 仕様 V2: 周辺建物は、機能の調整（全体）が入っていて、かつボリュームの周辺建物が入っているときだけ出す（3D と 2D の輪郭の両方）。
// 仕様 V3: 影は、機能の調整（全体）が入っていて、かつボリュームの影が入っているときだけ出す。
import { describe, expect, it } from 'vitest'
import { useUi } from '../store/ui'
import { neighborsShownOf, shadowShownOf } from './volumeDisplay'

describe('ボリューム画面の表示（仕様 V1〜V3）', () => {
  it('仕様 V1: 初期表示は 地図 on・周辺建物 off・影 off', () => {
    const s = useUi.getState()
    expect(s.volumeMap).toBe(true)
    expect(s.volumeNeighbors).toBe(false)
    expect(s.volumeShadow).toBe(false)
  })

  it('仕様 V2: 周辺建物は、全体と画面の両方が入っているときだけ出る', () => {
    expect(neighborsShownOf(true, true)).toBe(true)
    expect(neighborsShownOf(true, false)).toBe(false)
    expect(neighborsShownOf(false, true)).toBe(false)
    expect(neighborsShownOf(false, false)).toBe(false)
  })

  it('仕様 V3: 影は、全体と画面の両方が入っているときだけ出る', () => {
    expect(shadowShownOf(true, true)).toBe(true)
    expect(shadowShownOf(true, false)).toBe(false)
    expect(shadowShownOf(false, true)).toBe(false)
    expect(shadowShownOf(false, false)).toBe(false)
  })
})

// 仕様 V4（統括の指示 2026-11-06。5a）: 斜線の面（斜線の上限の面と、食い込みの色）は、初期は off。ボリュームの画面の切り替えで出す。
describe('斜線の面の切り替え（仕様 V4）', () => {
  it('仕様 V4: 斜線の面は初期 off', () => {
    expect(useUi.getState().volumeSlope).toBe(false)
  })
})
