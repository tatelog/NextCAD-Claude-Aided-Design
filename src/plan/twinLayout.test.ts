// 仕様（統括の決定 G106、2026-11-05）: ツインコリドーは中廊下の変形。廊下の帯は 3 倍（廊下 : 吹き抜け : 廊下 = 1 : 1 : 1）。
// 仕様 1（幅）: 建物の幅 = 住戸の奥行 × 2 + 廊下幅 × 3。
// 仕様 2（戸数）: 1 スパンに両側で 2 戸（中廊下と同じ）。目標の戸数に合うスパン数を取る。
// 仕様 3（結果）: 自動作成の結果は廊下タイプ（layout）を持ち、ツインの廊下は 2 本。
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { generateAutoPlan } from './autoPlan'
import { masterOf } from './unitTypeMaster'

const CANDIDATES = JSON.parse(readFileSync(new URL('./unitTypeCandidates.json', import.meta.url), 'utf8'))
const master = masterOf(CANDIDATES)

const base = {
  storeyCount: 5,
  storeyHeightMm: 3000,
  unitDepthMm: 6000,
  corridorMm: 2000,
  spanMm: 3000,
  evCount: 2,
  evStops: [1, 2, 3, 4, 5],
  unitTypes: master,
}

describe('ツインコリドーの自動作成（G106）', () => {
  it('建物の幅は、住戸の奥行 × 2 + 廊下幅 × 3（6000 × 2 + 2000 × 3 = 18000）', () => {
    const g = generateAutoPlan({ ...base, layout: 'ツイン', targetPerFloor: 6 })
    expect(g.widthMm).toBe(6_000 * 2 + 2_000 * 3)
    expect(g.layout).toBe('ツイン')
  })

  it('1 スパンに両側で 2 戸。目標 6 戸なら 3 スパン、区画は 6 つ', () => {
    const g = generateAutoPlan({ ...base, layout: 'ツイン', targetPerFloor: 6 })
    expect(g.spans).toBe(3)
    expect(g.cells).toHaveLength(6)
  })

  it('結果の廊下は、主の廊下 1 本（取り直しは表示の側で行う）', () => {
    const g = generateAutoPlan({ ...base, layout: 'ツイン', targetPerFloor: 6 })
    expect(g.corridor.x1 - g.corridor.x0).toBe(2_000)
  })
})
