import { describe, it, expect } from 'vitest'
import { autoPlanToSnapshot, planToIntermediate, validateIntermediate } from './index'
import { sampleFloorPlans, sampleSnapshot } from './fixtures'
import type { FloorPlansSnapshot } from './autoPlanAdapter'
import { placeUnitPlan } from '../../plan/unitPlan39'

function input():FloorPlansSnapshot {
  const v=sampleFloorPlans(), p=v.plans[2]!,u=p.unitPlanOverrides!.unit!
  u.rooms=[{id:'a',name:'室A',kind:'居室',x:0,y:0,w:3000,h:1000,area_m2:3},{id:'b',name:'室B',kind:'居室',x:0,y:1000,w:3000,h:1000,area_m2:3}]
  u.doors=[{id:'door',kind:'室内戸',width:900,position:{orientation:'h',coord:1000,start:500}}]
  u.windows=[{id:'window',room_id:'a',side:'N'}]
  v.specifications={partitionWall:{thicknessMm:100,heightMm:2600,baseOffsetMm:200,status:'estimated'},envelopeWall:{thicknessMm:200,heightMm:2600,baseOffsetMm:200,status:'estimated'},door:{heightMm:2000,baseOffsetMm:200,status:'estimated'},column:{widthMm:600,depthMm:500,heightMm:2600,baseOffsetMm:200,status:'estimated'}}
  return v
}
describe('所属壁契約',()=>{
  it('hostElementIdを保持し、存在・種別・同一階・自己参照を検証する',()=>{
    const v=sampleSnapshot()
    v.elements.push({...structuredClone(v.elements[1]!),id:'door',kind:'opening',hostElementId:'wall-2'})
    const m=planToIntermediate(v)
    expect(m.elements.at(-1)!.hostElementId).toBe('wall-2')
    for(const host of ['missing','column-2','door']) {
      const bad=structuredClone(m);bad.elements.at(-1)!.hostElementId=host
      expect(validateIntermediate(bad).some(i=>i.code==='INVALID_HOST')).toBe(true)
    }
    m.storeys.push({id:'other',name:'別階',elevationMm:6000,heightMm:3000})
    m.elements[0]!.storeyId='other'
    expect(validateIntermediate(m).some(i=>i.code==='INVALID_HOST')).toBe(true)
  })
  it('opening以外のhost指定を拒否する',()=>{
    const v=sampleSnapshot();v.elements[1]!.hostElementId='wall-2'
    expect(()=>planToIntermediate(v)).toThrow()
  })
})
describe('壁と開口の配置',()=>{
  it('共有境界の壁と扉の切欠き領域を対応し、絶対高さと元IDを保持する',()=>{
    const v=input(),before=JSON.stringify(v),m=planToIntermediate(autoPlanToSnapshot(v))
    const d=m.elements.find(e=>e.kind==='opening'&&e.source.elementIds.includes('door'))!
    const host=m.elements.find(e=>e.id===d.hostElementId)!
    expect(host.kind).toBe('wall');expect(host.source.elementIds).toEqual(expect.arrayContaining(['a','b']))
    expect(d.geometry!.zMm).toBe(3200);expect(d.geometry!.heightMm).toBe(2000)
    expect(d.geometry!.outer.map(p=>p.x).sort((a,b)=>a-b)).toEqual([950,950,1050,1050])
    expect(d.geometry!.outer.map(p=>p.y).sort((a,b)=>a-b)).toEqual([-1400,-1400,-500,-500])
    expect(d.status).toBe('estimated');expect(JSON.stringify(v)).toBe(before)
    expect(validateIntermediate(m)).toEqual([])
  })
  it('窓の図示幅を実寸と扱わず、明示寸法がある時だけ実体化する',()=>{
    const v=input()
    let m=planToIntermediate(autoPlanToSnapshot(v))
    let w=m.elements.find(e=>e.source.elementIds.includes('window'))!
    expect(w.hostElementId).toBeTruthy();expect(w.geometry).toBeNull()
    v.specifications!.openings={window:{startMm:600,widthMm:1200,heightMm:1000,baseOffsetMm:1000,status:'estimated'}}
    m=planToIntermediate(autoPlanToSnapshot(v));w=m.elements.find(e=>e.source.elementIds.includes('window'))!
    expect(w.geometry!.heightMm).toBe(1000);expect(w.geometry!.zMm).toBe(4000)
  })
  it('壁高を超える開口と境界外の扉を未解決にし、関係を捏造しない',()=>{
    const v=input();v.specifications!.door!.heightMm=4000
    let m=planToIntermediate(autoPlanToSnapshot(v))
    expect(m.elements.find(e=>e.source.elementIds.includes('door'))!.geometry).toBeNull()
    v.plans[2]!.unitPlanOverrides!.unit!.doors[0]!.position.start=2800
    m=planToIntermediate(autoPlanToSnapshot(v))
    expect(m.elements.find(e=>e.source.elementIds.includes('door'))!.hostElementId).toBeUndefined()
  })
  it('寸法不足でも扉と所属壁の関係を残す',()=>{
    const v=input();delete v.specifications
    const m=planToIntermediate(autoPlanToSnapshot(v)),d=m.elements.find(e=>e.source.elementIds.includes('door'))!
    expect(d.hostElementId).toBeTruthy();expect(d.geometry).toBeNull()
    expect(m.elements.find(e=>e.id===d.hostElementId)!.geometry).toBeNull()
  })
  it('既存描画の柱補正・回転と一致する',()=>{
    const v=input(),p=v.plans[2]!,cell=p.cells[0]!,placed=placeUnitPlan('', 'A',cell,p.corridor,p.unitPlanOverrides!.unit)
    const m=planToIntermediate(autoPlanToSnapshot(v)),c=m.elements.find(e=>e.kind==='column')!,g=c.geometry!
    expect(g.outer.reduce((s,p)=>s+p.x,0)/4).toBe(placed.columns![0]!.x)
    expect(g.outer.reduce((s,p)=>s+p.y,0)/4).toBeCloseTo(-placed.columns![0]!.y)
  })
  it('住戸の寸法不一致では配置を強行しない',()=>{
    const v=input();v.plans[2]!.cells[0]!.y1=4000
    const m=planToIntermediate(autoPlanToSnapshot(v))
    expect(m.elements.find(e=>e.kind==='column')!.geometry).toBeNull()
    expect(m.issues.some(i=>i.code==='UNIT_PLACEMENT_INVALID')).toBe(true)
  })
  it('P5の概算寸法引数を使い、柱寸法と窓実幅を補完しない',()=>{
    const v=input();delete v.specifications
    v.detailDimensions={exteriorWallMm:200,partitionWallMm:115,doorHeightMm:2100,windowHeightMm:1200,windowSillMm:900}
    const m=planToIntermediate(autoPlanToSnapshot(v)),d=m.elements.find(e=>e.source.elementIds.includes('door'))!
    expect(d.geometry!.heightMm).toBe(2100);expect(d.geometry!.zMm).toBe(3200)
    expect(m.elements.find(e=>e.id===d.hostElementId)!.geometry!.heightMm).toBe(2800)
    expect(m.elements.find(e=>e.source.elementIds.includes('window'))!.geometry).toBeNull()
    expect(m.elements.find(e=>e.kind==='column')!.geometry).toBeNull()
  })
  it.each(['right','below','above'] as const)('配置方向 %s も既存描画と一致する',(direction)=>{
    const v=input(),p=v.plans[2]!
    const c=p.cells[0]!
    if(direction==='right') {Object.assign(c,{x0:3000,x1:5000,y0:0,y1:3000});p.corridor={id:'c',x0:2000,x1:3000,y0:0,y1:3000}}
    if(direction==='below') {Object.assign(c,{x0:0,x1:3000,y0:1000,y1:3000});p.corridor={id:'c',x0:0,x1:3000,y0:0,y1:1000}}
    if(direction==='above') {Object.assign(c,{x0:0,x1:3000,y0:0,y1:2000});p.corridor={id:'c',x0:0,x1:3000,y0:2000,y1:3000}}
    const placed=placeUnitPlan('','A',c,p.corridor,p.unitPlanOverrides!.unit)
    const m=planToIntermediate(autoPlanToSnapshot(v)),g=m.elements.find(e=>e.kind==='column')!.geometry!
    expect(g.outer.reduce((s,p)=>s+p.x,0)/4).toBeCloseTo(placed.columns![0]!.x)
    expect(g.outer.reduce((s,p)=>s+p.y,0)/4).toBeCloseTo(-placed.columns![0]!.y)
  })
})
