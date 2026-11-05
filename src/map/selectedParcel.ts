// 地図で選んだ筆の形を覚えておき、その筆の平面（mm）を店舗へ渡す（P2 の斜線・日影の基準に使う）。
// 地図の読み込みと選択の処理（P1Map）から使う。店舗の値は画面の中だけで、保存しない。
import { useSite } from '../store/site'
import { parcelRingOf } from './parcelPlane'

// 筆の UID → 筆の形（GeoJSON の geometry）
const geometries = new Map<string, unknown>()

/** 地図の筆の形を覚える（筆の読み込みのとき） */
export function rememberParcelGeometry(uid: string, geometry: unknown): void {
  geometries.set(uid, geometry)
}

/** 選んだ筆の平面を店舗へ渡す。uid が null、覚えていない、形が読めないときは null（P2 はダミーの筆に戻す） */
export function publishSelectedParcel(uid: string | null): void {
  useSite.getState().setParcel(uid === null ? null : parcelRingOf(geometries.get(uid)))
}
