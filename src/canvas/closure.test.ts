// 仕様:
// - D-04 P03「次へ進む条件」: 外形が閉じた形になっている
// - D-02 C5「押し出しの入力」: 外形（閉じた Segment の列）。閉じているかだけ確かめる（G9）
// - D-02 C1「端点の共有」: 閉合の検証は端点 ID で行う
// - E-09 footprint: 建物の平面の多角形（整数 mm）
import { describe, expect, it } from 'vitest'
import type { Segment } from '../model/schema'
import { findClosedOutline } from './closure'

const seg = (id: string, a: [number, number, string], b: [number, number, string]): Segment => ({
  id,
  x1: a[0],
  y1: a[1],
  x2: b[0],
  y2: b[1],
  start_node_id: a[2],
  end_node_id: b[2],
  snap: 'none',
  stage: 'F4',
  revision: 1,
  curve: 'line',
})

describe('findClosedOutline', () => {
  it('端点 ID を共有する 4 本の線分は閉じていて、footprint は頂点を順にたどる', () => {
    const segments = [
      seg('a', [0, 0, 'n1'], [10_000, 0, 'n2']),
      seg('b', [10_000, 0, 'n2'], [10_000, 20_000, 'n3']),
      seg('c', [10_000, 20_000, 'n3'], [0, 20_000, 'n4']),
      seg('d', [0, 20_000, 'n4'], [0, 0, 'n1']),
    ]
    const r = findClosedOutline(segments)
    expect(r.closed).toBe(true)
    expect(r.footprint).toHaveLength(4)
    expect(r.footprint).toEqual([
      { x: 0, y: 0 },
      { x: 10_000, y: 0 },
      { x: 10_000, y: 20_000 },
      { x: 0, y: 20_000 },
    ])
  })

  it('線分の向きが揃っていなくても端点 ID でつながっていれば閉じている', () => {
    const segments = [
      seg('a', [0, 0, 'n1'], [10_000, 0, 'n2']),
      seg('b', [10_000, 20_000, 'n3'], [10_000, 0, 'n2']), // 逆向き
      seg('c', [10_000, 20_000, 'n3'], [0, 20_000, 'n4']),
      seg('d', [0, 0, 'n1'], [0, 20_000, 'n4']), // 逆向き
    ]
    const r = findClosedOutline(segments)
    expect(r.closed).toBe(true)
    expect(r.footprint).toHaveLength(4)
  })

  it('一辺が欠けていれば閉じていない（footprint なし、理由 open）', () => {
    const segments = [
      seg('a', [0, 0, 'n1'], [10_000, 0, 'n2']),
      seg('b', [10_000, 0, 'n2'], [10_000, 20_000, 'n3']),
      seg('c', [10_000, 20_000, 'n3'], [0, 20_000, 'n4']),
    ]
    const r = findClosedOutline(segments)
    expect(r.closed).toBe(false)
    expect(r.footprint).toBeNull()
    expect(r.reason).toBe('open')
  })

  it('座標が同じでも端点 ID が別なら閉じていない（端点の共有が条件）', () => {
    const segments = [
      seg('a', [0, 0, 'n1'], [10_000, 0, 'n2']),
      seg('b', [10_000, 0, 'n2'], [10_000, 20_000, 'n3']),
      seg('c', [10_000, 20_000, 'n3'], [0, 20_000, 'n4']),
      seg('d', [0, 20_000, 'n4'], [0, 0, 'n5']), // n1 と同じ座標だが別 ID
    ]
    expect(findClosedOutline(segments).closed).toBe(false)
  })

  it('閉路から枝が出ていれば閉じた外形とは見なさない（理由 branch）', () => {
    const segments = [
      seg('a', [0, 0, 'n1'], [10_000, 0, 'n2']),
      seg('b', [10_000, 0, 'n2'], [10_000, 20_000, 'n3']),
      seg('c', [10_000, 20_000, 'n3'], [0, 20_000, 'n4']),
      seg('d', [0, 20_000, 'n4'], [0, 0, 'n1']),
      seg('e', [10_000, 0, 'n2'], [15_000, 0, 'n6']),
    ]
    const r = findClosedOutline(segments)
    expect(r.closed).toBe(false)
    expect(r.reason).toBe('branch')
  })

  it('線分が無ければ閉じていない（理由 empty）', () => {
    const r = findClosedOutline([])
    expect(r.closed).toBe(false)
    expect(r.reason).toBe('empty')
  })
})
