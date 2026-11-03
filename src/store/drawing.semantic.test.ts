// 仕様: 動いた線の「要確認」の印（ハブ A-03 G65 の既定。仮置き。再判定は Worker の配備後で、今回は行わない）。
// 仕様 1: つまみ・回転・向きの合わせなど、外形を動かす変形（transform）で、動いた線のうち種類を持つものは「要確認」になる。
//   種類は消さない。誰が（人）も変えない。動いた線 = 座標（x1・y1・x2・y2）または revision が変わった線。
// 仕様 2: 動かなかった線は、確定のまま変わらない。
// 仕様 3: 種類を持たない線は、動いても何もしない（未分類のまま。割り当てを作らない）。
// 仕様 4: 新しく描いた線（addStroke）には何もしない。すでに種類を持つ線も変わらない。
// 仕様 5: 変形で増えた線・消えた線は、動いた線に含めない。
// 仕様 6: 何も動かない変形では、印は付かない。
import { beforeEach, describe, expect, it } from 'vitest'
import type { Stroke } from '../model/schema'
import { useDrawing, type DrawingState } from './drawing'
import { useSemantic } from './semantic'

// 1 px = 50 mm。原点は画面の (0,0)
let seq = 0
const stroke = (points: [number, number][]): Stroke => ({
  id: `st-${seq++}`,
  points: points.map(([px, py]) => ({ px, py })),
  view_scale: 50,
  view_origin: { px: 0, py: 0 },
  stage: 'F5',
  pen_mode: 'line',
  created_at: '2026-11-04T00:00:00.000Z',
  pen_input: 'mouse',
})

// 横に 5000 mm の線を 1 本。y を離せば、端点を共有しない別々の線になる（吸着半径 24 px より離す）
const hLine = (yPx: number): Stroke => stroke([[0, yPx], [100, yPx]])

type TransformFn = Parameters<DrawingState['transform']>[0]

const entriesNow = () => useDrawing.getState().entries
/** i 本目のストロークの線分の id */
const idsOf = (i: number): string[] => entriesNow()[i]!.segments.map((s) => s.id)
const assignmentsNow = () => useSemantic.getState().assignments

/** ids の線分を x 方向に dx mm 動かす。bump が true なら revision を 1 進める（外形の編集と同じ） */
const moveSegments =
  (ids: readonly string[], dx: number, bump = true): TransformFn =>
  (entries) =>
    entries.map((e) => ({
      ...e,
      segments: e.segments.map((s) =>
        ids.includes(s.id) ? { ...s, x1: s.x1 + dx, x2: s.x2 + dx, revision: bump ? s.revision + 1 : s.revision } : s,
      ),
    }))

describe('動いた線の要確認の印（transform）', () => {
  beforeEach(() => {
    useDrawing.setState({ entries: [], past: [], redoStack: [], fitted: false })
    useSemantic.setState({ assignments: {} })
  })

  it('動いた線が種類を持っていれば要確認になる。種類と誰が（人）は消えない', () => {
    useDrawing.getState().addStroke(hLine(0))
    const [id] = idsOf(0)
    useSemantic.getState().setKind(id!, 'wall')
    useDrawing.getState().transform(moveSegments([id!], 1_000))
    expect(assignmentsNow()[id!]).toEqual({ kind: 'wall', status: 'needs_review', by: 'human' })
  })

  it('座標だけが変わる変形（revision はそのまま）でも、動いた線として要確認になる', () => {
    useDrawing.getState().addStroke(hLine(0))
    const [id] = idsOf(0)
    useSemantic.getState().setKind(id!, 'beam')
    useDrawing.getState().transform(moveSegments([id!], 1_000, false))
    expect(assignmentsNow()[id!]).toEqual({ kind: 'beam', status: 'needs_review', by: 'human' })
  })

  it('revision だけが変わる変形（座標はそのまま）でも、動いた線として要確認になる', () => {
    useDrawing.getState().addStroke(hLine(0))
    const [id] = idsOf(0)
    useSemantic.getState().setKind(id!, 'room')
    useDrawing.getState().transform(moveSegments([id!], 0, true))
    expect(assignmentsNow()[id!]).toEqual({ kind: 'room', status: 'needs_review', by: 'human' })
  })

  it('全部の線が動けば、種類を持つ線は全部が要確認になる（回転のように）', () => {
    useDrawing.getState().addStroke(hLine(0))
    useDrawing.getState().addStroke(hLine(300))
    const all = [...idsOf(0), ...idsOf(1)]
    useSemantic.getState().setKind(idsOf(0)[0]!, 'wall')
    useSemantic.getState().setKind(idsOf(1)[0]!, 'column')
    useDrawing.getState().transform(moveSegments(all, 500))
    expect(assignmentsNow()[idsOf(0)[0]!]).toEqual({ kind: 'wall', status: 'needs_review', by: 'human' })
    expect(assignmentsNow()[idsOf(1)[0]!]).toEqual({ kind: 'column', status: 'needs_review', by: 'human' })
  })

  it('動かなかった線は、確定のまま変わらない', () => {
    useDrawing.getState().addStroke(hLine(0))
    useDrawing.getState().addStroke(hLine(300))
    const [moved] = idsOf(0)
    const [still] = idsOf(1)
    useSemantic.getState().setKind(moved!, 'wall')
    useSemantic.getState().setKind(still!, 'room')
    useDrawing.getState().transform(moveSegments([moved!], 1_000))
    expect(assignmentsNow()[moved!]?.status).toBe('needs_review')
    expect(assignmentsNow()[still!]).toEqual({ kind: 'room', status: 'confirmed', by: 'human' })
  })

  it('外形の線だけが動いたとき、動いていない線の種類は確定のまま', () => {
    useDrawing.getState().addStroke(hLine(0)) // 外形の側
    useDrawing.getState().addStroke(hLine(300)) // 柱割りの側
    const [outline] = idsOf(0)
    const [column] = idsOf(1)
    useSemantic.getState().setKind(column!, 'column')
    useDrawing.getState().transform(moveSegments([outline!], 2_000))
    expect(assignmentsNow()).toEqual({ [column!]: { kind: 'column', status: 'confirmed', by: 'human' } })
  })

  it('種類を持たない線は、動いても何もしない（割り当てを作らない）', () => {
    useDrawing.getState().addStroke(hLine(0))
    useDrawing.getState().addStroke(hLine(300))
    const [withKind] = idsOf(0)
    const [noKind] = idsOf(1)
    useSemantic.getState().setKind(withKind!, 'wall')
    useDrawing.getState().transform(moveSegments([withKind!, noKind!], 1_000))
    expect(assignmentsNow()[withKind!]?.status).toBe('needs_review')
    expect(noKind! in assignmentsNow()).toBe(false)
    expect(Object.keys(assignmentsNow())).toEqual([withKind!])
  })

  it('種類を持つ線が一つも無ければ、動いても割り当ては空のまま', () => {
    useDrawing.getState().addStroke(hLine(0))
    useDrawing.getState().transform(moveSegments(idsOf(0), 1_000))
    expect(assignmentsNow()).toEqual({})
  })

  it('何も動かない変形では、印は付かない', () => {
    useDrawing.getState().addStroke(hLine(0))
    const [id] = idsOf(0)
    useSemantic.getState().setKind(id!, 'wall')
    useDrawing.getState().transform((entries) => entries.map((e) => ({ ...e })))
    expect(assignmentsNow()[id!]).toEqual({ kind: 'wall', status: 'confirmed', by: 'human' })
  })

  it('動いたあとに、同じ種類を選び直すと確定に戻る（この種類で確定）', () => {
    useDrawing.getState().addStroke(hLine(0))
    const [id] = idsOf(0)
    useSemantic.getState().setKind(id!, 'wall')
    useDrawing.getState().transform(moveSegments([id!], 1_000))
    expect(assignmentsNow()[id!]?.status).toBe('needs_review')
    useSemantic.getState().setKind(id!, 'wall')
    expect(assignmentsNow()[id!]).toEqual({ kind: 'wall', status: 'confirmed', by: 'human' })
  })
})

describe('動いた線の印: 描き足し・増えた線・消えた線', () => {
  beforeEach(() => {
    useDrawing.setState({ entries: [], past: [], redoStack: [], fitted: false })
    useSemantic.setState({ assignments: {} })
  })

  it('新しく描いた線（addStroke）には何もしない。すでに種類を持つ線も変わらない', () => {
    useDrawing.getState().addStroke(hLine(0))
    const [first] = idsOf(0)
    useSemantic.getState().setKind(first!, 'wall')
    useDrawing.getState().addStroke(hLine(300))
    expect(entriesNow()).toHaveLength(2)
    expect(assignmentsNow()).toEqual({ [first!]: { kind: 'wall', status: 'confirmed', by: 'human' } })
  })

  it('種類を持たない線を描き足しても、割り当ては空のまま', () => {
    useDrawing.getState().addStroke(hLine(0))
    useDrawing.getState().addStroke(hLine(300))
    expect(assignmentsNow()).toEqual({})
  })

  it('変形で増えた線には印を付けない。もとの線は確定のまま', () => {
    useDrawing.getState().addStroke(hLine(0))
    const [id] = idsOf(0)
    useSemantic.getState().setKind(id!, 'wall')
    useDrawing.getState().transform((entries) => {
      const e = entries[0]!
      const added = { ...e, segments: e.segments.map((s) => ({ ...s, id: 'added-seg', x1: s.x1 + 777 })) }
      return [...entries, added]
    })
    expect(entriesNow()).toHaveLength(2)
    expect(assignmentsNow()).toEqual({ [id!]: { kind: 'wall', status: 'confirmed', by: 'human' } })
  })

  it('変形で消えた線は、動いたとは言わない。残った線は確定のまま', () => {
    useDrawing.getState().addStroke(hLine(0))
    useDrawing.getState().addStroke(hLine(300))
    const [kept] = idsOf(0)
    const [gone] = idsOf(1)
    useSemantic.getState().setKind(kept!, 'wall')
    useSemantic.getState().setKind(gone!, 'room')
    useDrawing.getState().transform((entries) => entries.slice(0, 1))
    expect(entriesNow()).toHaveLength(1)
    expect(assignmentsNow()[kept!]).toEqual({ kind: 'wall', status: 'confirmed', by: 'human' })
    expect(assignmentsNow()[gone!]).toEqual({ kind: 'room', status: 'confirmed', by: 'human' })
  })

  it('増えた線・消えた線があっても、動いた線にだけ印が付く', () => {
    useDrawing.getState().addStroke(hLine(0))
    useDrawing.getState().addStroke(hLine(300))
    const [moved] = idsOf(0)
    const [gone] = idsOf(1)
    useSemantic.getState().setKind(moved!, 'wall')
    useSemantic.getState().setKind(gone!, 'room')
    useDrawing.getState().transform((entries) => {
      const first = entries[0]!
      const movedFirst = { ...first, segments: first.segments.map((s) => ({ ...s, x2: s.x2 + 100, revision: s.revision + 1 })) }
      const added = { ...first, segments: first.segments.map((s) => ({ ...s, id: 'added-seg' })) }
      return [movedFirst, added]
    })
    expect(assignmentsNow()[moved!]?.status).toBe('needs_review')
    expect(assignmentsNow()[gone!]?.status).toBe('confirmed')
    expect('added-seg' in assignmentsNow()).toBe(false)
  })
})
