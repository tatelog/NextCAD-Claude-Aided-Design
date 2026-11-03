// P4 積算（D-02 C8、D-03 T-04・T-10、D-04 P4）。工事原価を円の整数で出す。
// 材料費 = 造作単価 × 数量、労務費 = 労務単価 × 歩掛 × 数量。直接仮設・共通仮設費・現場管理費・一般管理費は入れない（G19）。
// 出典のない単価は provisional（未確定）として、行と合計に残す（G22）。
import { z } from 'zod'

export const CATEGORIES = ['躯体', '外装', '内装', '外構'] as const
export type Category = (typeof CATEGORIES)[number]

export const PriceRowSchema = z
  .object({
    id: z.string().min(1),
    kind: z.enum(['造作', '労務']),
    category: z.enum(CATEGORIES),
    item: z.string(),
    unit: z.string(),
    unit_price: z.number().int().min(0),
    factor: z.number().positive().optional(),
    source_ref: z.string(),
    provisional: z.boolean(),
    version: z.string().min(1),
  })
  .superRefine((row, ctx) => {
    if (row.kind === '労務' && row.factor === undefined) {
      ctx.addIssue({ code: 'custom', message: '労務単価は歩掛（factor）が必要', path: ['factor'] })
    }
  })

export type PriceRow = z.infer<typeof PriceRowSchema>

export const QuantityLineSchema = z.object({
  price_id: z.string().min(1),
  quantity: z.number().positive(),
})

export type QuantityLine = z.infer<typeof QuantityLineSchema>

export interface EstimateLine {
  price_id: string
  category: Category
  yen: number
  provisional: boolean
}

export interface CategorySubtotal {
  yen: number
  provisional: boolean
}

export interface Estimate {
  total_yen: number
  provisional: boolean
  basis_version: string
  subtotals: Record<Category, CategorySubtotal>
  lines: EstimateLine[]
}

export function estimateCost(priceRows: unknown[], quantityLines: unknown[]): Estimate {
  const prices = z.array(PriceRowSchema).parse(priceRows)
  const lines = z.array(QuantityLineSchema).parse(quantityLines)

  const byId = new Map(prices.map((p) => [p.id, p]))
  const outLines: EstimateLine[] = lines.map((line) => {
    const row = byId.get(line.price_id)
    if (!row) throw new Error(`単価 ID が単価表に無い: ${line.price_id}`)
    const amount = row.kind === '造作' ? row.unit_price * line.quantity : row.unit_price * row.factor! * line.quantity
    return {
      price_id: row.id,
      category: row.category,
      yen: Math.round(amount),
      provisional: row.provisional || row.source_ref.trim() === '',
    }
  })

  const subtotals = Object.fromEntries(
    CATEGORIES.map((c) => [c, { yen: 0, provisional: false }]),
  ) as Record<Category, CategorySubtotal>
  for (const l of outLines) {
    const s = subtotals[l.category]
    s.yen += l.yen
    s.provisional = s.provisional || l.provisional
  }

  const versions = [...new Set(lines.map((l) => byId.get(l.price_id)!.version))]
  if (versions.length > 1) throw new Error('版の異なる単価を混ぜて積算できない')

  return {
    total_yen: outLines.reduce((sum, l) => sum + l.yen, 0),
    provisional: outLines.some((l) => l.provisional),
    basis_version: versions[0] ?? prices[0]?.version ?? '',
    subtotals,
    lines: outLines,
  }
}
