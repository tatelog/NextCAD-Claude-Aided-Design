// 仕様（統括の依頼 2026-11-06。3: ビューアにも参考値の文を出す）:
// PV1: 出典が「公図の参考値」の値は、「入れる」の文に参考値の文を添える。ほかの出典の値には添えない。
import { describe, expect, it } from 'vitest'
import { AREA_REFERENCE_NOTE } from '../law/permitFormValues'
import { actionTextOf } from './PermitFormPlanView'

describe('ビューアの参考値の文（仕様 PV1）', () => {
  it('PV1: 公図の参考値の欄は、参考値の文を添える', () => {
    expect(actionTextOf({ kind: 'fill', value: '1200.00', from: '公図の参考値' })).toContain(AREA_REFERENCE_NOTE)
  })

  it('PV1: ほかの出典の欄には、参考値の文を添えない', () => {
    expect(actionTextOf({ kind: 'fill', value: '400.00', from: 'ボリューム' })).not.toContain(AREA_REFERENCE_NOTE)
  })
})
