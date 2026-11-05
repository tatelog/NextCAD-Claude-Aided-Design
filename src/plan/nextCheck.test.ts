// 仕様（統括の依頼 2026-11-05「次へを押したときに、その画面の問題を確かめる」。代表の決定 G158: 止めない、選べる）:
// 仕様 1（止めない・選べる）: 問題が無ければ「進む」。問題があれば「見直す」（一覧を出し、直すか、このまま進むかを利用者が選ぶ）。
// P2 仕様 2（外形）: 外形が閉じていなければ、外形の問題。
// P2 仕様 3（斜線）: 閉じていて斜線が超過なら、斜線の問題。判定する規則が無ければ、斜線の問題。
// P2 仕様 4（日影）: 日影が不適合なら、日影の問題。判定できない（null）なら、日影の問題（理由を添える）。
// P2 仕様 5（段状の形）: 立体にできなかった階は、階の番号と理由を一行ずつ出す。
// P2 仕様 6: 問題が無ければ、一覧は空。
// P3 仕様 7（通り）: 通りが範囲に入らない（無理）なら、通りの問題。
// P3 仕様 8（住戸数）: 住戸が 0 なら、住戸数の問題。
// P3 仕様 9（住戸の定義）: 住戸の定義が閉じない（エラー）なら、住戸の定義の問題。
// P3 仕様 10（縦シャフト）: 上下階が揃わないなら、縦シャフトの問題。
// P3 仕様 11（廊下幅）: 廊下幅が 0 以下・数でないなら、廊下幅の問題。
// P3 仕様 12（要確認）: 要確認の線や列があれば、要確認の問題。
// P4 仕様 13（単価未設定）: 単価が未設定の品目は、単価未設定の問題（品目の名前を出す）。
// P4 仕様 14（未確定）: 未確定（出典なし・仮置き）の品目は、未確定の問題（品目の名前を出す）。
import { describe, expect, it } from 'vitest'
import { nextGateOf, p2NextIssuesOf, p3NextIssuesOf, p4NextIssuesOf } from './nextCheck'

const P2_OK = { closed: true, closureText: '閉じている', slope: '適合' as const, shadow: '適合' as const, shadowText: '適合', brokenFloors: [] }
const P3_OK = { spanJudge: 'ok' as const, unitCount: 8, unitError: null, shaftAligned: true, corridorMm: 1600, reviewCount: 0, provisionalSpanCount: 0 }

describe('次へを押したときの確かめ（仕様 1）', () => {
  it('仕様 1: 問題が無ければ進む。問題があれば見直す（止めない）', () => {
    expect(nextGateOf([])).toBe('go')
    expect(nextGateOf([{ area: '外形', text: '閉じていない' }])).toBe('review')
  })
})

describe('P2 の確かめ（仕様 2〜6）', () => {
  it('仕様 2: 外形が閉じていなければ、外形の問題', () => {
    const issues = p2NextIssuesOf({ ...P2_OK, closed: false, closureText: '閉じていない（端点がつながっていない）' })
    expect(issues.map((i) => i.area)).toContain('外形')
  })

  it('仕様 3: 斜線が超過なら、斜線の問題。判定する規則が無ければ、斜線の問題', () => {
    expect(p2NextIssuesOf({ ...P2_OK, slope: '超過' }).map((i) => i.area)).toContain('斜線')
    expect(p2NextIssuesOf({ ...P2_OK, slope: null }).map((i) => i.area)).toContain('斜線')
  })

  it('仕様 4: 日影が不適合なら日影の問題。判定できない（null）なら、理由を添えて日影の問題', () => {
    const bad = p2NextIssuesOf({ ...P2_OK, shadow: '不適合', shadowText: '不適合（最大 3 h）' })
    expect(bad.find((i) => i.area === '日影')?.text).toContain('不適合')
    const none = p2NextIssuesOf({ ...P2_OK, shadow: null, shadowText: '測定面が未確定のため、日影は判定しない' })
    expect(none.find((i) => i.area === '日影')?.text).toContain('測定面')
  })

  it('仕様 5: 立体にできなかった階は、階の番号と理由を一行ずつ出す', () => {
    const issues = p2NextIssuesOf({ ...P2_OK, brokenFloors: [{ floor: 3, reason: '点が 3 つ未満' }] })
    const shape = issues.filter((i) => i.area === '段状の形')
    expect(shape).toHaveLength(1)
    expect(shape[0]!.text).toContain('3 階')
    expect(shape[0]!.text).toContain('点が 3 つ未満')
  })

  it('仕様 6: 問題が無ければ、一覧は空', () => {
    expect(p2NextIssuesOf(P2_OK)).toEqual([])
  })
})

describe('P3 の確かめ（仕様 7〜12）', () => {
  it('仕様 7: 通りが範囲に入らない（無理）なら、通りの問題', () => {
    expect(p3NextIssuesOf({ ...P3_OK, spanJudge: '無理' }).map((i) => i.area)).toContain('通り')
  })

  it('仕様 8: 住戸が 0 なら、住戸数の問題', () => {
    expect(p3NextIssuesOf({ ...P3_OK, unitCount: 0 }).map((i) => i.area)).toContain('住戸数')
  })

  it('仕様 9: 住戸の定義が閉じない（エラー）なら、住戸の定義の問題', () => {
    expect(p3NextIssuesOf({ ...P3_OK, unitError: '区画の寸法が奇数で割れない' }).map((i) => i.area)).toContain('住戸の定義')
  })

  it('仕様 10: 縦シャフトの上下階が揃わないなら、縦シャフトの問題', () => {
    expect(p3NextIssuesOf({ ...P3_OK, shaftAligned: false }).map((i) => i.area)).toContain('縦シャフト')
  })

  it('仕様 11: 廊下幅が 0 以下・数でないなら、廊下幅の問題', () => {
    expect(p3NextIssuesOf({ ...P3_OK, corridorMm: 0 }).map((i) => i.area)).toContain('廊下幅')
    expect(p3NextIssuesOf({ ...P3_OK, corridorMm: Number.NaN }).map((i) => i.area)).toContain('廊下幅')
  })

  it('仕様 12: 要確認の線や列があれば、要確認の問題', () => {
    expect(p3NextIssuesOf({ ...P3_OK, reviewCount: 2 }).map((i) => i.area)).toContain('要確認')
    expect(p3NextIssuesOf({ ...P3_OK, provisionalSpanCount: 1 }).map((i) => i.area)).toContain('要確認')
  })

  it('問題が無ければ、P3 の一覧は空', () => {
    expect(p3NextIssuesOf(P3_OK)).toEqual([])
  })
})

describe('P4 の確かめ（仕様 13・14）', () => {
  it('仕様 13: 単価が未設定の品目は、単価未設定の問題（品目の名前つき）', () => {
    const issues = p4NextIssuesOf({ laborUnset: ['型枠（床版の下面）'], provisional: [] })
    expect(issues).toEqual([{ area: '単価未設定', text: '型枠（床版の下面）' }])
  })

  it('仕様 14: 未確定（出典なし・仮置き）の品目は、未確定の問題（品目の名前つき）', () => {
    const issues = p4NextIssuesOf({ laborUnset: [], provisional: ['床版（スラブ）'] })
    expect(issues).toEqual([{ area: '未確定', text: '床版（スラブ）' }])
  })

  it('問題が無ければ、P4 の一覧は空', () => {
    expect(p4NextIssuesOf({ laborUnset: [], provisional: [] })).toEqual([])
  })
})
