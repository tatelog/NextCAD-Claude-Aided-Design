// 仕様（ハブ A-03 G69、D-04 P2・P3）: 道具の「什器」は P2 ではグレーアウトにし（使えない）、P3 で使う。
// 仕様 1: 什器は P2 では使えない。
// 仕様 2: 什器は P3 で使える。
// 仕様 3: 什器を除くほかの道具は、P2 で使える（今までどおり）。
import { describe, expect, it } from 'vitest'
import { isToolEnabled } from './toolAvailability'
import { TOOL_ICON_NAMES } from './toolIcons'

describe('isToolEnabled（什器は P3 で使う）', () => {
  it('什器は P2 では使えない（グレーアウト）', () => {
    expect(isToolEnabled('fixture', 'P2')).toBe(false)
  })

  it('什器は P3 で使える', () => {
    expect(isToolEnabled('fixture', 'P3')).toBe(true)
  })

  it('什器を除くほかの道具は、P2 で使える', () => {
    const others = TOOL_ICON_NAMES.filter((name) => name !== 'fixture')
    expect(others.length).toBeGreaterThan(0)
    for (const name of others) {
      expect(isToolEnabled(name, 'P2'), name).toBe(true)
    }
  })
})
