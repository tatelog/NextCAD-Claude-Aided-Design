// 仕様（統括の決定 G107、2026-11-05）: 階段室型は、階段室 1 つに 2 戸（両側）。階段室のしつらえは 2 パターン。
// 仕様 1（戸数）: 階段室は 1 スパンに両側で 2 戸。
// 仕様 2（既定）: 階段室のしつらえの既定は屋内シャフト（全部屋内として扱う）。
// 仕様 3（外部階段）: しつらえに外部階段（4 面のうち 2 面がアルミスリット、外壁に接する）を選べる。結果に出す。
// 仕様 4（階段室以外）: 階段室以外の廊下タイプには、しつらえは無い（null）。
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
  corridorMm: 1600,
  spanMm: 3000,
  evCount: 2,
  evStops: [1, 2, 3, 4, 5],
  unitTypes: master,
}

describe('階段室型の戸数と、しつらえ（G107）', () => {
  it('階段室は 1 スパンに両側で 2 戸（目標 6 戸なら 3 スパン、区画は 6 つ）', () => {
    const g = generateAutoPlan({ ...base, layout: '階段室', targetPerFloor: 6 })
    expect(g.spans).toBe(3)
    expect(g.cells).toHaveLength(6)
  })

  it('既定のしつらえは屋内シャフト', () => {
    const g = generateAutoPlan({ ...base, layout: '階段室', targetPerFloor: 6 })
    expect(g.stairFinish).toBe('indoorShaft')
  })

  it('外部階段（アルミスリット 2 面）を選べて、結果に出る', () => {
    const g = generateAutoPlan({ ...base, layout: '階段室', targetPerFloor: 6, stairFinish: 'outdoorSlit' })
    expect(g.stairFinish).toBe('outdoorSlit')
  })

  it('階段室以外の廊下タイプには、しつらえは無い（null）', () => {
    expect(generateAutoPlan({ ...base, layout: '中廊下', targetPerFloor: 6 }).stairFinish).toBeNull()
    expect(generateAutoPlan({ ...base, layout: '片廊下', targetPerFloor: 6 }).stairFinish).toBeNull()
    expect(generateAutoPlan({ ...base, layout: 'ツイン', targetPerFloor: 6 }).stairFinish).toBeNull()
  })
})
