// 仕様（ハブ D-04 P3「節目（S7）は画面ではなく P3 の右側の要約」）: 節目の要約は、敷地・法規適合・階数階高・スパン・住戸数の 5 行。
// 確認申請に要る情報がここで揃う。値が無い行は「未」（ todo ）、揃っている行は「済」（ ok ）。
// 仕様 1: 行は この順で 5 つ（敷地・法規適合・階数階高・スパン・住戸数）。
// 仕様 2: 敷地は、用途地域が一つに決まっているとき済。決まっていなければ未。
// 仕様 3: 法規適合は、斜線・日影の判定が「適合」のとき済。「不適合」なら不適合。判定が無ければ未。
// 仕様 4: 階数階高は、階数が 1 以上・階高が正なら、いつも済。
// 仕様 5: スパンは、スパンの数が分かれば済。住戸数は、住戸（区画）が 1 つ以上あれば済。
import { describe, expect, it } from 'vitest'
import { milestoneSummary } from './milestone'

const base = {
  zoneKnown: true,
  shadow: '適合' as '適合' | '不適合' | null,
  storeyCount: 6,
  storeyHeightMm: 3000,
  spanCount: 4 as number | null,
  unitCount: 8,
}

describe('節目の要約（仕様 1〜5）', () => {
  it('行は、敷地・法規適合・階数階高・スパン・住戸数の順に 5 つ', () => {
    expect(milestoneSummary(base).map((r) => r.label)).toEqual(['敷地', '法規適合', '階数階高', 'スパン', '住戸数'])
  })

  it('全部揃っていれば、5 行とも済', () => {
    expect(milestoneSummary(base).every((r) => r.status === 'ok')).toBe(true)
  })

  it('敷地の用途地域が決まっていなければ未', () => {
    expect(milestoneSummary({ ...base, zoneKnown: false })[0]!.status).toBe('todo')
  })

  it('斜線・日影が不適合なら不適合、判定が無ければ未', () => {
    expect(milestoneSummary({ ...base, shadow: '不適合' })[1]).toMatchObject({ status: 'ng' })
    expect(milestoneSummary({ ...base, shadow: null })[1]!.status).toBe('todo')
  })

  it('階数階高は、いつも済（既定値がある）', () => {
    expect(milestoneSummary({ ...base, storeyCount: 1, storeyHeightMm: 2800 })[2]!.status).toBe('ok')
  })

  it('スパンの数が無ければ未、住戸が 0 なら未', () => {
    expect(milestoneSummary({ ...base, spanCount: null })[3]!.status).toBe('todo')
    expect(milestoneSummary({ ...base, unitCount: 0 })[4]!.status).toBe('todo')
  })
})
