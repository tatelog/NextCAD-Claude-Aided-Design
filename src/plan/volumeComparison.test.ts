import {expect,it} from 'vitest'
import {compareVolumePlans} from './volumePlan'
import {layoutMetrics} from './layoutQuality'
import {familyShare} from './familyShare'
import {masterOf} from './unitTypeMaster'
import candidates from './unitTypeCandidates.json'
it('同じ外形・階数で中廊下・片廊下・ツインを比較し専有面積の大きい案を推奨する',()=>{
 const volume={footprint:[{x:0,y:0},{x:26000,y:0},{x:26000,y:66500},{x:0,y:66500}],storey_count:5,storey_height:3000}
 const result=compareVolumePlans(volume,[],{layout:'ツイン',span:3000,corridor:1600,unitDepth:7400})
 expect(result.options['中廊下']).toBeDefined()
 expect(result.options['ツイン']).toBeDefined()
 expect(result.options['片廊下']).toBeDefined()
 expect(result.options['片廊下']!.source).toBe(result.options['ツイン']!.source)
 const metrics=Object.values(result.options).map(p=>layoutMetrics(p!.plans))
 const baseline=familyShare(result.options['ツイン']!.plans,masterOf(candidates))
 for(const option of Object.values(result.options))expect(familyShare(option!.plans,masterOf(candidates))).toBeGreaterThanOrEqual(baseline)
 expect(layoutMetrics(result.options[result.recommended!]!.plans).privateM2).toBe(Math.max(...metrics.map(m=>m.privateM2)))
 expect(result.options['中廊下']!.source).toBe(result.options['ツイン']!.source)
},120000)
