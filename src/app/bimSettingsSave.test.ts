import {describe,it,expect} from 'vitest'
import {buildSaveData} from './saveData'
import {parseSaveData,applyLoadedProject} from './loadData'
import {useBimSettings,defaultBimSettings} from '../store/bimSettings'

describe('平面の壁・開口設定を案件に保持',()=>{
 it('保存・再読込で壁厚を復元し、別の古い案件へ持ち越さない',()=>{
 const settings={...defaultBimSettings(),estimated:true,dimensions:{...defaultBimSettings().dimensions,exteriorWallMm:180}}
 const saved=buildSaveData({projectName:'確認',entries:[],storeyCount:5,storeyHeightMm:3000,savedAt:new Date(),bimSettings:settings})
 applyLoadedProject(parseSaveData(JSON.parse(JSON.stringify(saved))))
 expect(useBimSettings.getState().settings).toEqual(settings)
 const {bimSettings:_,...old}=saved;applyLoadedProject(parseSaveData(old))
 expect(useBimSettings.getState().settings).toEqual(defaultBimSettings())
 })
})

