// 外部データの出典と利用条件。一次ページで確認できたものは「確認済み」、確認できなかったものは「未確認」。
// 画面の出典表示と README は、ここを正とする。
export type SourceStatus = '確認済み' | '未確認'

export type Source = {
  name: string
  citation: string
  url: string
  status: SourceStatus
  note?: string
}

export const SOURCES = {
  basemap: {
    name: '国土地理院 地理院タイル（標準地図）',
    citation: '地図 国土地理院',
    url: 'https://maps.gsi.go.jp/development/ichiran.html',
    status: '確認済み',
    note: '申請は不要。出典の明示と、一覧ページへのリンクが条件です。',
  },
  ksjRoad: {
    name: '国土数値情報（道路）令和6年度',
    citation: '出典：国土交通省国土数値情報ダウンロードサイト',
    url: 'https://nlftp.mlit.go.jp/ksj/other/agreement_01.html',
    status: '確認済み',
    note: '政府標準利用規約準拠版。商用利用も可。',
  },
  plateau: {
    name: '国土交通省 PLATEAU（3D都市モデル）',
    citation: '出典：国土交通省 PLATEAUウェブサイト',
    url: 'https://www.mlit.go.jp/plateau/site-policy/',
    status: '確認済み',
    note: '3D都市モデルのオープンデータの著作権は江東区（地方公共団体）。権利表記がなければ PDL1.0 に従います。',
  },
  mojParcel: {
    name: '登記所備付地図データ（江東区・2026年版）',
    citation: '出典：「登記所備付地図データ 江東区」（法務省）',
    url: 'https://www.moj.go.jp/MINJI/minji05_00494.html',
    status: '確認済み',
    note: '公開データは地図データのみで、登記所が交付する地図証明書の代わりにはなりません。精度は時代により異なります。商用利用も可。',
  },
  gsiAddress: {
    name: '国土地理院 住所検索 API',
    citation: '出典：国土地理院 住所検索',
    url: 'https://msearch.gsi.go.jp/address-search/AddressSearch',
    status: '未確認',
    note: '利用条件の一次ページを確認できていません。',
  },
} satisfies Record<string, Source>

export type SourceKey = keyof typeof SOURCES

// 「地図 国土地理院（URL）／利用条件：確認済み」の形で、一行にまとめる
export function sourceLabel(key: SourceKey): string {
  const s: Source = SOURCES[key]
  return `${s.citation.replace(/^出典：/, '')}（${s.url}）／利用条件：${s.status}`
}

// 選んだ筆の表示に付ける注記（法務上の境界ではないことを明記する）
export const PARCEL_BOUNDARY_NOTE = '筆界は参考値です（法務上の境界を示すものではありません）'
