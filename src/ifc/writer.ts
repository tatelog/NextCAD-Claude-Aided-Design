// BIM 出力（D-02 C9、A-03 G7・G25）。ISO 10303-21（STEP の物理ファイル）を自前で書く。片道（書き出しのみ）。
// 対象: 階（IFCBUILDINGSTOREY）と壁（IFCWALL）。壁は外形の辺を中心線に、壁厚を両側へ半分ずつ取った断面の押し出し。
// 曲線: 円弧の辺は環状の断面。IFC4 は IFCTRIMMEDCURVE と IFCCOMPOSITECURVE で曲線のまま、IFC2X3 は弦の誤差以内の折れ線。単位は mm。
import { z } from 'zod'
import { extrudeVolume, type ExtrudeInput } from '../volume/extrude'
import { arcToPolyline, loopToPolygon, validateLoop, type CurveEdge } from '../volume/curvedFootprint'
import type { Point } from '../geom/viewport'

export type IfcSchema = 'IFC4' | 'IFC2X3'

export interface WriteIfcInput extends ExtrudeInput {
  schema?: IfcSchema
  /** 壁厚（mm）。中心線の両側へ半分ずつ */
  wallThicknessMm: number
  /** 曲線を含む外形（線分と円弧の閉じた列）。指定すれば footprint より優先する */
  loop?: CurveEdge[]
}

// 数値は必ず小数点を含める（IFC の REAL）
const num = (n: number) => n.toFixed(6)

// IFC の GlobalId は 22 文字。決定的に作る（同じ入力から同じファイル）
const guid = (n: number) => `G${String(n).padStart(21, '0')}`

const TWO_PI = 2 * Math.PI
const angleOf = (p: Point, c: Point) => Math.atan2(p.y - c.y, p.x - c.x)
const pointAt = (c: Point, r: number, t: number): Point => ({ x: c.x + r * Math.cos(t), y: c.y + r * Math.sin(t) })

// 円弧の ccw の範囲: 開始角 s、終了角 en（s から ccw に進む）。sense は、ccw なら .T.、cw なら .F.
function trimOf(e: Extract<CurveEdge, { kind: 'arc' }>): { s: number; en: number; sense: boolean } {
  const ta = angleOf(e.a, e.center)
  const tb = angleOf(e.b, e.center)
  let sweep = (tb - ta) % TWO_PI
  if (e.ccw && sweep <= 0) sweep += TWO_PI
  if (!e.ccw && sweep >= 0) sweep -= TWO_PI
  const s = e.ccw ? ta : tb
  return { s, en: s + Math.abs(sweep), sense: e.ccw }
}

export function writeIfc(input: WriteIfcInput): string {
  const { schema = 'IFC4', wallThicknessMm, loop, ...volumeInput } = input
  const thickness = z.number().int().positive().parse(wallThicknessMm)
  const sch = z.enum(['IFC4', 'IFC2X3']).parse(schema)
  if (loop) validateLoop(loop)
  // 面積と高さの計算は整数 mm（既存の検証）。書き出す円弧は下で小数のまま使う
  const polygon = loop ? loopToPolygon(loop, 10).map((p) => ({ x: Math.round(p.x), y: Math.round(p.y) })) : volumeInput.footprint
  const v = extrudeVolume({ ...volumeInput, footprint: polygon })
  const h = v.storey_height

  const body: string[] = []
  let n = 0
  let g = 0
  const add = (text: string): string => {
    n += 1
    body.push(`#${n}=${text};`)
    return `#${n}`
  }
  const newGuid = () => guid(++g)
  const point2 = (p: Point) => add(`IFCCARTESIANPOINT((${num(p.x)},${num(p.y)}))`)

  const unit = add('IFCSIUNIT(*,.LENGTHUNIT.,.MILLI.,.METRE.)')
  const units = add(`IFCUNITASSIGNMENT((${unit}))`)
  const origin = add(`IFCCARTESIANPOINT((${num(0)},${num(0)},${num(0)}))`)
  const axis0 = add(`IFCAXIS2PLACEMENT3D(${origin},$,$)`)
  const ctx = add(`IFCGEOMETRICREPRESENTATIONCONTEXT($,'Model',3,1.E-05,${axis0},$)`)
  const zDir = add(`IFCDIRECTION((${num(0)},${num(0)},${num(1)}))`)
  const project = add(`IFCPROJECT('${newGuid()}',$,'Project',$,$,$,$,(${ctx}),${units})`)

  const lpSite = add(`IFCLOCALPLACEMENT($,${axis0})`)
  const site = add(`IFCSITE('${newGuid()}',$,'Site',$,$,${lpSite},$,$,.ELEMENT.,$,$,$,$,$)`)
  const lpBuilding = add(`IFCLOCALPLACEMENT(${lpSite},${axis0})`)
  const building = add(`IFCBUILDING('${newGuid()}',$,'Building',$,$,${lpBuilding},$,$,.ELEMENT.,$,$,$)`)

  // 壁の断面は辺ごとに一つ（階をまたいで同じ形）
  const half = thickness / 2
  const edges: CurveEdge[] = loop ?? v.footprint.map((a, i) => ({ kind: 'line', a, b: v.footprint[(i + 1) % v.footprint.length]! }))

  const lineProfile = (e: Extract<CurveEdge, { kind: 'line' }>): string => {
    const dx = e.b.x - e.a.x
    const dy = e.b.y - e.a.y
    const len = Math.hypot(dx, dy)
    const nx = (-dy / len) * half
    const ny = (dx / len) * half
    const pts = [
      { x: e.a.x - nx, y: e.a.y - ny },
      { x: e.b.x - nx, y: e.b.y - ny },
      { x: e.b.x + nx, y: e.b.y + ny },
      { x: e.a.x + nx, y: e.a.y + ny },
      { x: e.a.x - nx, y: e.a.y - ny },
    ].map(point2)
    const poly = add(`IFCPOLYLINE((${pts.join(',')}))`)
    return add(`IFCARBITRARYCLOSEDPROFILEDEF(.AREA.,$,${poly})`)
  }

  // 円弧の辺の壁: 外側の円弧（半径 R+t/2）→ 線 → 内側の円弧を戻る（半径 R−t/2）→ 線
  const arcProfile = (e: Extract<CurveEdge, { kind: 'arc' }>): string => {
    const R = Math.hypot(e.a.x - e.center.x, e.a.y - e.center.y)
    const ro = R + half
    const ri = R - half
    const ta = angleOf(e.a, e.center)
    const tb = angleOf(e.b, e.center)
    const ao = pointAt(e.center, ro, ta)
    const bo = pointAt(e.center, ro, tb)
    const ai = pointAt(e.center, ri, ta)
    const bi = pointAt(e.center, ri, tb)
    if (schema === 'IFC2X3') {
      const outer = arcToPolyline({ kind: 'arc', a: ao, b: bo, center: e.center, ccw: e.ccw }, 10)
      const inner = arcToPolyline({ kind: 'arc', a: bi, b: ai, center: e.center, ccw: !e.ccw }, 10)
      const ring = [...outer, ...inner, outer[0]!].map(point2)
      const poly = add(`IFCPOLYLINE((${ring.join(',')}))`)
      return add(`IFCARBITRARYCLOSEDPROFILEDEF(.AREA.,$,${poly})`)
    }
    const { s, en, sense } = trimOf(e)
    const cp = point2(e.center)
    const axis2 = add(`IFCAXIS2PLACEMENT2D(${cp},$)`)
    const circleO = add(`IFCCIRCLE(${axis2},${num(ro)})`)
    const circleI = add(`IFCCIRCLE(${axis2},${num(ri)})`)
    const trimmed = (circle: string, sn: boolean) =>
      add(`IFCTRIMMEDCURVE(${circle},(IFCPARAMETERVALUE(${num(s)})),(IFCPARAMETERVALUE(${num(en)})),${sn ? '.T.' : '.F.'},.PARAMETER.)`)
    const segs = [
      add(`IFCCOMPOSITECURVESEGMENT(.CONTINUOUS.,.T.,${trimmed(circleO, sense)})`),
      add(`IFCCOMPOSITECURVESEGMENT(.CONTINUOUS.,.T.,${add(`IFCPOLYLINE((${point2(bo)},${point2(bi)}))`)})`),
      add(`IFCCOMPOSITECURVESEGMENT(.CONTINUOUS.,.T.,${trimmed(circleI, !sense)})`),
      add(`IFCCOMPOSITECURVESEGMENT(.CONTINUOUS.,.T.,${add(`IFCPOLYLINE((${point2(ai)},${point2(ao)}))`)})`),
    ]
    const composite = add(`IFCCOMPOSITECURVE((${segs.join(',')}),.F.)`)
    return add(`IFCARBITRARYCLOSEDPROFILEDEF(.AREA.,$,${composite})`)
  }

  const profiles = edges.map((e) => (e.kind === 'line' ? lineProfile(e) : arcProfile(e)))

  const storeys: string[] = []
  for (let i = 0; i < v.storey_count; i++) {
    const elevPoint = add(`IFCCARTESIANPOINT((${num(0)},${num(0)},${num(i * h)}))`)
    const elevAxis = add(`IFCAXIS2PLACEMENT3D(${elevPoint},$,$)`)
    const lpStorey = add(`IFCLOCALPLACEMENT(${lpBuilding},${elevAxis})`)
    const storey = add(`IFCBUILDINGSTOREY('${newGuid()}',$,'Storey ${i}',$,$,${lpStorey},$,$,.ELEMENT.,${num(i * h)})`)
    storeys.push(storey)

    const walls: string[] = []
    profiles.forEach((profile) => {
      const solid = add(`IFCEXTRUDEDAREASOLID(${profile},${axis0},${zDir},${num(h)})`)
      const rep = add(`IFCSHAPEREPRESENTATION(${ctx},'Body','SweptSolid',(${solid}))`)
      const pds = add(`IFCPRODUCTDEFINITIONSHAPE($,$,(${rep}))`)
      const lpWall = add(`IFCLOCALPLACEMENT(${lpStorey},${axis0})`)
      walls.push(add(`IFCWALL('${newGuid()}',$,'Wall',$,$,${lpWall},${pds},$,$)`))
    })
    add(`IFCRELCONTAINEDINSPATIALSTRUCTURE('${newGuid()}',$,$,$,(${walls.join(',')}),${storey})`)
  }

  add(`IFCRELAGGREGATES('${newGuid()}',$,$,$,${project},(${site}))`)
  add(`IFCRELAGGREGATES('${newGuid()}',$,$,$,${site},(${building}))`)
  add(`IFCRELAGGREGATES('${newGuid()}',$,$,$,${building},(${storeys.join(',')}))`)

  const header = [
    'ISO-10303-21;',
    'HEADER;',
    "FILE_DESCRIPTION(('ViewDefinition [CoordinationView]'),'2;1');",
    "FILE_NAME('model.ifc','',(''),(''),'','claude-aided-design','');",
    `FILE_SCHEMA(('${sch}'));`,
    'ENDSEC;',
    'DATA;',
  ]
  return [...header, ...body, 'ENDSEC;', 'END-ISO-10303-21;', ''].join('\n')
}
