// 外形から立体を作る（失敗は理由つきで返す）。P2 の 3D と日影は立体が無いと消えるので、消えた理由を画面に出すために使う。
// 黙って null にしない（仕様 3）。立体を作る処理そのものは extrudeVolume に任せる。
import { extrudeVolume, type ExtrudeInput } from './extrude'

export type Extruded = ReturnType<typeof extrudeVolume>

export type ExtrudeResult = { ok: true; volume: Extruded } | { ok: false; reason: string }

export function extrudeOrReason(input: ExtrudeInput): ExtrudeResult {
  try {
    return { ok: true, volume: extrudeVolume(input) }
  } catch (e) {
    const reason = e instanceof Error && e.message !== '' ? e.message : '立体を作れなかった（理由なし）'
    return { ok: false, reason }
  }
}
