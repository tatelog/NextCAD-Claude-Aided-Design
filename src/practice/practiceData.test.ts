import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { practiceCaseOfPlan, type PlanJson } from './planCase'

// 仕様（ハブ A-03 G11。統括の依頼 2026-11-04）から書いたテスト。
// - 素材は public/practice に、索引（index.json）・案の JSON（収集セッションの形のまま）・SVG・README を置く。PNG は置かない。
// - 案は 13 型（1R・1K・1DK・1LDK・2K・2DK・2LDK・3K・3DK・3LDK・4K・4DK・4LDK）× A・B・C の 39 案。
// - 練習の画面は、JSON を planCase の変換で練習の案（PracticeCase）に直して使う。その変換は、部屋の枠が外形に収まらない案を弾く。
// - SVG は外形の枠（viewBox の 0 0 間口 奥行）に切ってある。1 px = 10 mm。
// - README に、収集セッションの新規作成と、用途は練習のみ、の出典を書く。

const DIR = new URL('../../public/practice/', import.meta.url)
const read = (name: string) => readFileSync(new URL(name, DIR), 'utf8')

interface Entry {
  id: string
  svg: string
  json: string
}

const TYPES = ['1R', '1K', '1DK', '1LDK', '2K', '2DK', '2LDK', '3K', '3DK', '3LDK', '4K', '4DK', '4LDK']
const EXPECTED_IDS = TYPES.flatMap((t) => ['A', 'B', 'C'].map((k) => `${t}-${k}`))

const index = JSON.parse(read('index.json')) as Entry[]
const plans = index.map((e) => ({ entry: e, plan: JSON.parse(read(e.json)) as PlanJson }))

describe('練習の素材（public/practice）', () => {
  it('索引には 13 型 × A・B・C の 39 案がある', () => {
    expect(index.map((e) => e.id).sort()).toEqual([...EXPECTED_IDS].sort())
  })

  it('索引の各案の JSON は収集セッションの形で、id と型が一致する', () => {
    for (const { entry, plan } of plans) {
      expect(plan.id).toBe(entry.id)
      expect(plan.type).toBe(entry.id.split('-')[0])
      expect(plan.envelope.W).toBeGreaterThan(0)
      expect(plan.envelope.D).toBeGreaterThan(0)
      expect(plan.rooms.length).toBeGreaterThan(0)
    }
  })

  it('練習の画面の変換（planCase）は、どの案も通る（部屋の枠が外形の中に収まる）', () => {
    for (const { plan } of plans) {
      expect(() => practiceCaseOfPlan(plan)).not.toThrow()
    }
  })

  it('SVG は外形の枠（viewBox の 0 0 間口 奥行）に切ってあり、1 px = 10 mm', () => {
    for (const { entry, plan } of plans) {
      const svg = read(entry.svg)
      expect(svg).toContain(`viewBox="0 0 ${plan.envelope.W} ${plan.envelope.D}"`)
      expect(svg).toContain(`width="${plan.envelope.W / 10}"`)
      expect(svg).toContain(`height="${plan.envelope.D / 10}"`)
    }
  })

  it('PNG は置かない（JSON と SVG だけ）', () => {
    const files = readdirSync(DIR)
    expect(files.filter((f) => f.endsWith('.png'))).toEqual([])
  })

  it('README に出典（間取り収集セッションの新規作成）と、用途は練習のみ、を書いてある', () => {
    expect(existsSync(new URL('README.md', DIR))).toBe(true)
    const readme = read('README.md')
    expect(readme).toContain('本プロジェクトの間取り収集セッションが 2026-11-04 に新規作成')
    expect(readme).toContain('用途は練習のみ')
  })
})
