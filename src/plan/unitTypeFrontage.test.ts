// 仕様（ハブ A-03 G89・G91・G99。統括の依頼 t56 の続き、2026-11-04）:
// 仕様 1（値）: 住戸タイプの間口（frontage_mm）と奥行（depth_mm）は、自作案（public/practice）の envelope.W・envelope.D。
//   型の案の A・B・C の間口が同じならその値、違えば A の値。案の無い型（4LDK②）は null。
// 仕様 2（仮置き）: 間口と奥行は仮置き（自作案。実在の図面とは未照合）。未確認の印（unconfirmed）に間口を入れる。
// 仕様 3（候補）: 間口が未確認（null）の型は、割り付けの候補にならない。
// 仕様 4（割り付け）: 柱列の幅と間口が同じ型だけを、その列に割り付ける（間口に合わない列は候補にしない。G99）。
// 仕様 5（合う型が無い列）: 合う型が無い列は null（黙って別の型で埋めない）。
// 仕様 6（繰り返し）: 合う型が複数あれば、列ごとに順に繰り返す。
import { readFileSync, readdirSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { masterOf, unitTypeOptions } from './unitTypeMaster'
import { groupByFrontage } from './frontageBlocks'

const CANDIDATES = JSON.parse(readFileSync(new URL('./unitTypeCandidates.json', import.meta.url), 'utf8'))
const MASTER = masterOf(CANDIDATES)
const PRACTICE_DIR = new URL('../../public/practice/', import.meta.url)

// 自作案（A・B・C）の型名ごとの間口と奥行（仕様 1 の元。案の型名は、型名の丸数字を除いたもの）
function practiceSizes(): Map<string, { W: number; D: number }[]> {
  const out = new Map<string, { W: number; D: number }[]>()
  for (const f of readdirSync(PRACTICE_DIR)) {
    if (!f.endsWith('.json') || f === 'index.json') continue
    const c = JSON.parse(readFileSync(new URL(f, PRACTICE_DIR), 'utf8'))
    const list = out.get(c.type) ?? []
    list.push({ W: c.envelope.W, D: c.envelope.D })
    out.set(c.type, list)
  }
  return out
}

// 仕様 1: 案の型の間口が同じならその値、違えば A の値（A・B・C は同じ並びで読む）
const expectedSize = (typeName: string): { frontage: number; depth: number } | null => {
  if (typeName === '4LDK②') return null
  const cases = practiceSizes().get(typeName.replace(/[①②]$/, ''))
  if (!cases || cases.length === 0) return null
  const first = cases[0]!
  const sameW = cases.every((c) => c.W === first.W)
  const pick = sameW ? first : cases[0]!
  return { frontage: pick.W, depth: pick.D }
}

describe('間口と奥行の値（仕様 1・2）', () => {
  it('各型の間口と奥行は、自作案の W と D（案が無い型は null）', () => {
    for (const t of MASTER) {
      const want = expectedSize(t.name)
      expect(t.frontage_mm, t.name).toBe(want?.frontage ?? null)
      expect(t.depth_mm, t.name).toBe(want?.depth ?? null)
    }
  })

  it('間口が無い型（4LDK②）は、未確認の印に間口を入れる', () => {
    const t = MASTER.find((x) => x.name === '4LDK②')!
    expect(t.frontage_mm).toBeNull()
    expect(t.unconfirmed).toContain('frontage_mm')
    expect(t.provisional).toBe(true)
  })
})

describe('選択肢の表示（仕様 3）', () => {
  it('間口が未確認の型は、選択肢の表示に「（間口が未確認）」を付ける', () => {
    const opts = unitTypeOptions(MASTER)
    expect(opts.find((o) => o.value === 'T-08-4LDK-2')?.label).toBe('4LDK②（間口が未確認）')
    expect(opts.find((o) => o.value === 'T-08-2LDK')?.label).toBe('2LDK')
  })
})

// 割り付けの単位は「柱列をまとめた単位」（G99 の統括の補足 2026-11-04。規則の試験は frontageBlocks.test.ts）。
// ここでは、マスタの型を使ったときの割り付けを確かめる。
describe('割り付けの候補（マスタの型で。仕様 3・4）', () => {
  const grouped = (spans: number[], names: string[]) =>
    groupByFrontage(
      spans,
      names.map((n) => {
        const t = MASTER.find((x) => x.name === n)!
        return { id: t.id, frontageMm: t.frontage_mm }
      }),
    )

  it('間口が未確認の型（4LDK②）は、どの列にも入らない（割り付けなし）', () => {
    expect(grouped([10400, 6000], ['4LDK②'])).toEqual({ blocks: [], unallocated: [0, 1] })
  })

  it('列幅が間口と同じ型は、その列を 1 戸にする（1DK は 6000、2LDK は 8400）', () => {
    const g = grouped([6000, 8400], ['1DK', '2LDK'])
    expect(g.blocks).toEqual([
      { start: 0, count: 1, typeId: MASTER.find((x) => x.name === '1DK')!.id, units: 1 },
      { start: 1, count: 1, typeId: MASTER.find((x) => x.name === '2LDK')!.id, units: 1 },
    ])
  })

  it('合う型が無い列は割り付けなし（黙って別の型で埋めない）', () => {
    expect(grouped([9000], ['1DK'])).toEqual({ blocks: [], unallocated: [0] })
  })

  it('同じ入力には同じ出力', () => {
    expect(grouped([6000, 6000], ['1DK'])).toEqual(grouped([6000, 6000], ['1DK']))
  })
})
