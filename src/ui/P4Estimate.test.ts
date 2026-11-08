// 利用者指定（2026-11-08）: 積算では左オブジェクト欄を外し、保存済み平面を使う。
import {createElement} from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {expect,it} from 'vitest'
import {P4Estimate} from './P4Estimate'
it('左オブジェクト欄を表示せず、積算本体と金額欄を表示する',()=>{
 const html=renderToStaticMarkup(createElement(P4Estimate))
 expect(html).not.toContain('種類ごとの件数（平面の自動作成の結果）')
 expect(html).not.toContain('オブジェクトを開く')
 expect(html).not.toContain('grid-template-columns:max-content')
 expect(html).toContain('積算 — 単価と数量')
 expect(html).toContain('計上済み金額（概算）')
})
it('明細は右の開閉欄へ集約し仕様はCSVで管理する',()=>{
 const html=renderToStaticMarkup(createElement(P4Estimate))
 expect(html).not.toContain('数量の内訳（区分別・自動で拾えたもの）')
 expect(html).toContain('<summary')
 expect(html).not.toContain('data-cost-line')
 expect(html).toContain('データ管理（CSV）')
 expect(html).toContain('材料CSVを書き出す')
 expect(html).not.toContain('住戸タイプ別の実室面積')
})
