// 仕様: BIM 出力（D-02 C9、A-03 G7・G25、D-03 T-02）。ISO 10303-21（STEP の物理ファイル）を自前で書く。
// 仕様 1（G7）: 版は IFC4 と IFC2X3 を選べる。既定は IFC4。FILE_SCHEMA にその版を書く。
// 仕様 2（C9 対象エンティティ）: 階 = IFCBUILDINGSTOREY、壁 = IFCWALL。外形の辺ごとに壁を 1 つ、階数分（基準階の複製、G30）。
// 仕様 3（C9 幾何）: 壁は断面（外形の辺を中心線に、壁厚を両側へ半分ずつ）の押し出し（IFCEXTRUDEDAREASOLID）。押し出し長は階高。
// 仕様 4（C9 単位）: 単位は mm（IFCSIUNIT の接頭辞 MILLI）。
// 仕様 5: 階の高さ（elevation）は i × 階高。
// 仕様 6: 不正な入力（階数 0 など）は弾く（extrudeVolume と同じ）。
// 仕様 7: 出力は実在の IFC パーサー（web-ifc）で開け、階と壁の数が仕様どおりに読める（開発依存として検証）。
import { describe, expect, it } from 'vitest'
import { IfcAPI, IFCBUILDINGSTOREY, IFCWALL, IFCPROJECT } from 'web-ifc'
import { writeIfc } from './writer'

const rect = [
  { x: 0, y: 0 },
  { x: 10_000, y: 0 },
  { x: 10_000, y: 20_000 },
  { x: 0, y: 20_000 },
]

const base = { footprint: rect, storey_count: 3, storey_height: 3_000 }

function countLines(text: string, pattern: RegExp): number {
  return (text.match(pattern) ?? []).length
}

describe('writeIfc', () => {
  it('ISO 10303-21 の枠になり、FILE_SCHEMA は既定で IFC4', () => {
    const text = writeIfc({ ...base, wallThicknessMm: 200 })
    expect(text.startsWith('ISO-10303-21;')).toBe(true)
    expect(text.trimEnd().endsWith('END-ISO-10303-21;')).toBe(true)
    expect(text).toContain("FILE_SCHEMA(('IFC4'));")
  })

  it('IFC2X3 を選べ、FILE_SCHEMA にその版を書く（G7）', () => {
    const text = writeIfc({ ...base, schema: 'IFC2X3', wallThicknessMm: 200 })
    expect(text).toContain("FILE_SCHEMA(('IFC2X3'));")
  })

  it('階は階数分（基準階の複製）、壁は外形の辺ごとに階数分だけ出る', () => {
    const text = writeIfc({ ...base, wallThicknessMm: 200 })
    expect(countLines(text, /=IFCBUILDINGSTOREY\(/g)).toBe(3)
    expect(countLines(text, /=IFCWALL\(/g)).toBe(4 * 3)
  })

  it('壁は押し出しの断面で、押し出し長は階高に一致する', () => {
    const text = writeIfc({ ...base, wallThicknessMm: 200 })
    const depths = [...text.matchAll(/=IFCEXTRUDEDAREASOLID\([^,]+,[^,]+,[^,]+,([0-9.E+-]+)\);/g)].map((m) => Number(m[1]))
    expect(depths).toHaveLength(12)
    expect(depths.every((d) => d === 3_000)).toBe(true)
  })

  it('単位は mm（IFCSIUNIT の接頭辞 MILLI、長さの METRE）', () => {
    const text = writeIfc({ ...base, wallThicknessMm: 200 })
    expect(text).toMatch(/IFCSIUNIT\(\*,\.LENGTHUNIT\.,\.MILLI\.,\.METRE\.\)/)
  })

  it('階の高さ（elevation）は i × 階高', () => {
    const text = writeIfc({ ...base, wallThicknessMm: 200 })
    const elevations = [...text.matchAll(/=IFCBUILDINGSTOREY\([^;]*,([0-9.E+-]+)\);/g)].map((m) => Number(m[1]))
    expect(elevations).toEqual([0, 3_000, 6_000])
  })

  it('不正な入力は弾く', () => {
    expect(() => writeIfc({ footprint: rect, storey_count: 0, storey_height: 3_000, wallThicknessMm: 200 })).toThrow()
    expect(() => writeIfc({ footprint: rect, storey_count: 2, storey_height: 3_000, wallThicknessMm: 0 })).toThrow()
  })

  it('実在の IFC パーサー（web-ifc）で開け、階・壁・プロジェクトの数が仕様どおりに読める', async () => {
    const text = writeIfc({ ...base, wallThicknessMm: 200 })
    const api = new IfcAPI()
    await api.Init()
    const modelId = api.OpenModel(new TextEncoder().encode(text))
    try {
      expect(modelId).toBeGreaterThanOrEqual(0)
      expect(api.GetLineIDsWithType(modelId, IFCPROJECT).size()).toBe(1)
      expect(api.GetLineIDsWithType(modelId, IFCBUILDINGSTOREY).size()).toBe(3)
      expect(api.GetLineIDsWithType(modelId, IFCWALL).size()).toBe(12)
    } finally {
      api.CloseModel(modelId)
    }
  })
})
