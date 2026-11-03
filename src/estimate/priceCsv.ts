// 利用者が置く単価表（CSV）を PriceRow の配列にする（D-02 C8、D-03 T-10、A-03 G20）。
// 置き場の決定（G72）は未決のため、ここは文字列 → PriceRow だけを担う。どこから読むかは呼び出し側が決める。
import { PriceRowSchema, type PriceRow } from './estimate'

const REQUIRED = [
  'id',
  'kind',
  'category',
  'item',
  'unit',
  'unit_price',
  'factor',
  'source_ref',
  'provisional',
  'version',
] as const

// カンマ区切りを読む（引用符・二重引用符のエスケープ・CRLF に対応）。空行は捨てる。
function splitCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else {
          quoted = false
        }
      } else {
        field += ch
      }
    } else if (ch === '"') {
      quoted = true
    } else if (ch === ',') {
      row.push(field)
      field = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else {
      field += ch
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  return rows.filter((r) => !(r.length === 1 && r[0] === ''))
}

export function parsePriceCsv(text: string): PriceRow[] {
  const rows = splitCsv(text.replace(/^﻿/, ''))
  if (rows.length === 0) throw new Error('単価 CSV が空')
  const header = rows[0]!.map((h) => h.trim())
  const missing = REQUIRED.filter((c) => !header.includes(c))
  if (missing.length > 0) throw new Error(`単価 CSV の列が足りない: ${missing.join(', ')}`)

  const at = (row: string[], name: (typeof REQUIRED)[number]) => (row[header.indexOf(name)] ?? '').trim()

  return rows.slice(1).map((row, i) => {
    const lineNo = i + 2
    const raw = {
      id: at(row, 'id'),
      kind: at(row, 'kind'),
      category: at(row, 'category'),
      item: at(row, 'item'),
      unit: at(row, 'unit'),
      unit_price: Number(at(row, 'unit_price')),
      factor: at(row, 'factor') === '' ? undefined : Number(at(row, 'factor')),
      source_ref: at(row, 'source_ref'),
      provisional: at(row, 'provisional') === 'true' ? true : at(row, 'provisional') === 'false' ? false : at(row, 'provisional'),
      version: at(row, 'version'),
    }
    const parsed = PriceRowSchema.safeParse(raw)
    if (!parsed.success) {
      const message = parsed.error.issues.map((issue) => issue.message).join('; ')
      throw new Error(`${lineNo}行目: ${message}`)
    }
    return parsed.data
  })
}
