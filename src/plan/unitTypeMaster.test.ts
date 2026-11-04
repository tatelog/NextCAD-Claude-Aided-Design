import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { masterOf, unitTypeKind, unitTypeOptions } from './unitTypeMaster'

// 仕様（ハブ A-03 G89・G91。統括の依頼 2026-11-04、A-03 版 52。D-03 T-08 住戸タイプ）から書いたテスト。
// - 住戸タイプのマスタ（T-08）は、候補（14 型）を D-03 の列（id・name・target・room_count・room_types・min_area）に合わせて持つ。
// - 出典の無い値は「未確認」。未確認の値を持つ行は provisional（仮置きの印）を立てる。target は候補に無いので未確認。
// - P3 の住戸タイプの選択肢は、この 14 型から出す（値は id）。
// - 割付は縦割り（柱割りの列）単位。列の幅と間口が同じ型だけを割り付ける（G99。仕様は unitTypeFrontage.test.ts）。
//   縦割りの割付の旧仕様（型を順に繰り返す）は、G99 で置き換えた。

const CANDIDATES = JSON.parse(readFileSync(new URL('./unitTypeCandidates.json', import.meta.url), 'utf8'))
const master = masterOf(CANDIDATES)
const byId = (id: string) => master.find((t) => t.id === id)!

describe('住戸タイプのマスタ（T-08）', () => {
  it('14 型を、候補の順に、重複なく持つ', () => {
    expect(master.map((t) => t.id)).toEqual(CANDIDATES.types.map((t: { id: string }) => t.id))
    expect(new Set(master.map((t) => t.id)).size).toBe(14)
  })

  it('2LDK は、名前・個室数・部屋構成・最小面積（面積帯の下限）を持つ', () => {
    const t = byId('T-08-2LDK')
    expect(t.name).toBe('2LDK')
    expect(t.room_count).toBe(2)
    expect(t.room_types).toEqual(['LDK', '個室2', '洗面浴室'])
    expect(t.min_area).toBe(55)
  })

  it('面積帯が未確認の型は、最小面積を null（未確認）にする', () => {
    expect(byId('T-08-3K').min_area).toBeNull()
  })

  it('部屋構成が未確認の型は、型名から仮定した構成を持ち、仮置きの印を立てる', () => {
    const t = byId('T-08-1R')
    expect(t.room_types).toEqual(['K', '個室1'])
    expect(t.provisional).toBe(true)
    expect(t.unconfirmed).toContain('room_types')
  })

  it('target は候補に無いので、どの型も未確認（null）として印を立てる', () => {
    for (const t of master) {
      expect(t.target).toBeNull()
      expect(t.unconfirmed).toContain('target')
    }
  })

  it('出典の無い件数は null。自作案の専有面積は数（未確認なら null）', () => {
    expect(byId('T-08-1K').count_sold).toBeNull()
    expect(byId('T-08-4LDK-2').sample_area_m2).toBeNull()
    expect(byId('T-08-2LDK').sample_area_m2).toBe(62.2)
  })

  it('利用条件が未確認の候補なので、どの行も仮置きの印を持つ', () => {
    expect(master.every((t) => t.provisional)).toBe(true)
  })
})

describe('P3 の住戸タイプの選択肢', () => {
  it('14 型を、値を id、表示を型名にして出す', () => {
    const opts = unitTypeOptions(master)
    expect(opts).toHaveLength(14)
    expect(opts[0]).toEqual({ value: 'T-08-2LDK', label: '2LDK' })
  })

  it('1R・1K は単独、それ以外はファミリーとして扱う（自動作成の部屋割りに渡す区分）', () => {
    expect(unitTypeKind(byId('T-08-1R'))).toBe('単独')
    expect(unitTypeKind(byId('T-08-1K'))).toBe('単独')
    expect(unitTypeKind(byId('T-08-2LDK'))).toBe('ファミリー')
  })
})

describe('出典', () => {
  it('README に、収集セッションの作成と、実在の図面とは未照合を書いてある', () => {
    const readme = readFileSync(new URL('./unitTypeCandidates.README.md', import.meta.url), 'utf8')
    expect(readme).toContain('本プロジェクトの収集セッションが 2026-11-04 に作成')
    expect(readme).toContain('実在の図面とは未照合')
  })
})
