// デモの初期表示。江東区役所と、デモに使う筆 2-7 の中間を中心にする。
// 区役所の座標は国土地理院の住所検索（東京都江東区東陽4-11-28）。筆 2-7 の重心は、登記所備付地図（江東区）から計算。
export const DEMO_PARCEL_ID = 'H000000013'
// 筆IDは地図（シート）の中でしか一意でないので、デモの筆は地図名と組で指す
export const DEMO_PARCEL_UID = `10121_hosei_20121129083849|${DEMO_PARCEL_ID}`

const CITY_HALL = { lon: 139.81636, lat: 35.672993 }
const DEMO_PARCEL_CENTROID = { lon: 139.829826, lat: 35.667401 }

export const DEMO_INITIAL_VIEW = {
  center: [(CITY_HALL.lon + DEMO_PARCEL_CENTROID.lon) / 2, (CITY_HALL.lat + DEMO_PARCEL_CENTROID.lat) / 2] as [number, number],
  zoom: 14.6,
  pitch: 45,
  bearing: -20,
}
