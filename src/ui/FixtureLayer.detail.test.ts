// 仕様（ハブ A-03 G76）: 図面の区画をダブルクリック（タップ 2 回）すると、その区画の住戸の詳細を出す。
// 仕様 1: 区画ごとに、住戸の詳細の押せる四角を出す。ダブルクリックで onDetail に区画の ID を渡す。
// 仕様 2: 読み取りのみ（readOnly。P4 の平面）のときは出さない。onDetail が無いときも出さない。
import { isValidElement, type ReactElement, type ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import type { Rect } from '../plan/candidateCells'
import { FixtureLayer, type FixtureLayerProps } from './FixtureLayer'

type El = ReactElement<Record<string, unknown>>

function findAll(node: ReactNode, match: (el: El) => boolean, out: El[] = []): El[] {
  if (Array.isArray(node)) node.forEach((n) => findAll(n, match, out))
  else if (isValidElement(node)) {
    const el = node as El
    if (match(el)) out.push(el)
    findAll(el.props.children as ReactNode, match, out)
  }
  return out
}

const CELLS: Rect[] = [
  { id: 'A', x0: 0, y0: 0, x1: 3000, y1: 6000 },
  { id: 'B', x0: 3000, y0: 0, x1: 6000, y1: 6000 },
]
const base: FixtureLayerProps = { cells: CELLS, fixtures: [], active: false, onTap: () => undefined, onRemove: () => undefined }
const detailRects = (props: FixtureLayerProps) => findAll(FixtureLayer(props), (el) => el.props['data-detail'] !== undefined)

describe('区画のダブルクリック（住戸の詳細。仕様 1・2）', () => {
  it('仕様 1: 区画ごとに押せる四角があり、ダブルクリックで区画の ID を渡す', () => {
    const onDetail = vi.fn()
    const rects = detailRects({ ...base, onDetail })
    expect(rects.map((r) => r.props['data-detail'])).toEqual(['A', 'B'])
    ;(rects[1]!.props.onDoubleClick as () => void)()
    expect(onDetail).toHaveBeenCalledWith('B')
  })

  it('仕様 2: 読み取りのみのときは出さない。onDetail が無いときも出さない', () => {
    expect(detailRects({ ...base, onDetail: () => undefined, readOnly: true })).toHaveLength(0)
    expect(detailRects(base)).toHaveLength(0)
  })
})
