import {it,expect} from 'vitest'
import {readUnitPlan} from './unitPlan39'
import {wetAccessIssues} from './wetAccess'
it('元案の自動配置用データは脱衣所から浴室へ直接入りトイレを経由しない',()=>{
 for(const variant of ['A','B']) expect(wetAccessIssues(readUnitPlan('1DK',variant)!)).toEqual([])
})
it('トイレ経由の浴室を拒否する',()=>{
 const p=readUnitPlan('1DK','A')!;p.doors=p.doors.filter(d=>!(d.between??[]).includes('BATH'))
 expect(wetAccessIssues(p).length).toBeGreaterThan(0)
})

it('脱衣所がない案は採用しない',()=>expect(wetAccessIssues(readUnitPlan('1DK','C')!).length).toBeGreaterThan(0))

it('浴室へ直接つながっていても脱衣所へトイレ経由しか行けない案を拒否する',()=>{
 const p=readUnitPlan('1DK','B')!
 p.doors=p.doors.filter(d=>d.id!=='WET-WASH')
 const wash=p.rooms.find(r=>r.id==='WASH')!,wc=p.rooms.find(r=>r.id==='WC')!
 p.doors.push({id:'bad-through',kind:'引戸',width:700,position:{orientation:'h',coord:wash.y,start:wc.x}})
 expect(wetAccessIssues(p).some(i=>i.code==='toilet-through')).toBe(true)
})
