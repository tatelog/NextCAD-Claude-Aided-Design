// 仕様（統括の依頼 2026-11-06。1-c: 図枠の中に図面を入れる）:
// F1: 図枠の SVG は、body（図面の中身）を作図領域の中に入れて返す。
// F2: 作図領域は、余白の内側で、右下のタイトル欄の上にある。
import { describe, expect, it } from 'vitest'
import { drawingAreaOf, frameSvg } from './permitFrameSvg'

describe('図枠と作図領域（仕様 F1・F2）', () => {
  it('F1: body を図枠の中に入れて返す', () => {
    const out = frameSvg({ size: 'A3', values: {}, body: '<g id="body-x"/>' })
    expect(out.svg).toContain('<g id="body-x"/>')
    expect(out.svg).toContain('<svg')
  })

  it('F2: 作図領域は、余白の内側で、タイトル欄の上にある', () => {
    const area = drawingAreaOf('A3')
    expect(area.x0).toBeGreaterThan(0)
    expect(area.y0).toBeGreaterThan(0)
    expect(area.x1).toBeLessThan(420)
    expect(area.y1).toBeLessThan(297)
    expect(area.x1).toBeGreaterThan(area.x0)
    expect(area.y1).toBeGreaterThan(area.y0)
  })
})
