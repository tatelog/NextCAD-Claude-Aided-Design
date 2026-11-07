import {describe,it,expect,beforeEach} from 'vitest'
import {useConfirmedSite,type ConfirmedSite} from './confirmedSite'
import {parseSaveData} from '../app/loadData'
import {buildSaveData} from '../app/saveData'
const site:ConfirmedSite={parcelUid:'synthetic',lot:[{x:0,y:0},{x:10000,y:0},{x:10000,y:10000}],frame:null,center:{lat:35,lon:139},roadEdge:0,roadWidthMm:0,roadSource:'数値指定',roadLinks:[{edgeIndex:0,edgeLengthMm:10000,status:'none',candidates:[],adoptedWidthMm:null},{edgeIndex:1,edgeLengthMm:10000,status:'none',candidates:[],adoptedWidthMm:null}]}
beforeEach(()=>useConfirmedSite.setState({confirmed:null,roadWidth:'6000',roadEdge:0}))
describe('辺ごとの道路情報の引継ぎ',()=>{
 it('新しい筆の不明幅員に前の6mを流用しない',()=>{useConfirmedSite.getState().confirm(site);expect(useConfirmedSite.getState().roadWidth).toBe('')})
 it('採用幅員を辺ごとに保存し、別辺へ流用しない',()=>{
  const s=useConfirmedSite.getState();s.confirm(site);s.setRoadWidth('8000');s.setRoadSource('資料指定');s.setRoadEdge(1)
  expect(useConfirmedSite.getState().roadWidth).toBe('')
  s.setRoadWidth('4000');s.setRoadEdge(0)
  expect(useConfirmedSite.getState().roadWidth).toBe('8000')
  expect(useConfirmedSite.getState().roadSource).toBe('資料指定')
 })
 it('保存・読込で各辺の候補と採用値を保持する',()=>{
  const saved=buildSaveData({projectName:'test',entries:[],storeyCount:5,storeyHeightMm:3000,savedAt:new Date(),confirmedSite:site})
  expect(parseSaveData(JSON.parse(JSON.stringify(saved))).confirmedSite?.roadLinks).toEqual(site.roadLinks)
 })
})
