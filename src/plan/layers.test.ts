// 仕様（ハブ D-04 共通部品「レイヤー」、A-03 G66）: 線分とオブジェクトは必ずレイヤーを持つ。意味が決まると自動でそのレイヤーに入る（手で移す操作は無い）。
// 各レイヤーに表示／非表示とロック。筆界はロック固定。寸法・日影・縦シャフトもレイヤーとして扱う。
// 仕様 1: 外形の線（F4）は「外形」。柱割り・間取りの線（F5・F9）は、意味（種類）のレイヤーに入る。種類が無い線は「その他」。
// 仕様 2: 種類と レイヤーの対応: 壁→壁、柱→柱、梁→梁、開口→開口、通り芯→通り芯、部屋→部屋、その他→その他。
// 仕様 3: 筆界はロック固定（外せない）。ほかのレイヤーは、ロックと表示を切り替えられる。既定は表示・非ロック。
// 仕様 4: レイヤーは 13 個（筆界・外形・通り芯・柱・梁・壁・開口・部屋・コア・その他・寸法・日影・縦シャフト）。
import { beforeEach, describe, expect, it } from 'vitest'
import { LAYER_NAMES, layerOfSegment, type LayerName } from './layers'
import { useLayers } from '../store/layers'

describe('線のレイヤーへの入り方（仕様 1・2）', () => {
  it('外形の線（F4）は外形のレイヤー', () => {
    expect(layerOfSegment('F4', null)).toBe('外形')
    expect(layerOfSegment('F4', 'wall')).toBe('外形')
  })

  it('柱割り・間取りの線は、種類のレイヤーに入る', () => {
    expect(layerOfSegment('F5', 'column')).toBe('柱')
    expect(layerOfSegment('F9', 'wall')).toBe('壁')
    expect(layerOfSegment('F9', 'opening')).toBe('開口')
    expect(layerOfSegment('F5', 'grid')).toBe('通り芯')
    expect(layerOfSegment('F9', 'room')).toBe('部屋')
    expect(layerOfSegment('F5', 'beam')).toBe('梁')
    expect(layerOfSegment('F9', 'other')).toBe('その他')
  })

  it('種類が無い柱割り・間取りの線は「その他」', () => {
    expect(layerOfSegment('F5', null)).toBe('その他')
    expect(layerOfSegment('F9', null)).toBe('その他')
  })
})

describe('レイヤーの一覧（仕様 4）', () => {
  it('13 個（G66 の寸法・日影・縦シャフトを含む）', () => {
    expect(LAYER_NAMES).toHaveLength(13)
    for (const name of ['筆界', '外形', '通り芯', '柱', '梁', '壁', '開口', '部屋', 'コア', 'その他', '寸法', '日影', '縦シャフト'] as LayerName[]) {
      expect(LAYER_NAMES).toContain(name)
    }
  })
})

describe('表示とロックの店舗（仕様 3）', () => {
  beforeEach(() => {
    useLayers.getState().reset()
  })

  it('既定は表示・非ロック（筆界だけはロック）', () => {
    const { visible, locked } = useLayers.getState()
    for (const name of LAYER_NAMES) expect(visible[name], name).toBe(true)
    expect(locked['筆界']).toBe(true)
    expect(locked['壁']).toBe(false)
  })

  it('筆界はロックを外せない。ほかのレイヤーは切り替えられる', () => {
    useLayers.getState().setLocked('筆界', false)
    expect(useLayers.getState().locked['筆界']).toBe(true)
    useLayers.getState().setLocked('壁', true)
    expect(useLayers.getState().locked['壁']).toBe(true)
    useLayers.getState().setVisible('壁', false)
    expect(useLayers.getState().visible['壁']).toBe(false)
    expect(useLayers.getState().visible['柱']).toBe(true)
  })
})
