// 仕様（外部データの出典と利用条件の表示）から書いたテスト。実装を読まずに書いている。
// 仕様:
// - 外部データごとに、出典の記載（citation）、一次ページの URL、利用条件の確認状態を持つ
// - 利用条件を一次ページで確認できたものは「確認済み」、確認できなかったものは「未確認」
// - 地図（地理院タイル）: 出典「地図 国土地理院」を明示し、地理院タイル一覧（https://maps.gsi.go.jp/development/ichiran.html）へのリンクを付ける。申請は不要
// - 国土数値情報（道路）: 政府標準利用規約準拠版。出典「国土交通省国土数値情報ダウンロードサイト」。商用利用も可
// - PLATEAU: 出典「国土交通省 PLATEAUウェブサイト」。3D都市モデルの著作権は江東区（地方公共団体）、権利表記がなければ PDL1.0
// - 登記所備付地図（江東区）: 出典「登記所備付地図データ 江東区」（法務省）。商用利用も可。地図証明書の代わりには使えない。精度は時代により異なる
// - 国土地理院の住所検索 API: 一次ページで利用条件を確認できていない（未確認）
// - 筆界は、画面で「参考値（法務上の境界を示すものではない）」と明記する
import { describe, expect, it } from 'vitest'
import { PARCEL_BOUNDARY_NOTE, SOURCES, sourceLabel } from './sources'

describe('SOURCES', () => {
  it('地図（地理院タイル）は確認済みで、一覧ページの URL を持つ', () => {
    expect(SOURCES.basemap.status).toBe('確認済み')
    expect(SOURCES.basemap.url).toBe('https://maps.gsi.go.jp/development/ichiran.html')
    expect(SOURCES.basemap.citation).toBe('地図 国土地理院')
  })

  it('国土数値情報（道路）は確認済みで、出典の記載を持つ', () => {
    expect(SOURCES.ksjRoad.status).toBe('確認済み')
    expect(SOURCES.ksjRoad.citation).toBe('出典：国土交通省国土数値情報ダウンロードサイト')
  })

  it('PLATEAU は確認済みで、3D都市モデルの権利の注記（江東区・PDL1.0）を持つ', () => {
    expect(SOURCES.plateau.status).toBe('確認済み')
    expect(SOURCES.plateau.citation).toBe('出典：国土交通省 PLATEAUウェブサイト')
    expect(SOURCES.plateau.note).toContain('江東区')
    expect(SOURCES.plateau.note).toContain('PDL1.0')
  })

  it('登記所備付地図は確認済みで、地図証明書の代わりにならない注記を持つ', () => {
    expect(SOURCES.mojParcel.status).toBe('確認済み')
    expect(SOURCES.mojParcel.citation).toContain('登記所備付地図データ')
    expect(SOURCES.mojParcel.note).toContain('証明書')
  })

  it('国土地理院の住所検索 API は、利用条件が未確認のままになっている', () => {
    expect(SOURCES.gsiAddress.status).toBe('未確認')
  })

  it('どの出典も、一次ページの URL（https）を持つ', () => {
    for (const s of Object.values(SOURCES)) expect(s.url.startsWith('https://')).toBe(true)
  })
})

describe('sourceLabel', () => {
  it('出典・URL・利用条件の確認状態を、一行にまとめる', () => {
    expect(sourceLabel('basemap')).toBe('地図 国土地理院（https://maps.gsi.go.jp/development/ichiran.html）／利用条件：確認済み')
    expect(sourceLabel('gsiAddress')).toContain('利用条件：未確認')
  })
})

describe('PARCEL_BOUNDARY_NOTE', () => {
  it('筆界は「参考値（法務上の境界を示すものではない）」と明記する', () => {
    expect(PARCEL_BOUNDARY_NOTE).toBe('筆界は参考値です（法務上の境界を示すものではありません）')
  })
})
