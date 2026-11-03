// 仕様（ハブ A-03 G76）: 住戸の詳細は、右から出るパネルで出す。中身は寸法・隣戸・廊下側・外側・置いた什器。
// 仕様 1: 間口・奥行・専有面積（m²）を出す。
// 仕様 2: 隣戸・廊下側・外側・置いた什器を出す。無いものは「なし」。
// 仕様 3: 操作は二つ。「この住戸を直す（P3 に戻る）」は押せる。「同タイプの住戸に反映」は、同じ間口・奥行の住戸があるときだけ押せる。
// 仕様 4: 区画が無い（detail が null）ときは、何も出さない。
// 仕様 5: 配置（階）は、基準階と階数を出す（階数が無いときは未配線）。天井高は仮置きの値を出す。部屋は区画の部屋の種類を出す。
// 仕様 6: バルコニーと壁・開口は、まだ区画の結果に無いので「未配線」と出す。
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { UnitDetailPanel, type UnitDetailPanelProps } from './UnitDetailPanel'
import type { UnitDetail } from '../plan/unitDetail'

const DETAIL: UnitDetail = {
  id: 'A',
  frontageMm: 3000,
  depthMm: 6000,
  areaM2: 18,
  neighbors: ['B', 'C'],
  corridorSides: ['下'],
  outerSides: ['左', '上'],
  fixtures: ['キッチン'],
}

const html = (detail: UnitDetail | null, extra: Partial<UnitDetailPanelProps> = {}) =>
  renderToStaticMarkup(createElement(UnitDetailPanel, { detail, onClose: () => undefined, onApplySameType: () => undefined, sameTypeIds: ['B', 'C'], ...extra }))

describe('住戸の詳細パネル（仕様 1〜6）', () => {
  it('仕様 1: 間口・奥行・専有面積（m²）を出す', () => {
    const out = html(DETAIL)
    expect(out).toContain('住戸 A')
    expect(out).toContain('間口 3000 mm')
    expect(out).toContain('奥行 6000 mm')
    expect(out).toContain('専有面積 18.00 m²')
  })

  it('仕様 2: 隣戸・廊下側・外側・置いた什器を出す。無いものは「なし」', () => {
    const out = html(DETAIL)
    expect(out).toContain('隣戸 B、C')
    expect(out).toContain('廊下側 下')
    expect(out).toContain('外側 左、上')
    expect(out).toContain('置いた什器 キッチン')
    const bare = html({ ...DETAIL, neighbors: [], corridorSides: [], outerSides: [], fixtures: [] })
    expect(bare).toContain('隣戸 なし')
    expect(bare).toContain('廊下側 なし')
    expect(bare).toContain('外側 なし')
    expect(bare).toContain('置いた什器 なし')
  })

  it('仕様 3: 「この住戸を直す」は押せ、「同タイプの住戸に反映」は同タイプが有るときだけ押せる', () => {
    const out = html(DETAIL)
    expect(out).toContain('この住戸を直す（P3 に戻る）')
    expect(out).toContain('同タイプの住戸に反映')
    expect(out).toMatch(/<button(?![^>]*disabled)[^>]*>同タイプの住戸に反映/)
    const none = html(DETAIL, { sameTypeIds: [] })
    expect(none).toMatch(/<button[^>]*disabled[^>]*>同タイプの住戸に反映/)
  })

  it('仕様 4: 区画が無いときは何も出さない', () => {
    expect(html(null)).toBe('')
  })

  it('仕様 5: 配置（階）は基準階と階数、天井高は仮置き、部屋は種類を出す。階数が無ければ未配線', () => {
    const out = html(DETAIL, { storeyCount: 5, ceilingMm: 2400, rooms: ['居室', '水回り'] })
    expect(out).toContain('配置（階）: 基準階（5 階に複製）')
    expect(out).toContain('天井高 2400 mm（仮置き）')
    expect(out).toContain('部屋 居室、水回り')
    expect(html(DETAIL)).toContain('配置（階）: 未配線')
  })

  it('仕様 6: バルコニーは未配線と出す。壁と開口は、数が渡されたときは描いた線の数を出し、無いときは未配線', () => {
    const out = html(DETAIL)
    expect(out).toContain('バルコニー: 未配線')
    expect(out).toContain('壁と開口: 未配線')
    expect(html(DETAIL, { walls: 2, openings: 1 })).toContain('壁 2 本・開口 1 箇所（描いた線から）')
  })
})
