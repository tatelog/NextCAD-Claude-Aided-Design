import { describe, expect, it } from 'vitest'
import { createViewport } from '../geom/viewport'
import {
  ENDPOINT_RING_RADIUS_PX,
  ENDPOINT_SNAP_RADIUS_PX,
  endpointsToRing,
  pickEndpoint,
  pickEndpointWithin,
  resolveEndpoint,
  ringCentersPx,
  strokeStartPx,
} from './endpointPick'

// 仕様（ハブ D-04 共通部品「端点の吸着」・G37・D-02 C1。数値は仮置き）
//  - 既存の端点の近くで押すと、その端点から描き始める
//  - 端点は普段は出さず、ポインタが近づいた端点だけ輪で示す
//  - 吸着半径は 24 px（画面の px）
//  - 端点は ID を持ち、スナップ半径内で既存の端点に吸着したら、新しい端点を作らずその ID を共有する
//  - 輪の大きさ: 半径 10 px

const MM_PER_PX = 10; // 1 px = 10 mm
const POINTER = { x: 5000, y: 3000 }; // 原点でない位置（座標の引き算を忘れた実装を弾く）

/** ポインタから (dxPx, dyPx) 画面 px だけ離れた位置にある端点（mm 座標） */
const endpointAt = (id: string, dxPx: number, dyPx = 0) => ({
  id,
  x: POINTER.x + dxPx * MM_PER_PX,
  y: POINTER.y + dyPx * MM_PER_PX,
})

const sortedIds = (list: readonly { id: string }[]) => list.map((e) => e.id).sort()

/** 新しい端点 ID を払い出す係。何回払い出したかを数える */
const idIssuer = () => {
  let count = 0
  return {
    next: () => `new-${++count}`,
    issued: () => count,
  }
}

describe('吸着半径と輪の大きさ（仮置きの値）', () => {
  it('吸着半径は 24 px', () => {
    expect(ENDPOINT_SNAP_RADIUS_PX).toBe(24)
  })

  it('輪の半径は 10 px', () => {
    expect(ENDPOINT_RING_RADIUS_PX).toBe(10)
  })
})

describe('pickEndpoint: ポインタの近くの端点を選ぶ', () => {
  it('(a) 24 px 以内なら、その端点を選ぶ', () => {
    const e = endpointAt('e1', 10)
    expect(pickEndpoint([e], POINTER, MM_PER_PX)).toBe(e)
  })

  it('(a) ちょうど 24 px でも選ぶ（24 px 以内）', () => {
    const e = endpointAt('e1', 24)
    expect(pickEndpoint([e], POINTER, MM_PER_PX)).toBe(e)
  })

  it('(a) ポインタと端点が同じ位置でも選ぶ', () => {
    const e = endpointAt('e1', 0)
    expect(pickEndpoint([e], POINTER, MM_PER_PX)).toBe(e)
  })

  it('(b) 24 px を超えたら選ばない', () => {
    expect(pickEndpoint([endpointAt('e1', 25)], POINTER, MM_PER_PX)).toBeNull()
  })

  it('(b) 24 px をわずかに超えても選ばない', () => {
    expect(pickEndpoint([endpointAt('e1', 24.5)], POINTER, MM_PER_PX)).toBeNull()
  })

  it('(b) 負の側（左・上）でも 24 px を超えたら選ばない', () => {
    expect(pickEndpoint([endpointAt('e1', -25, 0)], POINTER, MM_PER_PX)).toBeNull()
    expect(pickEndpoint([endpointAt('e2', 0, -25)], POINTER, MM_PER_PX)).toBeNull()
  })

  it.each([
    { mmPerPx: 100, distanceMm: 2400, picked: true },
    { mmPerPx: 100, distanceMm: 2500, picked: false },
    { mmPerPx: 10, distanceMm: 240, picked: true },
    { mmPerPx: 10, distanceMm: 250, picked: false },
    { mmPerPx: 1, distanceMm: 24, picked: true },
    { mmPerPx: 1, distanceMm: 25, picked: false },
    { mmPerPx: 0.5, distanceMm: 12, picked: true },
    { mmPerPx: 0.5, distanceMm: 12.5, picked: false },
  ])(
    '(a)(b) 半径は画面の px: 1 px = $mmPerPx mm のとき、$distanceMm mm 離れた端点は選ばれる = $picked',
    ({ mmPerPx, distanceMm, picked }) => {
      const e = { id: 'e1', x: POINTER.x + distanceMm, y: POINTER.y }
      expect(pickEndpoint([e], POINTER, mmPerPx)).toBe(picked ? e : null)
    },
  )

  it('(a)(b) 距離は直線距離: 縦横とも 24 px 以内でも、斜めに 24 px を超えれば選ばない', () => {
    // (18, 18) px は直線距離で約 25.5 px
    expect(pickEndpoint([endpointAt('out', 18, 18)], POINTER, MM_PER_PX)).toBeNull()
    // (14, 14) px は直線距離で約 19.8 px
    const inside = endpointAt('in', 14, 14)
    expect(pickEndpoint([inside], POINTER, MM_PER_PX)).toBe(inside)
  })

  it('(c) 24 px 以内に複数あれば、最も近い端点を選ぶ（並び順に依存しない）', () => {
    const far = endpointAt('far', 20, 0)
    const nearest = endpointAt('nearest', -5, 3); // 約 5.8 px
    const mid = endpointAt('mid', 0, -12)
    const outside = endpointAt('outside', 30, 0)
    const orders = [
      [far, nearest, mid, outside],
      [outside, mid, nearest, far],
      [nearest, far, outside, mid],
      [mid, outside, far, nearest],
    ]
    for (const list of orders) {
      expect(pickEndpoint(list, POINTER, MM_PER_PX)).toBe(nearest)
    }
  })

  it('(b)(c) 24 px の外の端点は、並びが先でも選ばない（24 px 以内の端点を選ぶ）', () => {
    const inside = endpointAt('inside', 23)
    const outside = endpointAt('outside', 26)
    expect(pickEndpoint([outside, inside], POINTER, MM_PER_PX)).toBe(inside)
  })

  it('(d) 端点がなければ null', () => {
    expect(pickEndpoint([], POINTER, MM_PER_PX)).toBeNull()
  })
})

describe('endpointsToRing: 輪で示す端点', () => {
  it('(e) 輪で示す端点は、24 px 以内の端点だけ', () => {
    const list = [
      endpointAt('a', 5),
      endpointAt('b', 24),
      endpointAt('c', 25),
      endpointAt('d', 100),
      endpointAt('e', 0, -23),
      endpointAt('f', -18, -18), // 直線距離で約 25.5 px
    ]
    expect(sortedIds(endpointsToRing(list, POINTER, MM_PER_PX))).toEqual(['a', 'b', 'e'])
  })

  it('(e) 端点は普段は出さない: ポインタの近くに端点がなければ、輪は 1 つもない', () => {
    const list = [endpointAt('a', 40), endpointAt('b', -60, 10), endpointAt('c', 0, 200)]
    expect(endpointsToRing(list, POINTER, MM_PER_PX)).toEqual([])
  })

  it('(e) 端点が 1 つもなければ、輪も 1 つもない', () => {
    expect(endpointsToRing([], POINTER, MM_PER_PX)).toEqual([])
  })

  it('(e) ポインタが離れると輪は消え、近づくと輪が出る', () => {
    const e = { id: 'e1', x: 0, y: 0 }
    expect(endpointsToRing([e], { x: 1000, y: 0 }, MM_PER_PX)).toEqual([]); // 100 px
    expect(sortedIds(endpointsToRing([e], { x: 200, y: 0 }, MM_PER_PX))).toEqual(['e1']); // 20 px
  })

  it('(e) 吸着先として選ばれる端点は、必ず輪で示される', () => {
    const list = [endpointAt('a', 20), endpointAt('b', -4, 3), endpointAt('c', 40)]
    const picked = pickEndpoint(list, POINTER, MM_PER_PX)
    expect(picked).not.toBeNull()
    expect(sortedIds(endpointsToRing(list, POINTER, MM_PER_PX))).toContain(picked!.id)
  })
})

describe('resolveEndpoint: 始点（と終点）を決める', () => {
  it('(f) 端点を選んで始点にすると、始点はその端点の mm 座標に一致し、端点 ID を共有する（新しい ID を割り当てない）', () => {
    const existing = { id: 'e1', x: 12000, y: 8000 }
    const issuer = idIssuer()

    // 端点から 7 px（70 mm）ずれた位置で押す
    const start = resolveEndpoint([existing], { x: 12070, y: 8000 }, MM_PER_PX, issuer.next)

    expect(start.x).toBe(12000)
    expect(start.y).toBe(8000)
    expect(start.endpointId).toBe('e1')
    expect(start.isNew).toBe(false)
    expect(issuer.issued()).toBe(0)
  })

  it('(f) 近くに端点が複数あれば、最も近い端点の座標と ID を使う', () => {
    const list = [
      { id: 'far', x: 12150, y: 8000 }, // 押した位置から 15 px
      { id: 'near', x: 12020, y: 8030 }, // 押した位置から約 3.6 px
    ]
    const issuer = idIssuer()

    const start = resolveEndpoint(list, { x: 12000, y: 8000 }, MM_PER_PX, issuer.next)

    expect(start.endpointId).toBe('near')
    expect(start.x).toBe(12020)
    expect(start.y).toBe(8030)
    expect(issuer.issued()).toBe(0)
  })

  it('(g) 近くに端点がないときは、始点は与えた座標のままで、新しい端点 ID を割り当てる', () => {
    const farAway = { id: 'e1', x: 12000, y: 8000 }
    const issuer = idIssuer()

    // 端点から 30 px（300 mm）離れた位置で押す
    const start = resolveEndpoint([farAway], { x: 12300, y: 8000 }, MM_PER_PX, issuer.next)

    expect(start.x).toBe(12300)
    expect(start.y).toBe(8000)
    expect(start.endpointId).toBe('new-1')
    expect(start.endpointId).not.toBe('e1')
    expect(start.isNew).toBe(true)
    expect(issuer.issued()).toBe(1)
  })

  it('(g) 端点が 1 つもないときも、与えた座標のまま新しい端点 ID を割り当てる', () => {
    const issuer = idIssuer()

    const start = resolveEndpoint([], { x: 4321, y: 8765 }, MM_PER_PX, issuer.next)

    expect(start).toEqual({ x: 4321, y: 8765, endpointId: 'new-1', isNew: true })
    expect(issuer.issued()).toBe(1)
  })

  it('描き終わりも同じ規則: 始点の端点の近くで終えたら、その端点 ID を共有する（閉じた形になる）', () => {
    const issuer = idIssuer()
    const start = resolveEndpoint([], { x: 0, y: 0 }, MM_PER_PX, issuer.next)

    // 始点から 20 px（200 mm）の位置で描き終える
    const end = resolveEndpoint(
      [{ id: start.endpointId, x: start.x, y: start.y }],
      { x: 200, y: 0 },
      MM_PER_PX,
      issuer.next,
    )

    expect(end.endpointId).toBe(start.endpointId)
    expect(end.x).toBe(0)
    expect(end.y).toBe(0)
    expect(end.isNew).toBe(false)
    expect(issuer.issued()).toBe(1); // 始点で払い出した 1 回だけ
  })
})

// 既存の吸着（snapPoint）は半径をすでに mm に換算して持つ。同じ「端点を選ぶ」規則を mm の半径で使えるようにする
describe('pickEndpointWithin: 半径（mm）以内で最も近い端点', () => {
  const at = (id: string, x: number, y: number) => ({ id, x, y })

  it('半径以内で最も近い端点を選ぶ（並び順に依存しない）', () => {
    const far = at('far', 400, 0)
    const near = at('near', -100, 50)
    for (const list of [[far, near], [near, far]]) {
      expect(pickEndpointWithin(list, { x: 0, y: 0 }, 500)).toBe(near)
    }
  })

  it('ちょうど半径の距離でも選ぶ。半径を超えたら選ばない', () => {
    const e = at('e1', 300, 400); // 直線距離 500 mm
    expect(pickEndpointWithin([e], { x: 0, y: 0 }, 500)).toBe(e)
    expect(pickEndpointWithin([e], { x: 0, y: 0 }, 499)).toBeNull()
  })

  it('端点がなければ null', () => {
    expect(pickEndpointWithin([], { x: 0, y: 0 }, 500)).toBeNull()
  })

  it('pickEndpoint（px 半径）と同じ結果になる: 半径 = 24 px × 1 px あたりの mm', () => {
    const list = [endpointAt('a', 20), endpointAt('b', -5, 3), endpointAt('c', 30)]
    expect(pickEndpointWithin(list, POINTER, ENDPOINT_SNAP_RADIUS_PX * MM_PER_PX)).toBe(
      pickEndpoint(list, POINTER, MM_PER_PX),
    )
  })
})

// キャンバス用: ポインタも描く位置も画面 px。実寸 mm との換算は ビューポート（原点・1 px あたりの mm）で行う
describe('画面 px で扱う（キャンバス用）', () => {
  // 画面の (100, 500) が mm の原点。1 px = 10 mm。mm の +y は画面の上向き（px の −y）
  const vp = createViewport({ originPx: { x: 100, y: 500 }, mmPerPx: 10 })
  // mm (1000, 2000) の端点は、画面では (200, 300)
  const node = { id: 'n1', x: 1000, y: 2000 }

  describe('ringCentersPx: 輪を描く位置（画面 px）', () => {
    it('(e) 24 px 以内の端点の画面位置だけを返す（mm の +y は画面の上）', () => {
      const other = { id: 'n2', x: 0, y: 1000 }; // 画面では (100, 400)
      // ポインタ (210, 305) は node の画面位置 (200, 300) から約 11 px、other からは 100 px 以上
      expect(ringCentersPx([node, other], { x: 210, y: 305 }, vp)).toEqual([{ x: 200, y: 300 }])
      // ポインタ (105, 395) は other の画面位置 (100, 400) から約 7 px
      expect(ringCentersPx([node, other], { x: 105, y: 395 }, vp)).toEqual([{ x: 100, y: 400 }])
    })

    it('(e) 端点は普段は出さない: ポインタが 24 px より離れていれば、輪は 1 つもない', () => {
      expect(ringCentersPx([node], { x: 300, y: 300 }, vp)).toEqual([])
      expect(ringCentersPx([node], { x: 200, y: 325 }, vp)).toEqual([]); // 25 px
    })

    it('(e) ちょうど 24 px なら輪を出す', () => {
      expect(ringCentersPx([node], { x: 200, y: 324 }, vp)).toEqual([{ x: 200, y: 300 }])
    })

    it('(e) 24 px は画面の px: 拡大すると、同じ mm の端点でも輪が出なくなる', () => {
      const zoomedIn = createViewport({ originPx: { x: 100, y: 500 }, mmPerPx: 1 })
      // 画面では (1100, -1500) だが、ポインタを (1130, -1500) に置くと 30 px 離れている
      expect(ringCentersPx([node], { x: 1130, y: -1500 }, zoomedIn)).toEqual([])
      expect(ringCentersPx([node], { x: 1120, y: -1500 }, zoomedIn)).toEqual([{ x: 1100, y: -1500 }])
    })
  })

  describe('strokeStartPx: 押したときの軌跡の始点（画面 px）', () => {
    it('(f) 端点の 24 px 以内で押すと、軌跡はその端点の画面位置から始まる', () => {
      expect(strokeStartPx([node], { x: 210, y: 305 }, vp)).toEqual({ x: 200, y: 300 })
    })

    it('(f) 近くに複数の端点があれば、最も近い端点から始まる', () => {
      const near = { id: 'near', x: 1100, y: 2000 }; // 画面では (210, 300)
      expect(strokeStartPx([node, near], { x: 212, y: 301 }, vp)).toEqual({ x: 210, y: 300 })
      expect(strokeStartPx([near, node], { x: 212, y: 301 }, vp)).toEqual({ x: 210, y: 300 })
    })

    it('(g) 近くに端点がなければ、押した位置のまま', () => {
      expect(strokeStartPx([node], { x: 300, y: 300 }, vp)).toEqual({ x: 300, y: 300 })
      expect(strokeStartPx([], { x: 300, y: 300 }, vp)).toEqual({ x: 300, y: 300 })
    })

    it('(g) 24 px を超えていれば端点には吸着しない', () => {
      expect(strokeStartPx([node], { x: 225, y: 300 }, vp)).toEqual({ x: 225, y: 300 })
    })
  })
})
