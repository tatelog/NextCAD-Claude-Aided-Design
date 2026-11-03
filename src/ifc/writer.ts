// BIM 出力（D-02 C9、A-03 G7・G25）。ISO 10303-21（STEP の物理ファイル）を自前で書く。片道（書き出しのみ）。
// 対象: 階（IFCBUILDINGSTOREY）と壁（IFCWALL）。壁は外形の辺を中心線に、壁厚を両側へ半分ずつ取った断面の押し出し。
// 曲線（IFC4 の IFCINDEXEDPOLYCURVE など）は外形が点列だけの現段階では出さない。単位は mm。
import { z } from 'zod'
import { extrudeVolume, type ExtrudeInput } from '../volume/extrude'

export type IfcSchema = 'IFC4' | 'IFC2X3'

export interface WriteIfcInput extends ExtrudeInput {
  schema?: IfcSchema
  /** 壁厚（mm）。中心線の両側へ半分ずつ */
  wallThicknessMm: number
}

// 数値は必ず小数点を含める（IFC の REAL）
const num = (n: number) => n.toFixed(6)

// IFC の GlobalId は 22 文字。決定的に作る（同じ入力から同じファイル）
const guid = (n: number) => `G${String(n).padStart(21, '0')}`

export function writeIfc(input: WriteIfcInput): string {
  const { schema = 'IFC4', wallThicknessMm, ...volumeInput } = input
  const thickness = z.number().int().positive().parse(wallThicknessMm)
  const sch = z.enum(['IFC4', 'IFC2X3']).parse(schema)
  const v = extrudeVolume(volumeInput)
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

  // 壁の断面は辺ごとに一つ（階をまたいで同じ形）。中心線の両側へ壁厚の半分ずつ
  const half = thickness / 2
  const profiles = v.footprint.map((a, i) => {
    const b = v.footprint[(i + 1) % v.footprint.length]!
    const dx = b.x - a.x
    const dy = b.y - a.y
    const len = Math.hypot(dx, dy)
    const nx = (-dy / len) * half
    const ny = (dx / len) * half
    const pts = [
      { x: a.x - nx, y: a.y - ny },
      { x: b.x - nx, y: b.y - ny },
      { x: b.x + nx, y: b.y + ny },
      { x: a.x + nx, y: a.y + ny },
      { x: a.x - nx, y: a.y - ny },
    ].map((p) => add(`IFCCARTESIANPOINT((${num(p.x)},${num(p.y)}))`))
    const poly = add(`IFCPOLYLINE((${pts.join(',')}))`)
    return add(`IFCARBITRARYCLOSEDPROFILEDEF(.AREA.,$,${poly})`)
  })

  const storeys: string[] = []
  const storeyWalls: string[][] = []
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
    storeyWalls.push(walls)
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
