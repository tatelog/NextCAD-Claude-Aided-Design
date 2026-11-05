// 仕様（統括の依頼 2026-11-06。A: /chat の 503 の直し。道具の定義を、返答の型（ChangeSchema）と一致させる）:
// 仕様 A1: 道具の changes の項目は、ChangeSchema の 6 種の操作ごとに、操作名（op）と必須の項目（名前）を宣言する。
//          宣言した項目は、その操作の項目と一致する（余りも足りないも無い）。
// 仕様 A2: 道具の定義どおりの例（各操作の必須の項目を満たす例）は、ChangeSchema を通る。
// 仕様 A3: 道具の op の列挙は、ChangeSchema の全操作と一致する（setUnitPrice・setFactor を含む）。
import { describe, expect, it } from 'vitest'
import { OPERATIONS_TOOL } from './chatRequest'
import { ChangeSchema } from './claudeReply'

type Entry = { properties: Record<string, { enum?: string[] }>; required?: string[] }

const entries = (OPERATIONS_TOOL.input_schema.properties.changes.items as { anyOf?: Entry[] }).anyOf ?? []

const opOf = (entry: Entry): string | undefined => entry.properties.op?.enum?.[0]

// 例（道具の定義の型どおり。各操作の必須の項目を満たす）
const EXAMPLES: Record<string, Record<string, unknown>> = {
  setStoreyCount: { op: 'setStoreyCount', count: 6 },
  setStoreyHeight: { op: 'setStoreyHeight', mm: 3000 },
  setKind: { op: 'setKind', segmentId: 's1', kind: 'wall' },
  setUnitPrice: { op: 'setUnitPrice', id: 'u1', unit_price: 1200 },
  setFactor: { op: 'setFactor', id: 'f1', factor: 1.1 },
  addLine: { op: 'addLine', start: { x: 0, y: 0 }, lengthMm: 1000, angleDeg: 0 },
}

describe('道具の定義と返答の型の一致（仕様 A1〜A3）', () => {
  it('仕様 A1: 6 種の操作のそれぞれに、op と必須の項目（名前）が宣言されていて、ChangeSchema の項目と一致する', () => {
    for (const option of ChangeSchema.options) {
      const op = option.shape.op.value as string
      const entry = entries.find((e) => opOf(e) === op)
      expect(entry, `操作 ${op} が道具の定義に無い`).toBeDefined()
      const want = Object.keys(option.shape).sort()
      expect(Object.keys(entry!.properties).sort(), `操作 ${op} の項目`).toEqual(want)
      expect([...(entry!.required ?? [])].sort(), `操作 ${op} の必須`).toEqual(want)
    }
  })

  it('仕様 A2: 道具の定義どおりの例は、ChangeSchema を通る', () => {
    for (const option of ChangeSchema.options) {
      const op = option.shape.op.value as string
      const example = EXAMPLES[op]
      expect(example, `操作 ${op} の例が無い`).toBeDefined()
      expect(() => ChangeSchema.parse(example)).not.toThrow()
    }
  })

  it('仕様 A3: 道具の op の列挙は、ChangeSchema の全操作と一致する', () => {
    const toolOps = entries.map((e) => opOf(e)).sort()
    const schemaOps = ChangeSchema.options.map((o) => o.shape.op.value as string).sort()
    expect(toolOps).toEqual(schemaOps)
  })
})
