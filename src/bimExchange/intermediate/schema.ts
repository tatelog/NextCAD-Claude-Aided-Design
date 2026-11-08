import { z } from 'zod'

const id = z.string().min(1)
const finite = z.number().finite()
export const pointSchema = z.strictObject({ x: finite, y: finite })
export const kindSchema = z.enum(['wall','column','beam','slab','opening','space','stair','balcony','other'])
export const statusSchema = z.enum(['confirmed','estimated','unresolved'])
export const sourceSchema = z.strictObject({ elementIds: z.array(id).min(1), origin: z.enum(['plan','user','estimate']), note: z.string().optional() })
export const storeySchema = z.strictObject({ id, name: id, elevationMm: finite, heightMm: finite.positive() })
export const issueSchema = z.strictObject({ code: id, severity: z.enum(['info','warning','error']), elementId: id.optional(), message: id })
export const footprintSchema = z.strictObject({ outer: z.array(pointSchema).min(3), holes: z.array(z.array(pointSchema).min(3)) })
export const geometrySchema = footprintSchema.extend({ type: z.literal('extrudedPolygon'), zMm: finite, heightMm: finite.positive() })
export const intermediateSchema = z.strictObject({
  schemaVersion: z.literal('bim-intermediate/1'), units: z.literal('mm'), coordinateSystem: z.literal('right-handed-z-up'),
  storeys: z.array(storeySchema),
  elements: z.array(z.strictObject({ id, kind: kindSchema, storeyId: id, hostElementId: id.optional(), geometry: geometrySchema.nullable(), source: sourceSchema, status: statusSchema })),
  issues: z.array(issueSchema),
})
/** 入力のXYは建物共通座標。baseOffsetMmだけ階基準の相対高さ。 */
export const snapshotSchema = z.strictObject({
  storeys: z.array(storeySchema),
  elements: z.array(z.strictObject({ id, kind: kindSchema, storeyId: id, hostElementId: id.optional(), footprint: footprintSchema.nullable(), baseOffsetMm: finite, heightMm: finite.positive().nullable(), source: sourceSchema, status: statusSchema })),
  issues: z.array(issueSchema).optional(),
})
export type Point = z.infer<typeof pointSchema>
export type Geometry = z.infer<typeof geometrySchema>
export type Issue = z.infer<typeof issueSchema>
export type IntermediateModel = z.infer<typeof intermediateSchema>
export type PlanSnapshot = z.infer<typeof snapshotSchema>
export type SnapshotElement = PlanSnapshot['elements'][number]
export const intermediateJsonSchema = z.toJSONSchema(intermediateSchema)
export const snapshotJsonSchema = z.toJSONSchema(snapshotSchema)
