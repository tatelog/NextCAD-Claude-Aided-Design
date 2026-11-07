import {expect,it} from 'vitest'
import {renderToStaticMarkup} from 'react-dom/server'
import {CirculationLayer} from './CirculationLayer'
import type {AutoPlan} from '../plan/autoPlan'
it('中廊下でも廊下の床と階段室の外枠を示す',()=>{
 const plan={layout:'中廊下',corridor:{id:'hall',x0:6000,x1:7600,y0:0,y1:30000},cores:[{id:'stairA',x0:0,x1:6000,y0:0,y1:3000}],circulation:{liftShafts:[],routes:[]}} as unknown as AutoPlan
 const html=renderToStaticMarkup(<CirculationLayer plan={plan}/>)
 expect(html).toContain('aria-label="共用廊下"')
 expect(html).toContain('aria-label="階段室1"')
 expect(html).toContain('width="6000" height="3000"')
})
