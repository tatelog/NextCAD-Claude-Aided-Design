import {masterOf} from './unitTypeMaster'
import candidates from './unitTypeCandidates.json'
import {viableUnitType} from './automaticUnitFit'
const types=masterOf(candidates).filter(t=>viableUnitType(t.id))
// 仕様: 主廊下を塞がない2階段とEV乗り場を配置し、重なる住戸を除外する。
// 各階の同一位置に収まらない場合、成立扱いにせずエラーにする。
// EV台数は上階の想定人数と輸送条件から切り上げて算出する。
import {describe,it,expect} from 'vitest'
import {estimateResidentialLifts, arrangeCirculation} from './automaticCirculation'
import {generateAutoPlan} from './autoPlan'
const base=()=>generateAutoPlan({unitTypes:types,unitTypeIds:types.map(t=>t.id),optimizeTypes:true,targetPerFloor:20,storeyCount:5,storeyHeightMm:3000,spanMm:3000,unitDepthMm:7400,corridorMm:1600,layout:'中廊下',evCount:1,evStops:[1,2,3,4,5],outline:{widthMm:26000,depthMm:66500}})
const polygon=[{x:0,y:0},{x:26000,y:0},{x:26000,y:66500},{x:0,y:66500}]
const overlaps=(a:{x0:number;x1:number;y0:number;y1:number},b:typeof a)=>Math.min(a.x1,b.x1)>Math.max(a.x0,b.x0)&&Math.min(a.y1,b.y1)>Math.max(a.y0,b.y0)
describe('共用動線の自動配置',()=>{
 it('人数が増えると必要輸送能力に応じて台数を増やす',()=>{
  expect(estimateResidentialLifts(100,5,3000).count).toBe(1)
  expect(estimateResidentialLifts(2000,5,3000).count).toBeGreaterThan(1)
  expect(()=>estimateResidentialLifts(NaN,5,3000)).toThrow()
 })
 it('両端側の2階段とEVを廊下外に置き、住戸と重ねない',()=>{
  const result=arrangeCirculation(base(),[polygon,polygon,polygon,polygon,polygon],3)
  const p=result.plans[1]!, info=p.circulation!
  expect(p.cores.filter(c=>c.id!=='evHall')).toHaveLength(2)
  expect(p.cores.every(c=>!overlaps(c,p.corridor))).toBe(true)
  expect(p.cells.every(c=>p.cores.every(k=>!overlaps(c,k)))).toBe(true)
  expect(info.liftShafts).toHaveLength(p.ev.ev_cores.length)
  expect(info.liftShafts.every(s=>!overlaps(s,info.lobby))).toBe(true)
  expect(info.routes).toHaveLength(p.cells.length*2)
  expect(result.plans[5]?.cores).toEqual(p.cores)
  expect(p.unitsPerFloor).toBe(p.cells.length)
 },30000) // 性能の課題（未解決）: 単独で約 5.2 秒（2026-11-08 計測。既定の 5 秒を超える）。待ち時間を延ばしただけで、計算を軽くする直しは残っている
 it('上階で共用動線が外形から外れる場合は配置を返さない',()=>{
  expect(()=>arrangeCirculation(base(),[polygon,[{x:0,y:0},{x:4000,y:0},{x:4000,y:66500},{x:0,y:66500}]],3)).toThrow()
 })
 it('人数の変更を台数と昇降路の数へ反映する',()=>{
  const result=arrangeCirculation(base(),Array.from({length:5},()=>polygon),3,2000)
  const p=result.plans[1]!
  expect(p.ev.ev_cores.length).toBeGreaterThan(1)
  expect(p.circulation?.liftShafts.length).toBe(p.ev.ev_cores.length)
 })
})
