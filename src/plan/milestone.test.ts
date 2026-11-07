import {expect,it} from 'vitest'
import {milestoneSummary} from './milestone'
const base={zoneKnown:true,shadow:'適合' as const,storeyCount:5,storeyHeightMm:3000,spanCount:0,unitCount:0}
it('日影だけでは斜線を適合にしない',()=>{const rows=milestoneSummary(base);expect(rows.find(r=>r.label==='斜線')?.status).toBe('todo');expect(rows.find(r=>r.label==='日影')?.status).toBe('ok')})
it('ゼロスパンは未作成',()=>expect(milestoneSummary(base).find(r=>r.label==='スパン')?.status).toBe('todo'))
