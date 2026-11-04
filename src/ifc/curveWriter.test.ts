// 仕様: 曲線を含む外形の IFC 書き出し（D-02 C9、A-03 G3・G7）。
// 仕様 1（G7・IFC4）: 円弧は曲線のまま書く（IFCTRIMMEDCURVE と IFCCOMPOSITECURVE）。
// 仕様 2（G7・IFC2X3）: 円弧は弦の誤差以内の折れ線で書く（IFCTRIMMEDCURVE を使わない）。
// 仕様 3: 壁は外形の辺ごと・階数分。円弧の辺の壁は、中心線の両側へ壁厚の半分ずつの環状の断面。
// 仕様 4: 実在のパーサー（web-ifc）で開け、壁と階の数が仕様どおりに読める。
import { describe, expect, it } from 'vitest'
import { IfcAPI, IFCBUILDINGSTOREY, IFCWALL } from 'web-ifc'
import { writeIfc } from './writer'
import type { CurveEdge } from '../volume/curvedFootprint'

// 半円（直径 20 m、中心 (0,0)、上側）と直線（下側）で閉じた外形
const halfDisk: CurveEdge[] = [
  { kind: 'arc', a: { x: 10_000, y: 0 }, b: { x: -10_000, y: 0 }, center: { x: 0, y: 0 }, ccw: true },
  { kind: 'line', a: { x: -10_000, y: 0 }, b: { x: 10_000, y: 0 } },
]

async function openCount(text: string, type: number): Promise<number> {
  const api = new IfcAPI()
  await api.Init()
  const id = api.OpenModel(new TextEncoder().encode(text))
  try {
    return api.GetLineIDsWithType(id, type).size()
  } finally {
    api.CloseModel(id)
  }
}

describe('writeIfc（曲線の外形）', () => {
  it('IFC4 は円弧を IFCTRIMMEDCURVE と IFCCOMPOSITECURVE で曲線のまま書く', () => {
    const text = writeIfc({ footprint: [], loop: halfDisk, storey_count: 3, storey_height: 3_000, wallThicknessMm: 200, schema: 'IFC4' })
    expect(text).toContain('IFCTRIMMEDCURVE')
    expect(text).toContain('IFCCOMPOSITECURVE')
  })

  it('IFC2X3 は円弧を折れ線で書く（IFCTRIMMEDCURVE を使わない）', () => {
    const text = writeIfc({ footprint: [], loop: halfDisk, storey_count: 3, storey_height: 3_000, wallThicknessMm: 200, schema: 'IFC2X3' })
    expect(text).not.toContain('IFCTRIMMEDCURVE')
    expect(text).toContain('IFCPOLYLINE')
  })

  it('壁は辺ごと・階数分（半円と直線の 2 辺 × 3 階 = 6 枚）、階は 3 つ。web-ifc で開ける', async () => {
    for (const schema of ['IFC4', 'IFC2X3'] as const) {
      const text = writeIfc({ footprint: [], loop: halfDisk, storey_count: 3, storey_height: 3_000, wallThicknessMm: 200, schema })
      expect(await openCount(text, IFCWALL)).toBe(6)
      expect(await openCount(text, IFCBUILDINGSTOREY)).toBe(3)
    }
  })
})
