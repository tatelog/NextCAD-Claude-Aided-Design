// 仕様: 地点（経緯度）と区から、その地点の用途地域を取る（D-02 C4、ハブ E-85）。
// 仕様 1: 地点から 2 次メッシュを求め、API（datacatalog/citygml/mm:{メッシュ}）で、区の urf のファイルを探す。
// 仕様 2: そのファイルを取り、用途地域を解析し、地点を含む用途地域を返す。
// 仕様 3: 区に urf の項目が無ければ、ファイルは取らず、file = null・matches = []（別の区は使わない）。
// 仕様 4: API の応答が正常でなければ例外（推測で埋めない）。
import { describe, expect, it } from 'vitest'
import { loadDistrictsAt } from './load'

const apiJson = (cityCode: string) => ({
  cities: [
    {
      cityCode,
      cityName: '江東区',
      year: 2025,
      files: {
        urf: [{ code: '533946', url: 'https://example.invalid/urf.gml', fileSize: 100, features: 1 }],
      },
    },
  ],
})

const gml = `
<urf:UseDistrict gml:id="a">
  <urf:function codeSpace="x">1</urf:function>
  <urf:lod1MultiSurface><gml:MultiSurface><gml:surfaceMember><gml:Polygon><gml:exterior><gml:LinearRing><gml:posList>
    35.60 139.70 35.60 139.90 35.80 139.90 35.80 139.70 35.60 139.70
  </gml:posList></gml:LinearRing></gml:exterior></gml:Polygon></gml:surfaceMember></gml:MultiSurface></urf:lod1MultiSurface>
  <urf:floorAreaRate>300</urf:floorAreaRate>
  <urf:buildingCoverageRate>60</urf:buildingCoverageRate>
</urf:UseDistrict>`

function router(apiStatus: number, cityCode: string, requested: string[]) {
  return async (url: string) => {
    requested.push(url)
    if (url.startsWith('https://api.plateauview.mlit.go.jp/')) {
      return new Response(JSON.stringify(apiJson(cityCode)), { status: apiStatus })
    }
    return new Response(gml, { status: 200 })
  }
}

describe('loadDistrictsAt（地点の用途地域）', () => {
  it('地点を含む用途地域を返し、メッシュ 533946 の API と区のファイルを使う', async () => {
    const requested: string[] = []
    const r = await loadDistrictsAt({ lat: 35.67, lon: 139.76, cityCode: '13108' }, router(200, '13108', requested))
    expect(requested[0]).toBe('https://api.plateauview.mlit.go.jp/datacatalog/citygml/mm:533946')
    expect(requested[1]).toBe('https://example.invalid/urf.gml')
    expect(r.file).toEqual({ url: 'https://example.invalid/urf.gml', fileSize: 100, cityCode: '13108' })
    expect(r.matches.map((m) => m.floorAreaRatePercent)).toEqual([300])
  })

  it('区に urf の項目が無ければ、ファイルは取らず空を返す', async () => {
    const requested: string[] = []
    const r = await loadDistrictsAt({ lat: 35.67, lon: 139.76, cityCode: '13116' }, router(200, '13108', requested))
    expect(requested).toHaveLength(1)
    expect(r).toEqual({ file: null, districts: [], matches: [], fireMatches: [], heightMatches: [], fireUnknownOwner: [], heightUnknownOwner: [] })
  })

  it('同じファイルから、地点を含む防火地域と高度地区も返す', async () => {
    const withZones = `${gml}
<urf:FirePreventionDistrict gml:id="f1">
  <urf:function codeSpace="x">24</urf:function>
  <urf:usage codeSpace="x">1</urf:usage>
  <urf:lod1MultiSurface><gml:MultiSurface srsDimension="3"><gml:surfaceMember><gml:Polygon><gml:exterior><gml:LinearRing><gml:posList>
    35.60 139.70 10 35.60 139.90 10 35.80 139.90 10 35.80 139.70 10 35.60 139.70 10
  </gml:posList></gml:LinearRing></gml:exterior></gml:Polygon></gml:surfaceMember></gml:MultiSurface></urf:lod1MultiSurface>
</urf:FirePreventionDistrict>
<urf:HeightControlDistrict gml:id="h1">
  <urf:function codeSpace="x">18</urf:function>
  <urf:maximumBuildingHeight uom="m">14</urf:maximumBuildingHeight>
  <urf:lod1MultiSurface><gml:MultiSurface srsDimension="3"><gml:surfaceMember><gml:Polygon><gml:exterior><gml:LinearRing><gml:posList>
    35.60 139.70 10 35.60 139.90 10 35.80 139.90 10 35.80 139.70 10 35.60 139.70 10
  </gml:posList></gml:LinearRing></gml:exterior></gml:Polygon></gml:surfaceMember></gml:MultiSurface></urf:lod1MultiSurface>
</urf:HeightControlDistrict>`
    const fetchImpl = async (url: string) =>
      url.startsWith('https://api.plateauview.mlit.go.jp/')
        ? new Response(JSON.stringify(apiJson('13108')), { status: 200 })
        : new Response(withZones, { status: 200 })
    const r = await loadDistrictsAt({ lat: 35.67, lon: 139.76, cityCode: '13108' }, fetchImpl)
    // この fixture には管理者（custodian）が無いので、不明として別に返す（対象の区の項目とは扱わない）
    expect(r.fireMatches).toEqual([])
    expect(r.fireUnknownOwner.map((x) => x.id)).toEqual(['f1'])
    expect(r.heightMatches).toEqual([])
    expect(r.heightUnknownOwner.map((x) => x.maximumBuildingHeightM)).toEqual([14])
  })

  it('防火地域は、対象の区（江東区）と東京都の項目だけを残し、隣の区の項目は捨てる。不明は別に返す', async () => {
    const ring = `<gml:posList>35.60 139.70 10 35.60 139.90 10 35.80 139.90 10 35.80 139.70 10 35.60 139.70 10</gml:posList>`
    const fire = (custodian: string | null) =>
      `<urf:FirePreventionDistrict gml:id="${custodian ?? 'none'}">
  <urf:function codeSpace="x">24</urf:function>
  ${custodian === null ? '' : `<urf:custodian>${custodian}</urf:custodian>`}
  <urf:lod1MultiSurface><gml:MultiSurface srsDimension="3"><gml:surfaceMember><gml:Polygon><gml:exterior><gml:LinearRing>${ring}</gml:LinearRing></gml:exterior></gml:Polygon></gml:surfaceMember></gml:MultiSurface></urf:lod1MultiSurface>
</urf:FirePreventionDistrict>`
    const withOwners = `${gml}${fire('江東区')}${fire('江戸川区')}${fire('東京都')}${fire(null)}`
    const fetchImpl = async (url: string) =>
      url.startsWith('https://api.plateauview.mlit.go.jp/')
        ? new Response(JSON.stringify(apiJson('13108')), { status: 200 })
        : new Response(withOwners, { status: 200 })
    const r = await loadDistrictsAt({ lat: 35.67, lon: 139.76, cityCode: '13108' }, fetchImpl)
    expect(r.fireMatches.map((x) => x.custodian).sort()).toEqual(['東京都', '江東区'])
    expect(r.fireUnknownOwner.map((x) => x.custodian)).toEqual([null])
  })

  it('API の応答が正常でなければ例外', async () => {
    await expect(loadDistrictsAt({ lat: 35.67, lon: 139.76, cityCode: '13108' }, router(500, '13108', []))).rejects.toThrow()
  })
})
