// 仕様: 真北（D-02 C4、D-03 T-02 敷地 true_north、A-03 G16）。座標系から決定論で出す（利用者の入力に頼らない）。
// 仕様 1（G16）: 敷地の中心を経緯度から平面直角座標系へ写し、真北へ短い距離だけ進めた点を同じ系へ再投影する。
//   その差分の向きから、グリッドの北に対する真北の角度（度）を出す。
// 仕様 2: 系の原点（緯度 36°、中央子午線 139°50′ 付近）では角度は 0。
// 仕様 3: 中央子午線から東へ Δλ 離れた点の角度の絶対値は、およそ Δλ × sin φ（子午線収束角。Δλ は弧度）。
// 仕様 4: 系の定義（投影の文字列）は引数で受ける。系番号は自治体で決まるため、この関数には固定しない（D-02 C4 で未決）。
import { describe, expect, it } from 'vitest'
import { trueNorthAngleDeg } from './trueNorth'

// 平面直角座標系 IX（JGD2011）の定義。原点 緯度 36°、中央子午線 139°50′、縮尺係数 0.9999
const ZONE_IX = '+proj=tmerc +lat_0=36 +lon_0=139.8333333333333 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +units=m +no_defs'

describe('trueNorthAngleDeg（真北の角度）', () => {
  it('系の原点では角度はほぼ 0', () => {
    expect(Math.abs(trueNorthAngleDeg({ lon: 139.8333333333333, lat: 36 }, ZONE_IX))).toBeLessThan(0.001)
  })

  it('中央子午線から東へ 0.5° の点では、子午線収束角（Δλ・sinφ）の絶対値に一致する', () => {
    const lon = 139.8333333333333 + 0.5
    const lat = 36
    const dLambda = (0.5 * Math.PI) / 180
    const expectedDeg = (dLambda * Math.sin((lat * Math.PI) / 180) * 180) / Math.PI
    expect(Math.abs(trueNorthAngleDeg({ lon, lat }, ZONE_IX))).toBeCloseTo(expectedDeg, 2)
  })

  it('系の定義を変えれば、同じ点でも角度は変わる（系は引数）', () => {
    const p = { lon: 139.8333333333333 + 0.5, lat: 36 }
    const other = ZONE_IX.replace('lon_0=139.8333333333333', 'lon_0=138.5')
    expect(trueNorthAngleDeg(p, other)).not.toBeCloseTo(trueNorthAngleDeg(p, ZONE_IX), 3)
  })
})
