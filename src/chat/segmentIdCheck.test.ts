// 仕様（統括の依頼 2026-11-06。2: 返事の線の id は、文脈の『選んだ線』の id だけを使う。無ければ図面を変えない）:
// 仕様 2a: 返事の線への変更（setKind）の id が、選んだ線に無い（選んでいない・存在しない）なら、それを返す。
// 仕様 2b: 選んだ線の id だけなら、何も返さない（反映してよい）。
// 仕様 2c: 線に関係しない変更（階数など）は、検査の対象外。
// 仕様 2d: 文脈に入れる『選んだ線』は、図面の順に、上限（20 本）まで。
// 仕様 2e: 道具の説明（setKind の segmentId の説明）に、『選んだ線』の id だけを使うことを書く。
import { describe, expect, it } from 'vitest'
import { OPERATIONS_TOOL } from './chatRequest'
import type { Change } from './claudeReply'
import { contextSelectedIdsOf, unknownSegmentIdsOf } from './segmentIdCheck'

const setKind = (segmentId: string): Change => ({ op: 'setKind', segmentId, kind: 'wall' })
const storeys: Change = { op: 'setStoreyCount', count: 6 }

describe('返事の線の id の検査（仕様 2a〜2c）', () => {
  it('仕様 2a: 選んだ線に無い id（選んでいない・存在しない）は返す', () => {
    expect(unknownSegmentIdsOf([setKind('selected')], ['s1'])).toEqual(['selected'])
    expect(unknownSegmentIdsOf([setKind('s1')], [])).toEqual(['s1'])
  })

  it('仕様 2b: 選んだ線の id だけなら、何も返さない', () => {
    expect(unknownSegmentIdsOf([setKind('s1')], ['s1', 's2'])).toEqual([])
  })

  it('仕様 2c: 線に関係しない変更（階数など）は、検査の対象外', () => {
    expect(unknownSegmentIdsOf([storeys], [])).toEqual([])
  })
})

describe('文脈に入れる『選んだ線』（仕様 2d）', () => {
  it('図面の順に、選んだ線だけを入れる。上限は 20 本', () => {
    const segs = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]
    expect(contextSelectedIdsOf(segs, ['c', 'a'])).toEqual(['a', 'c'])
    const many = Array.from({ length: 25 }, (_, i) => ({ id: `s${i}` }))
    expect(contextSelectedIdsOf(many, many.map((s) => s.id))).toHaveLength(20)
  })
})

describe('道具の説明（仕様 2e）', () => {
  it('segmentId の説明に、『選んだ線』の id だけを使うことを書く', () => {
    const items = OPERATIONS_TOOL.input_schema.properties.changes.items as {
      anyOf?: { properties: Record<string, { enum?: string[]; description?: string }> }[]
    }
    const entry = items.anyOf?.find((e) => e.properties.op?.enum?.includes('setKind'))
    expect(entry?.properties.segmentId?.description).toContain('選んだ線')
  })
})
