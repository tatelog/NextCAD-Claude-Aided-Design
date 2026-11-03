// 仕様: 自動作成（P3「柱割り・間取り・縦シャフトを作る」）。目標の戸数（1 階あたり）から、スパン数と建物の寸法を決め、住戸数を確かめる。
// 仕様 1: 中廊下は廊下の両側に住戸が並ぶので、1 スパンあたり 2 戸。目標を満たす最小のスパン数を取る。
// 仕様 2: 片廊下は 1 スパンあたり 1 戸。
// 仕様 3: 建物の寸法（幅・奥行）は、住戸の奥行・廊下の幅・スパンから決まる。奥行はスパン数 × スパン。
// 仕様 4: 作った割り付けを countUnits で数え直し、目標に届かなければ shortfall に不足を返す（届いたと言い切らない）。
// 仕様 5: 縦シャフトの数: 住戸ごとの PS は 1 階の住戸数と同じ。コア脇の EPS・DS は各 1（仮置き）。
// 仕様 6: EV の数は evCount から。停止しない階は unreachable_storeys に返す（buildEvLevels の結果）。
// 仕様 7: 目標が 0 以下や整数でなければエラー。
// 仕様 8: 区画ごとに 4 室の部屋割り（仮置き）を返す。
import { describe, expect, it } from 'vitest'
import { generateAutoPlan } from './autoPlan'

const base = {
  targetPerFloor: 7,
  storeyCount: 5,
  storeyHeightMm: 3000,
  spanMm: 6000,
  unitDepthMm: 6000,
  corridorMm: 1600,
  evCount: 2,
  evStops: [1, 2, 3, 4, 5],
}

describe('generateAutoPlan（自動作成）', () => {
  it('中廊下: 目標 7 戸に対し 4 スパン（8 戸）、不足なし', () => {
    const g = generateAutoPlan({ ...base, layout: '中廊下' })
    expect(g.spans).toBe(4)
    expect(g.unitsPerFloor).toBe(8)
    expect(g.shortfall).toBe(0)
    expect(g.depthMm).toBe(4 * 6000)
    expect(g.widthMm).toBe(2 * 6000 + 1600)
  })

  it('片廊下: 1 スパン 1 戸。目標 5 戸に 5 スパン', () => {
    const g = generateAutoPlan({ ...base, targetPerFloor: 5, layout: '片廊下' })
    expect(g.spans).toBe(5)
    expect(g.unitsPerFloor).toBe(5)
    expect(g.widthMm).toBe(6000 + 1600)
  })

  it('縦シャフト: PS は住戸ごと（1 階の住戸数）、コア脇の EPS・DS は各 1', () => {
    const g = generateAutoPlan({ ...base, layout: '中廊下' })
    expect(g.shafts).toEqual({ ps: 8, eps: 1, ds: 1 })
  })

  it('EV は evCount の数だけ。停止しない階は返す', () => {
    const g = generateAutoPlan({ ...base, layout: '中廊下', evStops: [1, 3, 5] })
    expect(g.ev.ev_cores).toHaveLength(2)
    expect(g.ev.unreachable_storeys).toEqual([2, 4])
  })

  it('目標が 0 以下・整数でなければエラー', () => {
    expect(() => generateAutoPlan({ ...base, targetPerFloor: 0, layout: '中廊下' })).toThrow()
    expect(() => generateAutoPlan({ ...base, targetPerFloor: 2.5, layout: '中廊下' })).toThrow()
  })
  it('コアは廊下の中に置く: 階段 A は南の端、階段 B は北の端、EV ホールは中央（モックの配置）', () => {
    const g = generateAutoPlan({ ...base, layout: '中廊下' })
    const a = g.cores.find((c) => c.id === 'stairA')!
    const b = g.cores.find((c) => c.id === 'stairB')!
    const ev = g.cores.find((c) => c.id === 'evHall')!
    expect(a.y0).toBe(0)
    expect(b.y1).toBe(g.depthMm)
    expect((ev.y0 + ev.y1) / 2).toBe(g.depthMm / 2)
    for (const c of g.cores) {
      expect(c.x0).toBeGreaterThanOrEqual(g.corridor.x0)
      expect(c.x1).toBeLessThanOrEqual(g.corridor.x1)
    }
  })

  it('コアは住戸の区画と重ならない（廊下の中だけ）', () => {
    const g = generateAutoPlan({ ...base, layout: '中廊下' })
    for (const c of g.cores) for (const cell of g.cells) {
      const overlap = c.x0 < cell.x1 && cell.x0 < c.x1 && c.y0 < cell.y1 && cell.y0 < c.y1
      expect(overlap).toBe(false)
    }
  })

  it('EV ホールは EV の基数を持つ', () => {
    const g = generateAutoPlan({ ...base, layout: '中廊下', evCount: 2 })
    expect(g.cores.find((c) => c.id === 'evHall')!.evCount).toBe(2)
  })
})

describe('住戸タイプと間取りパターン（部屋割り）', () => {
  it('縦長は区画ごとに 4 室、田の字と同じ数', () => {
    const g = generateAutoPlan({ ...base, layout: '中廊下', pattern: '縦長' })
    expect(g.rooms).toHaveLength(g.cells.length * 4)
  })

  it('住戸タイプが単独なら、間取りパターンに関わらず区画ごとに 2 室', () => {
    const g = generateAutoPlan({ ...base, layout: '中廊下', unitType: '単独', pattern: '縦長' })
    expect(g.rooms).toHaveLength(g.cells.length * 2)
  })

  it('角は両端の区画だけ 3 室、中の区画は田の字の 4 室', () => {
    const g = generateAutoPlan({ ...base, layout: '中廊下', pattern: '角' })
    const endIds = g.cells.filter((c) => c.id === 'L0' || c.id === 'L3' || c.id === 'R0' || c.id === 'R3').map((c) => c.id)
    const roomsOf = (id: string) => g.rooms.filter((r) => r.id.startsWith(`${id}-`)).length
    for (const id of endIds) expect(roomsOf(id)).toBe(3)
    expect(roomsOf('L1')).toBe(4)
  })
})

describe('縦シャフトの位置', () => {
  const contains = (outer: { x0: number; y0: number; x1: number; y1: number }, inner: { x0: number; y0: number; x1: number; y1: number }) =>
    inner.x0 >= outer.x0 && inner.x1 <= outer.x1 && inner.y0 >= outer.y0 && inner.y1 <= outer.y1

  it('PS は住戸ごとに 1 つ。各住戸の水回りの中に入る', () => {
    const g = generateAutoPlan({ ...base, layout: '中廊下' })
    const ps = g.shaftRects.filter((s) => s.id.startsWith('PS'))
    expect(ps).toHaveLength(g.unitsPerFloor)
    for (const p of ps) {
      const wet = g.rooms.find((r) => r.kind === '水回り' && r.id.startsWith(p.unitId!))!
      expect(contains(wet, p)).toBe(true)
    }
  })

  it('EPS は階段 A、DS は階段 B の中に入る', () => {
    const g = generateAutoPlan({ ...base, layout: '中廊下' })
    const stairA = g.cores.find((c) => c.id === 'stairA')!
    const stairB = g.cores.find((c) => c.id === 'stairB')!
    expect(contains(stairA, g.shaftRects.find((s) => s.id === 'EPS')!)).toBe(true)
    expect(contains(stairB, g.shaftRects.find((s) => s.id === 'DS')!)).toBe(true)
  })

  it('縦シャフトは区画の外（コアの中）に重ならない形で、PS は区画の中だけ', () => {
    const g = generateAutoPlan({ ...base, layout: '中廊下' })
    const ps = g.shaftRects.filter((s) => s.id.startsWith('PS'))
    for (const p of ps) {
      const inCell = g.cells.some((c) => contains(c, p))
      expect(inCell).toBe(true)
    }
  })
})

// 仕様 9（住戸タイプ）: 結果は住戸タイプを持つ。指定が無ければファミリー。単独を指定すれば単独。（P4 の住戸タイプ別の表示に使う。G61）
describe('generateAutoPlan の住戸タイプ（仕様 9）', () => {
  it('仕様 9: 指定が無ければファミリー、単独を指定すれば単独を結果に持つ', () => {
    expect(generateAutoPlan({ ...base, layout: '中廊下' }).unitType).toBe('ファミリー')
    expect(generateAutoPlan({ ...base, layout: '中廊下', unitType: '単独' }).unitType).toBe('単独')
  })
})

// 仕様 10（曲線の外形に合わせる。ハブ A-03 G5）: 区画を外す判定（insideCell）を渡すと、外の区画は作らず数えず、不足は作り直した数で出す。
describe('generateAutoPlan の区画の外し（仕様 10）', () => {
  it('仕様 10: 外の区画は、結果の区画にも住戸の数にも入らず、不足は残りの数で出す', () => {
    const g = generateAutoPlan({ ...base, layout: '中廊下', insideCell: (c) => c.y0 < 4000 })
    expect(g.cells.every((c) => c.y0 < 4000)).toBe(true)
    expect(g.unitsPerFloor).toBeLessThan(8)
    expect(g.shortfall).toBe(Math.max(0, 7 - g.unitsPerFloor))
  })

  it('仕様 10: 判定を渡さなければ、従来どおり（全部の区画）', () => {
    expect(generateAutoPlan({ ...base, layout: '中廊下' }).unitsPerFloor).toBe(8)
  })
})
