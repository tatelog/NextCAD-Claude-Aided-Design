import { describe, expect, it } from 'vitest'
import { frameSvg } from './permitFrameSvg'

// 仕様（t30）: permitFrame.json の用紙（A1・A3）・余白・タイトル欄から図枠を SVG にする。
// - 用紙の大きさは mm（width・height）で持ち、印刷で実寸になる（PDF はブラウザの印刷で作る）。
// - タイトル欄は用紙の余白の右下に置く（permitFrame.json と一致）。
// - 入力された値は対応する欄に入る。確認番号欄は空欄のまま（行政が記入する）。
// - 縮尺は候補（permitFrame.json の scaleCandidates）から選ぶ。候補以外は受け付けない。

const values = {
  projectName: '（仮）テスト案件',
  drawingName: '各階平面図',
  scale: '1/100',
  designer: '（仮）設計者',
  date: '2026-11-04',
  drawingNo: 'A-01',
}

describe('図枠の SVG（t30）', () => {
  it('A3 の図枠は 420×297 mm で、用紙の大きさを mm で持つ', () => {
    const { svg } = frameSvg({ size: 'A3', values })
    expect(svg).toContain('width="420mm"')
    expect(svg).toContain('height="297mm"')
    expect(svg).toContain('viewBox="0 0 420 297"')
  })

  it('A1 の図枠は 841×594 mm', () => {
    const { svg } = frameSvg({ size: 'A1', values })
    expect(svg).toContain('width="841mm"')
    expect(svg).toContain('height="594mm"')
  })

  it('タイトル欄は用紙の余白の右下に置く（A3 は 230,237 の位置）', () => {
    const { svg } = frameSvg({ size: 'A3', values })
    expect(svg).toContain('translate(230 237)')
  })

  it('タイトル欄の 7 欄すべてに、ラベルが入る', () => {
    const { fields } = frameSvg({ size: 'A3', values })
    expect(fields.map((f) => f.id)).toEqual(
      expect.arrayContaining(['projectName', 'drawingName', 'scale', 'designer', 'date', 'drawingNo', 'confirmationNo']),
    )
    expect(fields).toHaveLength(7)
  })

  it('入れた値は、対応する欄に入る（案件名・図面名・縮尺）', () => {
    const { fields } = frameSvg({ size: 'A3', values })
    expect(fields.find((f) => f.id === 'projectName')?.text).toBe(values.projectName)
    expect(fields.find((f) => f.id === 'drawingName')?.text).toBe(values.drawingName)
    expect(fields.find((f) => f.id === 'scale')?.text).toBe(values.scale)
  })

  it('確認番号欄は空欄のまま（値を入れない）', () => {
    const { fields } = frameSvg({ size: 'A3', values: { ...values, confirmationNo: 'X-999' } })
    expect(fields.find((f) => f.id === 'confirmationNo')?.text).toBe('')
  })

  it('縮尺は候補にある値だけ受け付ける（1/77 は受け付けない）', () => {
    expect(() => frameSvg({ size: 'A3', values: { ...values, scale: '1/77' } })).toThrow()
  })

  it('値の中の記号（&・<）は SVG として壊れない（エスケープする）', () => {
    const { svg } = frameSvg({ size: 'A3', values: { ...values, projectName: 'A&B <案>' } })
    expect(svg).toContain('A&amp;B &lt;案&gt;')
    expect(svg).not.toContain('A&B <案>')
  })
})
