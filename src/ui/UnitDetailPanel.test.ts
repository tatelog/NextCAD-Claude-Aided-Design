// 仕様（ハブ A-03 G76）: 住戸の詳細は、右から出るパネルで出す。中身は寸法・隣戸・廊下側・外側・置いた什器。
// 仕様 1: 間口・奥行・専有面積（m²）を出す。
// 仕様 2: 隣戸・廊下側・外側・置いた什器を出す。無いものは「なし」。
// 仕様 3: 操作は二つ。「この住戸を直す（平面に戻る）」は押せる。「同タイプの住戸に反映」は、同じ間口・奥行の住戸があるときだけ押せる。
// 仕様 4: 区画が無い（detail が null）ときは、何も出さない。
// 仕様 5: 部屋は区画の部屋の種類を出す。配置（階）・天井高の行は出さない（統括の依頼 2026-11-06。(d)）。
// 仕様 6: バルコニー・壁と開口・PS の行は出さない（同じ依頼。未配線の表示は消す）。
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
    expect(out).toContain('間口 3,000 mm')
    expect(out).toContain('奥行 6,000 mm')
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
    expect(out).toContain('この住戸を直す（平面に戻る）')
    expect(out).toContain('同タイプの住戸に反映')
    expect(out).toMatch(/<button(?![^>]*disabled)[^>]*>同タイプの住戸に反映/)
    const none = html(DETAIL, { sameTypeIds: [] })
    expect(none).toMatch(/<button[^>]*disabled[^>]*>同タイプの住戸に反映/)
  })

  it('仕様 7（1F の名前）: 1F の共用部として使う名前を、選べる欄で出す（なし・1F の名前の 6 つ）。選ぶと、その名前を渡す', () => {
    let picked: string | null | undefined
    const out = html(DETAIL, { firstFloorName: null, onSetFirstFloorName: (n) => (picked = n) })
    expect(out).toContain('1F の共用部として使う')
    expect(out).toContain('エントランス')
    expect(out).toContain('ゴミ置場')
    expect(picked).toBeUndefined()
  })

  it('仕様 4: 区画が無いときは何も出さない', () => {
    expect(html(null)).toBe('')
  })

  it('仕様 5: 部屋は区画の部屋の種類を出す。配置（階）と天井高の行は出さない', () => {
    const out = html(DETAIL, { storeyCount: 5, ceilingMm: 2400, rooms: ['居室', '水回り'] })
    expect(out).toContain('部屋 居室、水回り')
    expect(out).not.toContain('配置（階）')
    expect(out).not.toContain('天井高')
  })

  it('仕様 6: バルコニー・壁と開口・PS の行は出さない（数が渡されても）', () => {
    const out = html(DETAIL, { balcony: { faces: ['下'], areaM2: 4.8 }, walls: 2, openings: 1, shaft: null })
    expect(out).not.toContain('バルコニー')
    expect(out).not.toContain('壁と開口')
    expect(out).not.toContain('壁 2 本')
    expect(out).not.toContain('PS:')
  })
})
it('図中寸法も本文と同じカンマ区切りで表示する',()=>{
 const out=html(DETAIL,{cell:{id:'A',x0:0,y0:0,x1:3000,y1:6000}})
 const svg=out.slice(out.indexOf('<svg'),out.indexOf('</svg>'))
 expect(svg).toContain('3,000 mm')
 expect(svg).toContain('6,000 mm')
})

it('配置の反映を拒否した理由を住戸詳細内に表示する',()=>{
 const out=html(DETAIL,{updateError:'縦シャフトの位置を維持できません'})
 expect(out).toContain('role="alert"')
 expect(out).toContain('縦シャフトの位置を維持できません')
})
