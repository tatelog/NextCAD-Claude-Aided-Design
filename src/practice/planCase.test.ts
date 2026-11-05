import { describe, expect, it } from 'vitest'
import { practiceCaseOfPlan, type PlanJson } from './planCase'

// 仕様（ハブ A-03 G11。収集セッションの案の JSON を、練習の案に直す）から書いたテスト。
// - 間口（envelope.W）と奥行（envelope.D）を、案の間口と奥行（mm）にする。
// - 部屋の枠は、左上 (x, y) と右下 (x + w, y + h) で表す（mm、外形の左上が原点）。
// - 部屋の種類（kind）は、案にあるものだけ引き継ぐ。
// - 案の id と型は、そのまま引き継ぐ。
// - 部屋の枠が間口・奥行の外に出る案は、変換で弾く（正解の線が画面の外に出るため）。

// 1R-A の部屋（収集セッションの報告の例。寸法は mm）
const plan: PlanJson = {
  id: '1R-A',
  type: '1R',
  envelope: { W: 4200, D: 6000, balcony_depth: 1500 },
  rooms: [
    { id: 'ENT', kind: '玄関', x: 0, y: 0, w: 1600, h: 1800 },
    { id: 'BR1', kind: '居室', x: 1600, y: 0, w: 2600, h: 6000 },
    { id: 'WASH', kind: '水回り', x: 0, y: 1800, w: 1600, h: 1200 },
  ],
}

describe('案の JSON から練習の案へ', () => {
  it('間口と奥行を、案の間口と奥行（mm）にする', () => {
    const c = practiceCaseOfPlan(plan)
    expect(c.widthMm).toBe(4200)
    expect(c.depthMm).toBe(6000)
  })

  it('部屋の枠は、左上と右下（x + w, y + h）で表す', () => {
    const c = practiceCaseOfPlan(plan)
    expect(c.rooms[1]).toEqual({ x0: 1600, y0: 0, x1: 4200, y1: 6000, kind: '居室' })
  })

  it('部屋の種類は案にあるものだけ引き継ぎ、無いものには付けない', () => {
    const noKind: PlanJson = { ...plan, rooms: [{ id: 'X', x: 0, y: 0, w: 1000, h: 1000 }] }
    const c = practiceCaseOfPlan(noKind)
    expect(c.rooms[0]).toEqual({ x0: 0, y0: 0, x1: 1000, y1: 1000 })
    expect('kind' in c.rooms[0]!).toBe(false)
  })

  it('案の id と型は、そのまま引き継ぐ', () => {
    const c = practiceCaseOfPlan(plan)
    expect(c.id).toBe('1R-A')
    expect(c.type).toBe('1R')
  })

  it('部屋の枠が間口の外に出る案は、変換で弾く', () => {
    const outside: PlanJson = { ...plan, rooms: [{ id: 'X', kind: '居室', x: 3000, y: 0, w: 2000, h: 1000 }] }
    expect(() => practiceCaseOfPlan(outside)).toThrow()
  })

  it('部屋の枠が奥行の外に出る案は、変換で弾く', () => {
    const outside: PlanJson = { ...plan, rooms: [{ id: 'X', kind: '居室', x: 0, y: 5000, w: 1000, h: 2000 }] }
    expect(() => practiceCaseOfPlan(outside)).toThrow()
  })
})
