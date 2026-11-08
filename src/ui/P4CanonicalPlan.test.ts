import {createElement} from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {expect,it,vi} from 'vitest'
import {generateAutoPlan} from '../plan/autoPlan'
const state=vi.hoisted(()=>({plans:{} as Record<number,unknown>,selected:2}))
vi.mock('../store/floorPlans',()=>({useFloorPlans:(f:(s:typeof state)=>unknown)=>f(state)}))
import {P4Estimate} from './P4Estimate'
it('積算は保存された選択階を描き、共通柱を省略しない',()=>{
 const p=generateAutoPlan({targetPerFloor:4,storeyCount:2,storeyHeightMm:3000,spanMm:6000,unitDepthMm:6000,corridorMm:1600,evCount:1,evStops:[1,2],layout:'中廊下'})
 p.buildingColumns=[{id:'C1',x:300,y:300},{id:'C2',x:13300,y:300}]
 state.plans={2:p}
 const html=renderToStaticMarkup(createElement(P4Estimate))
 expect(html).toContain('積算対象の詳細平面図（2階）')
 expect(html).toContain('柱位置・通り芯（計画）')
 expect(html).toContain('x="0" y="0" width="600" height="600"')
 expect(html).not.toContain('柱は概算の断面候補')
})


