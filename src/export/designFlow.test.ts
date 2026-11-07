import {it,expect} from 'vitest'
import {detailedFloorSvg,shadowSheetSvg} from './designSheets'
import {prepareVolumePlan} from '../plan/volumePlan'
import {fixturesFromPlans} from '../estimate/planFixtures'
it('自動配置の部屋・設備・開口を出力図面へ含める',()=>{const r=prepareVolumePlan({footprint:[{x:0,y:0},{x:26000,y:0},{x:26000,y:66500},{x:0,y:66500}],storey_count:1,storey_height:3000},[],{layout:'中廊下',span:3000,corridor:1600,unitDepth:6000});const svg=detailedFloorSvg(r.plans[1]!,1)!;expect(svg).toContain('data-plan-id');expect(svg).toContain('キッチン');expect(svg).toContain('洋室');const f=fixturesFromPlans(r.plans);expect(f.some(f=>f.item==='kitchen')).toBe(true);expect(f.some(f=>f.item==='toilet')).toBe(true)},60000)
it('日影出力に選択日・複数時刻・敷地を含む',()=>{const svg=shadowSheetSvg({lot:[{x:0,y:0},{x:30000,y:0},{x:30000,y:30000},{x:0,y:30000}],floors:[{footprint:[{x:10000,y:10000},{x:20000,y:10000},{x:20000,y:20000},{x:10000,y:20000}],heightMm:15000}],lat:35.67,lon:139.8,date:'2026-12-22',rotation:0})!;expect(svg).toContain('2026-12-22');expect(svg).toContain('08:00');expect(svg).toContain('16:00');expect(svg).toContain('data-role="shadow"');expect(svg).toContain('data-role="lot"')})
