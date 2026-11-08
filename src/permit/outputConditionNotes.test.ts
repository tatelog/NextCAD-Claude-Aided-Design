import {it,expect} from 'vitest'
import {outputConditionNotes,withDrawingRemarks} from './outputConditionNotes'
it('未取得をなしとせず、引継ぎ済み設備と未確認情報を備考に残す',()=>{
 const notes=outputConditionNotes({hasElevator:true,hasBuildingEquipment:true,inShadowRegulationArea:null,structuralCalc:null,hasAgent:null,bimSubmission:null,usesCertifiedParts:null},null)
 expect(notes.join(' ')).toContain('昇降機：あり')
 expect(notes.join(' ')).toContain('防火地域：未取得・未確定')
 expect(notes.join(' ')).toContain('構造計算：未確認')
})
it('備考を図面内部に収め、元の図面を保持しXMLをエスケープする',()=>{
 const svg='<svg width="420mm" height="297mm" viewBox="0 0 420 297"><path id="original" /></svg>'
 const out=withDrawingRemarks(svg,['A&B<確認>'])!
 expect(out).toContain('<path id="original" />')
 expect(out).toContain('A&amp;B&lt;確認&gt;')
 expect(out).toContain('備考')
 expect(out).toContain('viewBox="0 0 420 297"')
 expect(withDrawingRemarks(null,[])).toBeNull()
})
