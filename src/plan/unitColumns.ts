import type {UnitPlan39} from './unitPlan39'
import {doorReserve} from './furniturePlacement'
import {intersects,availableUsage} from './partitionConstraints'
/** 配置干渉確認用の仮断面。構造計算による断面確定ではない。 */
export const PLANNING_COLUMN_MM=600
const box=(c:{x:number;y:number})=>({x:c.x-300,y:c.y-300,w:600,h:600})
function blocked(p:UnitPlan39,c:{x:number;y:number}){
 const b=box(c)
 if(b.y<0)return true
 if(p.doors.some(d=>intersects(b,doorReserve(p,d,600))))return true
 if(p.fixtures.some(f=>intersects(b,f)))return true
 return p.fixtures.some(f=>{const r=p.rooms.find(r=>f.x>=r.x&&f.y>=r.y&&f.x+f.w<=r.x+r.w&&f.y+f.h<=r.y+r.h);if(!r||f.kind==='PS')return false;const others=p.fixtures.filter(g=>g.id!==f.id);return !!availableUsage(f,r,others)&&!availableUsage(f,r,[...others,b])})
}
export function columnObstructions(p:UnitPlan39){return p.columns.filter(c=>blocked(p,c)).map(c=>c.id)}
/** 住戸ごとの柱移動は禁止。既存の呼出元にも元の座標を返す。 */
export function arrangeColumns(p:UnitPlan39):UnitPlan39{return structuredClone(p)}
