import {it,expect} from 'vitest'
import {buildSaveData} from './saveData'
import {parseSaveData,applyLoadedProject} from './loadData'
import {useSpecSelections} from '../store/specSelections'
import {PACKAGE_VERSION} from '../estimate/specPackages'
it('案件保存・読込で部材への仕様版と出典を復元し古い案件では残さない',()=>{
 const specSelections={K1:{packageId:'PKG-026',version:PACKAGE_VERSION,assumption:'仮仕様：幅未確定の標準案'}}
 const saved=buildSaveData({projectName:'例',entries:[],storeyCount:1,storeyHeightMm:3000,savedAt:new Date(),specSelections})
 applyLoadedProject(parseSaveData(JSON.parse(JSON.stringify(saved))))
 expect(useSpecSelections.getState().selections).toEqual(specSelections)
 applyLoadedProject(parseSaveData({...saved,specSelections:undefined}))
 expect(useSpecSelections.getState().selections).toEqual({})
})
