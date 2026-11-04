import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { PracticeCase } from './caseTruth'

// 仕様（ハブ A-03 G11。練習の素材の置き方）から書いたテスト。
// - 素材は public/practice に、索引（index.json）・案の JSON（PracticeCase）・SVG・README を置く。
// - 公開するのは 1R〜1LDK の 12 案。2K 以上は出どころの確認が済むまで含めない。
// - 案の部屋の枠は、外形（0〜間口、0〜奥行）の中に収まる。
// - SVG は外形の枠（viewBox の 0 0 間口 奥行）に切ってある。1 px = 10 mm。

const DIR = new URL('../../public/practice/', import.meta.url)
const read = (name: string) => readFileSync(new URL(name, DIR), 'utf8')

interface Entry {
  id: string
  svg: string
  json: string
}

const index = JSON.parse(read('index.json')) as Entry[]
const cases = index.map((e) => ({ entry: e, data: JSON.parse(read(e.json)) as PracticeCase }))

describe('練習の素材（public/practice）', () => {
  it('索引には 1R〜1LDK の 12 案（各 3 案）だけがある', () => {
    expect(index.map((e) => e.id).sort()).toEqual(
      ['1DK-A', '1DK-B', '1DK-C', '1K-A', '1K-B', '1K-C', '1LDK-A', '1LDK-B', '1LDK-C', '1R-A', '1R-B', '1R-C'],
    )
  })

  it('索引の各案の JSON は PracticeCase の形で、id と型が一致し、型は 1 から始まる', () => {
    for (const { entry, data } of cases) {
      expect(data.id).toBe(entry.id)
      expect(data.type).toMatch(/^1/)
      expect(data.widthMm).toBeGreaterThan(0)
      expect(data.depthMm).toBeGreaterThan(0)
    }
  })

  it('部屋の枠は外形（0〜間口、0〜奥行）の中に収まる', () => {
    for (const { data } of cases) {
      for (const r of data.rooms) {
        expect(r.x0).toBeGreaterThanOrEqual(0)
        expect(r.y0).toBeGreaterThanOrEqual(0)
        expect(r.x1).toBeLessThanOrEqual(data.widthMm)
        expect(r.y1).toBeLessThanOrEqual(data.depthMm)
      }
    }
  })

  it('SVG は外形の枠（viewBox の 0 0 間口 奥行）に切ってある', () => {
    for (const { entry, data } of cases) {
      expect(read(entry.svg)).toContain(`viewBox="0 0 ${data.widthMm} ${data.depthMm}"`)
    }
  })

  it('README に出典（収集セッションの新規作成）と、練習に限る旨を書いてある', () => {
    const readme = read('README.md')
    expect(readme).toContain('収集セッション')
    expect(readme).toContain('練習')
  })
})
