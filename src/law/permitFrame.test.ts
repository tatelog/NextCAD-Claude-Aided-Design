import { describe, expect, it } from 'vitest'
import frameJson from './permitFrame.json'

// 仕様: 図枠は用紙（A1・A3）の実寸、余白、タイトル欄（案件名・図面名・縮尺・日付・設計者・図面番号・確認番号）、縮尺候補を持つ。
// 値は出典があるか「仮置き」の印を持つ。タイトル欄は用紙の余白の内側に収まり、欄どうしは重ならない。

type Rect = { id: string; label: string; x: number; y: number; w: number; h: number; blank?: boolean }
type Frame = {
  sheets: { size: string; widthMm: number; heightMm: number; orientation: string; sourceIds: string[] }[]
  marginMm: { top: number; right: number; bottom: number; left: number; provisional: boolean }
  titleBlock: { widthMm: number; heightMm: number; provisional: boolean; fields: Rect[] }
  scaleCandidates: { label: string; denominator: number; provisional: boolean }[]
}

const frame = frameJson as Frame

describe('図枠の元データ（用紙・余白・タイトル欄・縮尺）', () => {
  it('A1 は横 841×594 mm、A3 は横 420×297 mm', () => {
    const a1 = frame.sheets.find((s) => s.size === 'A1')
    const a3 = frame.sheets.find((s) => s.size === 'A3')
    expect([a1?.widthMm, a1?.heightMm]).toEqual([841, 594])
    expect([a3?.widthMm, a3?.heightMm]).toEqual([420, 297])
    for (const s of frame.sheets) expect(s.orientation).toBe('landscape')
  })

  it('用紙寸法は出典を持ち、余白・タイトル欄・縮尺は仮置きの印を持つ', () => {
    for (const s of frame.sheets) expect(s.sourceIds.length).toBeGreaterThan(0)
    expect(frame.marginMm.provisional).toBe(true)
    expect(frame.titleBlock.provisional).toBe(true)
    for (const c of frame.scaleCandidates) expect(c.provisional).toBe(true)
  })

  it('タイトル欄は7欄（案件名・図面名・縮尺・日付・設計者・図面番号・確認番号）を持つ', () => {
    const ids = frame.titleBlock.fields.map((f) => f.id)
    expect(ids).toEqual(
      expect.arrayContaining(['projectName', 'drawingName', 'scale', 'date', 'designer', 'drawingNo', 'confirmationNo']),
    )
    expect(ids.length).toBe(7)
  })

  it('確認番号欄は空欄で、記入は確認の側が行う', () => {
    const field = frame.titleBlock.fields.find((f) => f.id === 'confirmationNo')
    expect(field?.blank).toBe(true)
  })

  it('タイトル欄の各欄は、用紙の余白の内側（右下寄せ）に収まる（A1・A3とも）', () => {
    const m = frame.marginMm
    for (const s of frame.sheets) {
      const originX = s.widthMm - m.right - frame.titleBlock.widthMm
      const originY = s.heightMm - m.bottom - frame.titleBlock.heightMm
      expect(originX).toBeGreaterThanOrEqual(m.left)
      expect(originY).toBeGreaterThanOrEqual(m.top)
      for (const f of frame.titleBlock.fields) {
        expect(f.x).toBeGreaterThanOrEqual(0)
        expect(f.y).toBeGreaterThanOrEqual(0)
        expect(f.x + f.w).toBeLessThanOrEqual(frame.titleBlock.widthMm)
        expect(f.y + f.h).toBeLessThanOrEqual(frame.titleBlock.heightMm)
      }
    }
  })

  it('タイトル欄の各欄は互いに重ならない', () => {
    const fs = frame.titleBlock.fields
    for (let i = 0; i < fs.length; i++) {
      for (let j = i + 1; j < fs.length; j++) {
        const a = fs[i]
        const b = fs[j]
        if (!a || !b) continue
        const overlap = a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h
        expect(overlap, `${a.id} と ${b.id} が重なる`).toBe(false)
      }
    }
  })

  it('縮尺の候補は分母を持つ', () => {
    expect(frame.scaleCandidates.length).toBeGreaterThan(0)
    for (const c of frame.scaleCandidates) {
      expect(c.denominator).toBeGreaterThan(0)
      expect(c.label).toBe(`1/${c.denominator}`)
    }
  })
})
