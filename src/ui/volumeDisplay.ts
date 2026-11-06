// ボリューム画面の表示の決まり（代表の依頼 2026-11-06。1）。画面の切り替え（地図・周辺建物・影）は、機能の調整（全体。☰）と両方が入っているときに出る。
// 機能の調整の周辺建物・日影は、敷地の地図（P1）にも効くので、ボリュームの切り替えで既定を変えない。

/** 周辺建物を出すか（3D と 2D の輪郭）。機能の調整（全体）と、ボリュームの周辺建物の両方が入っているとき */
export function neighborsShownOf(menuOn: boolean, volumeOn: boolean): boolean {
  return menuOn && volumeOn
}

/** 影（3D の地面の日影）を出すか。機能の調整（全体）と、ボリュームの影の両方が入っているとき */
export function shadowShownOf(menuOn: boolean, volumeOn: boolean): boolean {
  return menuOn && volumeOn
}
