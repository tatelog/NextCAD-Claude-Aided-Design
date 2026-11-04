// 仕様（ハブ A-03 G43・G73・G74。メニューの「右パネルの項目」を、P2 の機能一覧として、行ごとに SVG のチェックで出す。統括の依頼 t51、2026-11-04）:
// 仕様 1（グループ）: 見出しは P2（ボリューム）が先、P3（平面）が後。P2 の行は P2 の 5 つ、P3 の行は 6 つ。
// 仕様 2（チェック）: 閉じていないタイルの行はチェックが入る（shown）。閉じたタイルの行はチェックが入らない（G73 の × と同じ状態）。
// 仕様 3（順）: 行の並びは右パネルの一覧の順。
// 仕様 4（描画）: 行の右側に SVG のチェックを出す。チェックのある行だけ、チェックの印（data-check="on"）を持つ。
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { PANEL_TILES } from '../store/panelTiles'
import { FEATURE_ITEMS, type FeatureKey } from '../store/features'
import { featureMenuGroupsOf, panelMenuGroupsOf } from './menuGroups'
import { MenuCheckRows } from './MenuCheckRows'

const count = (html: string, pattern: RegExp): number => (html.match(pattern) ?? []).length

describe('右パネルの項目の一覧（仕様 1〜3）', () => {
  it('見出しは P2、P3、共通（モードの項目。G95）の順', () => {
    const groups = panelMenuGroupsOf({})
    expect(groups.map((g) => g.heading)).toEqual(['P2（ボリューム）', 'P3（平面）', '共通'])
  })

  it('P2 の行は 5 つ、P3 の行は 6 つ、共通の行は 3 つ（合わせて右パネルの一覧と同じ 14 行。候補の確認は共通。G124）', () => {
    const groups = panelMenuGroupsOf({})
    expect(groups[0]!.rows.map((r) => r.id)).toEqual(['p2-outline', 'p2-storey', 'p2-volume', 'p2-numeric', 'p2-rotate'])
    expect(groups[1]!.rows.map((r) => r.id)).toEqual(['fixtures', 'milestone', 'semantic', 'auto', 'p3-form', 'p3-result'])
    expect(groups[2]!.rows.map((r) => r.id)).toEqual(['claude-chat', 'feature-adjust', 'drawing-review'])
    expect(groups.flatMap((g) => g.rows)).toHaveLength(PANEL_TILES.length)
  })

  it('閉じていないタイルはチェックが入り（shown）、閉じたタイルは入らない', () => {
    const groups = panelMenuGroupsOf({ 'p2-outline': true })
    const p2 = groups[0]!.rows
    expect(p2.find((r) => r.id === 'p2-outline')!.shown).toBe(false)
    expect(p2.find((r) => r.id === 'p2-storey')!.shown).toBe(true)
  })

  it('行の並びは、右パネルの一覧の順（グループの中で）', () => {
    const groups = panelMenuGroupsOf({})
    const order = PANEL_TILES.map((t) => t.id)
    const p3ids = groups[1]!.rows.map((r) => r.id)
    expect(p3ids.map((id) => order.indexOf(id))).toEqual([...p3ids.map((id) => order.indexOf(id))].sort((a, b) => a - b))
  })
})

describe('右パネルの項目の描画（仕様 4）', () => {
  it('行ごとに SVG のチェックを出し、チェックのある行だけ data-check="on" を持つ', () => {
    const groups = panelMenuGroupsOf({ 'p2-outline': true, 'auto': true })
    const html = renderToStaticMarkup(createElement(MenuCheckRows, { groups, onToggle: () => undefined }))
    expect(count(html, /<svg/g)).toBe(PANEL_TILES.length)
    expect(count(html, /data-check="on"/g)).toBe(PANEL_TILES.length - 2)
    expect(count(html, /data-check="off"/g)).toBe(2)
  })

  it('グループの見出しを出す（P2 → P3 の順）', () => {
    const groups = panelMenuGroupsOf({})
    const html = renderToStaticMarkup(createElement(MenuCheckRows, { groups, onToggle: () => undefined }))
    expect(html.indexOf('P2（ボリューム）')).toBeGreaterThanOrEqual(0)
    expect(html.indexOf('P2（ボリューム）')).toBeLessThan(html.indexOf('P3（平面）'))
  })
})

// 機能一覧（ハブ A-03 G43・G70。ハンバーガーの機能の行に SVG のチェック。統括の依頼 2026-11-04）
describe('機能一覧（仕様 5〜8）', () => {
  it('仕様 5（グループ）: 見出しは 表示・操作・計算 の順で、行の数は 5・6・3', () => {
    const groups = featureMenuGroupsOf(() => true)
    expect(groups.map((g) => g.heading)).toEqual(['表示', '操作', '計算'])
    expect(groups.map((g) => g.rows.length)).toEqual([5, 6, 3])
  })

  it('仕様 5（並び）: 行の並びは機能の一覧の順', () => {
    const ids = featureMenuGroupsOf(() => true).flatMap((g) => g.rows.map((r) => r.id))
    expect(ids).toEqual(FEATURE_ITEMS.map((i) => i.key))
  })

  it('仕様 6（チェック）: チェックは渡された値で決まる（入力スナップのように画面の別の状態を見る項目も同じ）', () => {
    const on = new Set<FeatureKey>(['showShadow', 'inputSnap'])
    const groups = featureMenuGroupsOf((k) => on.has(k))
    const shown = Object.fromEntries(groups.flatMap((g) => g.rows.map((r) => [r.id, r.shown])))
    expect(shown.showShadow).toBe(true)
    expect(shown.inputSnap).toBe(true)
    expect(shown.showGrid).toBe(false)
  })

  it('仕様 7（未接続）: つながっていない項目は、名前に「（未接続）」を付ける', () => {
    const items = [{ key: 'knobs' as const, group: '操作' as const, label: 'つまみ', connected: false }]
    const groups = featureMenuGroupsOf(() => false, items)
    expect(groups.find((g) => g.heading === '操作')!.rows[0]!.title).toBe('つまみ（未接続）')
  })

  it('仕様 8（描画）: チェックの印（SVG）を機能の数だけ出し、入っているものだけ data-check="on"', () => {
    const groups = featureMenuGroupsOf((k) => k === 'showShadow')
    const html = renderToStaticMarkup(createElement(MenuCheckRows, { groups, onToggle: () => undefined }))
    expect(count(html, /<svg/g)).toBe(FEATURE_ITEMS.length)
    expect(count(html, /data-check="on"/g)).toBe(1)
  })
})
