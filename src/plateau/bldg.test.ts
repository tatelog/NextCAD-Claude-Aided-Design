// 仕様: PLATEAU の建物（bldg, CityGML 2.0）の GML から、建物ごとの底面・高さ・階数を読む。
// 仕様 1: 建物（bldg:Building）ごとに、id・計測高さ（m）・地上階数を読む。
// 仕様 2: 底面は lod1Solid のうち最も低い高さにある面。緯度・経度（posList の順、緯度が先）で読む。閉じ点（最初と同じ点）は除く。
// 仕様 3: 底面が複数ある建物（部分が離れている）は、底面をすべて footprints に入れる。
// 仕様 4: 壁や屋根（高さが混ざる面、高い面）は底面に入れない。
// 仕様 5: 建物でないもの（建物の部分でないもの）は含めない。
import { describe, expect, it } from 'vitest'
import { parseBuildings } from './bldg'

const NS =
  'xmlns:core="http://www.opengis.net/citygml/2.0" xmlns:bldg="http://www.opengis.net/citygml/building/2.0" xmlns:gml="http://www.opengis.net/gml"'

// 底面（z=1.0）の四角、屋根（z=11.6）の四角、壁（z が混ざる四角）を 1 つの Solid に入れる
function squareRing(lat0: number, lon0: number, d: number, z: number): string {
  const pts = [
    [lat0, lon0],
    [lat0, lon0 + d],
    [lat0 + d, lon0 + d],
    [lat0 + d, lon0],
    [lat0, lon0],
  ]
  return `<gml:Polygon><gml:exterior><gml:LinearRing><gml:posList srsDimension="3">${pts
    .map(([la, lo]) => `${la} ${lo} ${z}`)
    .join(' ')}</gml:posList></gml:LinearRing></gml:exterior></gml:Polygon>`
}

function wallRing(lat0: number, lon0: number, d: number): string {
  return `<gml:Polygon><gml:exterior><gml:LinearRing><gml:posList srsDimension="3">${lat0} ${lon0} 1.0 ${lat0} ${lon0 + d} 1.0 ${lat0} ${lon0 + d} 11.6 ${lat0} ${lon0} 11.6 ${lat0} ${lon0} 1.0</gml:posList></gml:LinearRing></gml:exterior></gml:Polygon>`
}

function surfaces(...polygons: string[]): string {
  return polygons.map((p) => `<gml:surfaceMember>${p}</gml:surfaceMember>`).join('')
}

const buildingA = `<core:cityObjectMember><bldg:Building gml:id="bldg_a">
  <bldg:measuredHeight uom="m">10.6</bldg:measuredHeight>
  <bldg:storeysAboveGround>3</bldg:storeysAboveGround>
  <bldg:lod1Solid><gml:Solid><gml:exterior><gml:CompositeSurface>
    ${surfaces(
      squareRing(35.0, 139.0, 0.001, 1.0),
      squareRing(35.0, 139.0, 0.001, 11.6),
      wallRing(35.0, 139.0, 0.001),
    )}
  </gml:CompositeSurface></gml:exterior></gml:Solid></bldg:lod1Solid>
</bldg:Building></core:cityObjectMember>`

// 底面が 2 つに分かれている建物（離れた部分が 2 つ）
const buildingB = `<core:cityObjectMember><bldg:Building gml:id="bldg_b">
  <bldg:measuredHeight uom="m">4.0</bldg:measuredHeight>
  <bldg:storeysAboveGround>1</bldg:storeysAboveGround>
  <bldg:lod1Solid><gml:Solid><gml:exterior><gml:CompositeSurface>
    ${surfaces(squareRing(35.01, 139.0, 0.001, 0.5), squareRing(35.02, 139.0, 0.001, 0.5), squareRing(35.01, 139.0, 0.001, 4.0))}
  </gml:CompositeSurface></gml:exterior></gml:Solid></bldg:lod1Solid>
</bldg:Building></core:cityObjectMember>`

const gml = `<?xml version="1.0" encoding="UTF-8"?>
<core:CityModel ${NS}>
${buildingA}
${buildingB}
</core:CityModel>`

describe('parseBuildings（PLATEAU の建物 GML）', () => {
  it('建物ごとに id・計測高さ・地上階数を読む', () => {
    const [a, b] = parseBuildings(gml)
    expect(a!.id).toBe('bldg_a')
    expect(a!.heightM).toBe(10.6)
    expect(a!.storeys).toBe(3)
    expect(b!.id).toBe('bldg_b')
    expect(b!.heightM).toBe(4)
    expect(b!.storeys).toBe(1)
  })

  it('底面は最も低い面だけ。緯度・経度の順で、閉じ点を除く', () => {
    const [a] = parseBuildings(gml)
    expect(a!.footprints).toHaveLength(1)
    expect(a!.footprints[0]).toEqual([
      { lat: 35.0, lon: 139.0 },
      { lat: 35.0, lon: 139.001 },
      { lat: 35.001, lon: 139.001 },
      { lat: 35.001, lon: 139.0 },
    ])
  })

  it('底面が複数あれば、すべて footprints に入れる', () => {
    const [, b] = parseBuildings(gml)
    expect(b!.footprints).toHaveLength(2)
  })

  it('計測高さが -9999（不明）の建物は heightM を null にする', () => {
    const unknown = `<core:cityObjectMember><bldg:Building gml:id="bldg_c">
  <bldg:measuredHeight uom="m">-9999</bldg:measuredHeight>
  <bldg:lod1Solid><gml:Solid><gml:exterior><gml:CompositeSurface>
    ${surfaces(squareRing(35.03, 139.0, 0.001, 0.5))}
  </gml:CompositeSurface></gml:exterior></gml:Solid></bldg:lod1Solid>
</bldg:Building></core:cityObjectMember>`
    const [c] = parseBuildings(`<core:CityModel ${NS}>${unknown}</core:CityModel>`)
    expect(c!.heightM).toBeNull()
  })

  it('建物が無い GML は空の配列', () => {
    expect(parseBuildings('<core:CityModel></core:CityModel>')).toEqual([])
  })
})
