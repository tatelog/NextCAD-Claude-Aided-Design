import {z} from 'zod'
import {unitPlanSchema} from '../plan/unitPlan39'
import type {AutoPlan} from '../plan/autoPlan'
const n=z.number().finite(),s=z.string(),point=z.object({x:n,y:n})
const rect=z.object({id:s,x0:n,y0:n,x1:n,y1:n}).passthrough()
// 保存時に平面を落とすと部材IDの関連が失われるため、仕様と同じ案件に保存する。
const plan=z.object({widthMm:n.positive(),depthMm:n.positive(),spans:n,unitsPerFloor:n,shortfall:n,
 unitType:z.enum(['ファミリー','単独']),layout:s,stairFinish:s.nullable(),shafts:z.object({ps:n,eps:n,ds:n}),
 ev:z.object({storey_count:n,storey_height:n,total_height:n,storeys:z.array(z.object({storey:n,shaft:z.boolean(),ev_stop:z.boolean(),hall:z.boolean(),z_from_mm:n,z_to_mm:n})),cores:z.array(z.unknown()).optional()}).passthrough(),
 corridor:rect,cells:z.array(rect),rooms:z.array(rect.extend({kind:s,name:s.optional()})),cores:z.array(rect.extend({id:z.enum(['stairA','stairB','evHall']),evCount:n.optional()})),shaftRects:z.array(rect.extend({kind:s})),spanTypes:z.array(s.nullable()),unsupportedSpans:z.array(n),provisionalSpans:z.array(n),absorbedSpans:z.array(n),
 unitTypeIdsByCell:z.record(s,s.nullable()).optional(),unitPlanVariants:z.record(s,s).optional(),unitPlanOverrides:z.record(s,unitPlanSchema).optional(),
 corridors:z.array(rect).optional(),bridges:z.array(rect).optional(),voids:z.array(rect).optional(),buildingOutline:z.array(point).optional(),balconies:z.array(rect).optional(),
}).passthrough()
export const SavedFloorPlansSchema=z.record(z.string().regex(/^[1-9]\d*$/),plan).transform(v=>v as unknown as Record<number,AutoPlan>)
