import {expect,it} from 'vitest'
import {prepareVolumePlan, inheritVolumePlan} from './volumePlan'
const volume={footprint:[{x:0,y:0},{x:34000,y:0},{x:34000,y:42000},{x:0,y:42000}],storey_count:5,storey_height:3000}
it('P2の共用部とシャフトを複製して引き継ぐ',()=>{const p=prepareVolumePlan(volume,[],{layout:'中廊下',span:3000,corridor:1600,unitDepth:6000});const copy=inheritVolumePlan(p,p.source);expect(copy?.[1]?.cores).toEqual(p.plans[1]?.cores);expect(copy?.[1]?.shaftRects).toEqual(p.plans[1]?.shaftRects);copy![1]!.cores[0]!.x0=999;expect(p.plans[1]!.cores[0]!.x0).not.toBe(999)})
it('外形の版が変わったら旧配置を引き継がない',()=>{const p=prepareVolumePlan(volume,[],{layout:'中廊下',span:3000,corridor:1600,unitDepth:6000});expect(inheritVolumePlan(p,'changed')).toBeNull()})
