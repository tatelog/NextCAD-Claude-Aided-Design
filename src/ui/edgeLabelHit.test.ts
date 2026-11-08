import { describe, it, expect } from 'vitest'
import { hitEdgeLabel } from './edgeLabelHit'

describe('境界番号の選択', () => {
  const labels = [{ index: 7, mid: { x: 1000, y: 2000 }, outward: { x: 0, y: 1 }, selected: false }]
  const vp = { originPx: { x: 100, y: 200 }, mmPerPx: 100 }
  it('表示位置で番号を選択する', () => {
    expect(hitEdgeLabel({ x: 110, y: 164 }, labels, vp)).toBe(7)
  })
  it('番号から離れた場所は選択しない', () => {
    expect(hitEdgeLabel({ x: 150, y: 180 }, labels, vp)).toBeNull()
  })
})
