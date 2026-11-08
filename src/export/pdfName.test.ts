import {it,expect} from 'vitest'
import {pdfBaseName} from './pdfName'
it('日本時間の日付と案件名を保存名にする',()=>{
 expect(pdfBaseName('新砂計画',new Date('2026-11-07T16:00:00Z'))).toBe('20261108_新砂計画')
 expect(pdfBaseName('A/B:計画',new Date('2026-11-07T16:00:00Z'))).toBe('20261108_A_B_計画')
 expect(pdfBaseName('',new Date('2026-11-07T16:00:00Z'))).toBe('20261108_名称未設定')
})
