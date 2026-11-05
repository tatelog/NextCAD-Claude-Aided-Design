// 仕様（ハブ A-03 G28。出典: 建築基準法施行令 第107条（耐火性能に関する技術的基準。e-Gov 325CO0000000338、2026-11-04 に表を確認。表は WebFetch の要約））:
// 部材の耐火時間は、最上階からの階数の区分（1: 最上階〜4 階以内、2: 5〜9、3: 10〜14、4: 15〜19、5: 20 以上）で決まる。建物の必要時間は、最も厳しい階（地上の最下階）の区分で決める。
// 仕様 1: 階数の区分: 1〜4 は区分 1、5〜9 は区分 2、10〜14 は区分 3、15〜19 は区分 4、20 以上は区分 5。
// 仕様 2: 必要時間（分）: 柱・はりは 60・90・120・150・180。床・間仕切壁（耐力壁）・外壁（耐力壁）は 60・90・120・120・120。屋根・階段は 30（全区分）。
// 仕様 3: 部材の入力（分）が必要時間以上なら適合、未満なら不適合、入力が無ければ判定不能。
// 仕様 4: 同じ入力には同じ出力。
import { describe, expect, it } from 'vitest'
import { judgeComponent, requiredMinutes, storeyClass } from './structureFire'

describe('第 107 条の耐火時間（仕様 1〜4）', () => {
  it('仕様 1: 階数の区分', () => {
    expect([1, 4, 5, 9, 10, 14, 15, 19, 20, 25].map(storeyClass)).toEqual([1, 1, 2, 2, 3, 3, 4, 4, 5, 5])
  })

  it('仕様 2: 必要時間（分）。柱・はりは区分ごとに上がり、床・壁は区分 4 で頭打ち、屋根・階段は 30 分', () => {
    expect(requiredMinutes('柱', 3)).toBe(60)
    expect(requiredMinutes('柱', 6)).toBe(90)
    expect(requiredMinutes('柱', 25)).toBe(180)
    expect(requiredMinutes('床', 6)).toBe(90)
    expect(requiredMinutes('床', 12)).toBe(120)
    expect(requiredMinutes('外壁', 25)).toBe(120)
    expect(requiredMinutes('屋根', 25)).toBe(30)
    expect(requiredMinutes('階段', 3)).toBe(30)
  })

  it('仕様 3: 入力が必要時間以上なら適合、未満なら不適合、無ければ判定不能', () => {
    expect(judgeComponent('柱', 3, 60)).toBe('適合')
    expect(judgeComponent('柱', 3, 30)).toBe('不適合')
    expect(judgeComponent('柱', 3, null)).toBe('判定不能')
  })

  it('仕様 4: 同じ入力には同じ出力', () => {
    expect(judgeComponent('床', 6, 90)).toBe(judgeComponent('床', 6, 90))
  })
})
