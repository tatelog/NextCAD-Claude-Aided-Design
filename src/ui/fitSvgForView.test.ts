// 仕様（統括の依頼 2026-11-06。ビューアの直し A）: ビューアの中では、図を枠の幅に合わせて縮めて見せる。zip に入れる SVG は実寸のまま。
// VF1: 図の根の幅を 100%、高さを自動にする（style で指定する。SVG の属性の height="auto" は無効）。viewBox と中身は変えない（縮めて見せる）。
// VF2: 繰り返しても同じ（二度かけても変わらない）。
import { describe, expect, it } from 'vitest'
import { fitSvgForView } from './fitSvgForView'

const SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="420mm" height="297mm" viewBox="0 0 420 297"><rect width="420" height="297"/></svg>'

describe('ビューアの図の縮め方（仕様 VF1・VF2）', () => {
  it('VF1: 根の幅を 100%、高さを自動にし、viewBox と中身は残す', () => {
    const out = fitSvgForView(SVG)
    expect(out).toContain('style="width:100%;height:auto"')
    expect(out).not.toContain('width="420mm"')
    expect(out).not.toContain('height="297mm"')
    expect(out).toContain('viewBox="0 0 420 297"')
    expect(out).toContain('<rect width="420" height="297"/>')
  })

  it('VF2: 二度かけても同じ', () => {
    expect(fitSvgForView(fitSvgForView(SVG))).toBe(fitSvgForView(SVG))
  })

  it('VF3: 線の太さ（stroke-width）は変えない', () => {
    const s = '<svg width="10mm" height="10mm" viewBox="0 0 10 10"><rect stroke-width="0.3"/></svg>'
    expect(fitSvgForView(s)).toContain('stroke-width="0.3"')
  })
})
