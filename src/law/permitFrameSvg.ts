// 図枠の SVG（t30）。permitFrame.json（用紙・余白・タイトル欄・縮尺候補）から作る。決定論。
// PDF は、この SVG をブラウザの印刷（PDF に保存）で作る。PDF のライブラリは使わない（フォントを同梱しないため）。
import frame from './permitFrame.json'

export type FrameSize = 'A1' | 'A3'
export type FrameFieldId = 'projectName' | 'drawingName' | 'scale' | 'designer' | 'date' | 'drawingNo' | 'confirmationNo'

export interface FrameFieldText {
  id: string
  label: string
  text: string
}

interface FrameJson {
  sheets: { size: string; widthMm: number; heightMm: number }[]
  marginMm: { top: number; right: number; bottom: number; left: number }
  titleBlock: {
    widthMm: number
    heightMm: number
    fields: { id: string; label: string; x: number; y: number; w: number; h: number; blank: boolean }[]
  }
  scaleCandidates: { label: string }[]
}

const f = frame as FrameJson

// XML の特殊文字を逃がす
function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export function frameSvg(input: { size: FrameSize; values: Partial<Record<FrameFieldId, string>> }): { svg: string; fields: FrameFieldText[] } {
  const sheet = f.sheets.find((s) => s.size === input.size)
  if (!sheet) throw new Error(`用紙の寸法が無い: ${input.size}`)

  const scale = input.values.scale
  if (scale !== undefined && scale !== '' && !f.scaleCandidates.some((c) => c.label === scale)) {
    throw new Error(`縮尺は候補から選ぶ: ${f.scaleCandidates.map((c) => c.label).join(' / ')}`)
  }

  const W = sheet.widthMm
  const H = sheet.heightMm
  const m = f.marginMm
  const tb = f.titleBlock
  const originX = W - m.right - tb.widthMm
  const originY = H - m.bottom - tb.heightMm

  const fields: FrameFieldText[] = tb.fields.map((field) => {
    const id = field.id as FrameFieldId
    // 確認番号欄は行政が記入するので、値を入れない
    const text = field.blank ? '' : (input.values[id] ?? '')
    return { id: field.id, label: field.label, text }
  })

  const cells = tb.fields
    .map((field, i) => {
      const f2 = fields[i]!
      const shown = f2.text === '' ? field.label : `${field.label}：${f2.text}`
      return (
        `<rect x="${field.x}" y="${field.y}" width="${field.w}" height="${field.h}" fill="none" stroke="#000" stroke-width="0.25"/>` +
        `<text x="${field.x + 1.5}" y="${field.y + field.h / 2 + 1}" font-size="3" font-family="Noto Sans JP, sans-serif" fill="#000">${esc(shown)}</text>`
      )
    })
    .join('')

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}mm" height="${H}mm" viewBox="0 0 ${W} ${H}">` +
    `<rect x="0" y="0" width="${W}" height="${H}" fill="#fff"/>` +
    `<rect x="${m.left}" y="${m.top}" width="${W - m.left - m.right}" height="${H - m.top - m.bottom}" fill="none" stroke="#000" stroke-width="0.35"/>` +
    `<g transform="translate(${originX} ${originY})">` +
    `<rect width="${tb.widthMm}" height="${tb.heightMm}" fill="none" stroke="#000" stroke-width="0.35"/>` +
    cells +
    `</g></svg>`

  return { svg, fields }
}
