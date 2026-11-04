// 回転（ハブ A-03 G71）: 回すと外形の座標が変わり、斜線・日影は既存の処理で計算し直される。その配線の確認。
//
// P2 の画面（P03Volume）が外形から斜線・日影を出す順 ――
//   閉じた外形 → extrudeVolume → legalBoundaries → volumeAfterSlope / cutFloors → judgeShadow ――
// を、画面を介さずに通す。
// 配線が切れていた所: extrudeVolume は整数 mm の外形しか受け付けず、画面側はその例外を握りつぶして volume を null にする
// （3D も斜線も日影も消える）。回した結果の頂点を整数 mm に丸めるのは、この配線を切らないため。
import { describe, expect, it } from 'vitest'
import { findClosedOutline } from '../canvas/closure'
import { rotateOutline } from '../canvas/outlineEdit'
import { judgeShadow } from '../law/shadowRegulation'
import { shadowRuleFor } from '../law/shadowRule'
import type { Node, Segment } from '../model/schema'
import { volumeAfterSlope } from './cutVolume'
import { extrudeVolume } from './extrude'
import { legalBoundaries } from './legalSlope'
import { cutFloors } from './slope'

// 筆界のダミー（P03Volume と同じ 20 m × 30 m）。前面道路は辺 0（下の辺）、幅員 6 m、住居系、容積率 200 %
const PARCEL = [
  { x: 0, y: 0 },
  { x: 20_000, y: 0 },
  { x: 20_000, y: 30_000 },
  { x: 0, y: 30_000 },
]
const STOREYS = { storey_count: 5, storey_height: 3_000 }

interface Entry {
  nodes: Node[]
  segments: Segment[]
}

// 10 m × 8 m の建物を、道路側に寄せて置いた輪（重心は (10000, 5000)）
const buildingEntries = (): Entry[] => {
  const pts = [
    { x: 5_000, y: 1_000 },
    { x: 15_000, y: 1_000 },
    { x: 15_000, y: 9_000 },
    { x: 5_000, y: 9_000 },
  ]
  const nodes = pts.map((p, i) => ({ id: `n${i}`, x: p.x, y: p.y }))
  const segments: Segment[] = nodes.map((a, i) => {
    const b = nodes[(i + 1) % nodes.length]!
    return {
      id: `s${i}`,
      x1: a.x,
      y1: a.y,
      x2: b.x,
      y2: b.y,
      start_node_id: a.id,
      end_node_id: b.id,
      snap: 'none',
      stage: 'F4',
      revision: 1,
      curve: 'line',
    }
  })
  return [{ nodes, segments }]
}

// P03Volume と同じ順に、外形から斜線・日影を出す
function regulate(entries: Entry[]) {
  const closure = findClosedOutline(entries.flatMap((e) => e.segments))
  if (!closure.closed) throw new Error('外形が閉じていない')
  const volume = extrudeVolume({ footprint: closure.footprint, ...STOREYS })
  const legal = legalBoundaries({ footprint: PARCEL, roadEdgeIndex: 0, roadWidthMm: 6_000, zone: '住居系', farPercent: 200 })
  const cut = volumeAfterSlope({ footprint: volume.footprint, ...STOREYS }, legal.boundaries, 20_000 * 30_000)
  const floors = cutFloors(volume.footprint, legal.boundaries, volume)
  const rule = shadowRuleFor('住居系', 2)
  if (rule === null) throw new Error('日影の規制値が無い')
  const shadow = judgeShadow({
    lot: PARCEL,
    buildings: floors.map((f, i) => ({ footprint: f, heightMm: (i + 1) * STOREYS.storey_height })).filter((b) => b.footprint.length >= 3),
    rule,
    lat: 35.67,
    lon: 139.86,
    date: new Date(Date.UTC(2026, 11, 22)),
  })
  return { cut, shadow }
}

describe('回転の配線: 回した外形が、斜線・日影の既存の処理に通る', () => {
  it.each([17, 30, 45, 90])('%i° 回した外形は、押し出しから斜線の切り取り、日影の判定まで例外なく通る', (deg) => {
    expect(() => regulate(rotateOutline(buildingEntries(), deg))).not.toThrow()
  })

  it('回すと斜線で切った後の延床面積が変わる（斜線は計算し直される）', () => {
    const before = regulate(buildingEntries()).cut.gross_floor_area_mm2
    const after = regulate(rotateOutline(buildingEntries(), 30)).cut.gross_floor_area_mm2
    expect(Number.isFinite(after)).toBe(true)
    expect(Math.abs(after - before)).toBeGreaterThan(1_000_000) // 1 m² より大きく変わる
  })

  it('回すと日影の判定の結果（最大の日影時間）も変わる（日影は計算し直される）', () => {
    const before = regulate(buildingEntries()).shadow
    const after = regulate(rotateOutline(buildingEntries(), 45)).shadow
    expect(after.maxHours).not.toBe(before.maxHours)
  })
})
