// デモの初期表示。江東区役所と、デモに使う筆 2-7 の中間を中心にする。
// 区役所の座標は国土地理院の住所検索（東京都江東区東陽4-11-28）。筆 2-7 の重心は、登記所備付地図（江東区）から計算。
export const DEMO_PARCEL_ID = 'H000000013'
// 筆IDは地図（シート）の中でしか一意でないので、デモの筆は地図名と組で指す
export const DEMO_PARCEL_UID = `10121_hosei_20121129083849|${DEMO_PARCEL_ID}`

const CITY_HALL = { lon: 139.81636, lat: 35.672993 }
const DEMO_PARCEL_CENTROID = { lon: 139.829826, lat: 35.667401 }

// 読み込み時の地点（対象地点）。デモの筆 2-7（新砂三丁目）の内側の点。辺から約 21.5 m 離れていて、L 字の筆でも外に出ない。
// 確かめ（2026-11-06。登記所備付地図の江東区の筆データ 6,914 筆、読むだけ）: この点を含む筆はデモの筆 2-7 だけ（アプリの判定でも同じ）。
// 旧の既定（筆の重心 139.829826, 35.667401）もデモの筆 2-7 の中（辺から約 12.8 m）。区役所の地点（139.81636, 35.672993）を含む筆は、このデータには無い（最寄りは約 526 m）。
export const DEMO_SITE = { lon: 139.829867, lat: 35.667125 }

export const DEMO_INITIAL_VIEW = {
  center: [(CITY_HALL.lon + DEMO_PARCEL_CENTROID.lon) / 2, (CITY_HALL.lat + DEMO_PARCEL_CENTROID.lat) / 2] as [number, number],
  zoom: 14.6,
  pitch: 45,
  bearing: -20,
}
