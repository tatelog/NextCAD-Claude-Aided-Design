// 左の一覧の件数を、オブジェクト表（T-02）の行から数える（ハブ A-03 G78）。別の集計表は作らない。決定論。
// 表の行を、件数の入力（種類ごとの配列）に並べ直す。配列の要素は表の行そのもの（件数にしか使わない）。
// 詳細（中身）は、結果の形（objectSourcesOfPlan）から出す。ここは件数だけ。
import { FIXTURE_ATTRIBUTE, FIXTURE_KIND } from './fixtures'
import type { ObjectSources } from './objectMenu'
import type { ObjectRow } from './objectTable'

const SHAFT_ATTRS = ['PS', 'EPS', 'DS']

/** オブジェクト表の行を、左の一覧の件数の入力にする。件数は表の行の数（住戸はグループの行、通り芯は通り芯の行） */
export function sourcesOfTable(rows: readonly ObjectRow[]): ObjectSources {
  const other = (attr: string) => rows.filter((r) => r.kind === 'other' && r.attr === attr)
  return {
    columns:rows.filter(r=>r.kind==='column'),
    siteBoundaries: other('筆界'),
    outlines: other('外形'),
    gridLines: rows.filter((r) => r.kind === 'grid'),
    cores: other('コア'),
    shafts: rows.filter((r) => r.kind === 'other' && SHAFT_ATTRS.includes(r.attr ?? '')),
    corridors: other('廊下'),
    fixtures: rows.filter((r) => r.kind === FIXTURE_KIND && r.attr === FIXTURE_ATTRIBUTE),
    units: rows.filter((r) => r.kind === 'group' && r.attr === '住戸'),
    rooms: rows.filter((r) => r.kind === 'room'),
  }
}
