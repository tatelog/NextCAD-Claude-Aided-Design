// 仕様: P3 の描く画面（D-04 P3、D-02 C1）。ドラッグで描いた軌跡を Stroke（px、スケール、原点）にする。
// 仕様 1: 軌跡の点（px）と、1 px あたりの mm（view_scale）と、表示の原点（view_origin）を持つ Stroke を作る（E-01）。
// 仕様 2: 段は F9（間取り）、ペンのモードは直線、入力は指・マウス・ペンのどれでもよいので mouse として記録する。
// 仕様 3: 点が 2 つ未満なら弾く（線にならない）。
// 仕様 4: 作った Stroke は StrokeSchema で検証が通る。
import { describe, expect, it } from 'vitest'
import { p3Stroke } from './p3Stroke'
import { StrokeSchema } from '../model/schema'

describe('p3Stroke（ドラッグの軌跡から Stroke）', () => {
  it('点・スケール・原点・段・モードを持つ Stroke を作る', () => {
    const s = p3Stroke({ points: [{ px: 0, py: 0 }, { px: 100, py: 0 }], viewScaleMmPerPx: 10, viewOriginPx: { px: 0, py: 0 }, id: 's1' })
    expect(s).toMatchObject({ id: 's1', stage: 'F9', pen_mode: 'line', pen_input: 'mouse', view_scale: 10 })
    expect(s.points).toHaveLength(2)
  })

  it('点が 2 つ未満なら弾く', () => {
    expect(() => p3Stroke({ points: [{ px: 0, py: 0 }], viewScaleMmPerPx: 10, viewOriginPx: { px: 0, py: 0 }, id: 's1' })).toThrow()
  })

  it('作った Stroke は StrokeSchema で検証が通る', () => {
    const s = p3Stroke({ points: [{ px: 0, py: 0 }, { px: 100, py: 0 }], viewScaleMmPerPx: 10, viewOriginPx: { px: 0, py: 0 }, id: 's1' })
    expect(() => StrokeSchema.parse(s)).not.toThrow()
  })
})
