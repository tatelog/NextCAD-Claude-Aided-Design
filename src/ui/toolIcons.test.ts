// 仕様: 道具のアイコン（タブレット用、SVG で描く）。ボタンの見た目は SVG のアイコンで、名前（aria-label）と一致する。
// 仕様 1: 道具の全部（直線・曲線・Undo・Redo・表示グリッド・入力スナップ・つかむ・上・左・独立・什器（G69））にアイコンの定義がある。
// 仕様 2: どのアイコンも、描く線（path）を少なくとも 1 つ持つ（空のアイコンを作らない）。
// 仕様 3: 名前の一覧は、道具の一覧と一致する（余りも不足もない）。
import { describe, expect, it } from 'vitest'
import { TOOL_ICONS, TOOL_ICON_NAMES } from './toolIcons'

describe('道具のアイコン（SVG）', () => {
  it('道具の全部にアイコンがある', () => {
    expect(TOOL_ICON_NAMES.sort()).toEqual(
      // 選択（cursor）・作図（pencil）・パン（hand）を足した（Codex の版。代表の決定 2026-11-07 で今の版を正とする）
      // Codex の版を正とする（代表の決定 2026-11-08）: サークルメニューの「立体」に box のアイコンを足した（CircleMenu.tsx）
      ['box', 'cursor', 'curve', 'fixture', 'grid', 'grip', 'hand', 'line', 'pencil', 'place-free', 'place-left', 'place-top', 'redo', 'snap', 'undo'].sort(),
    )
  })

  it('どのアイコンも線（path）を持つ', () => {
    for (const name of TOOL_ICON_NAMES) {
      expect(TOOL_ICONS[name].length).toBeGreaterThan(0)
    }
  })

  it('一覧と定義が一致する', () => {
    expect(Object.keys(TOOL_ICONS).sort()).toEqual([...TOOL_ICON_NAMES].sort())
  })
})
