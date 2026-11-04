// 地点（経緯度）と区から、その地点の用途地域を取る（D-02 C4、ハブ E-85）。ブラウザから直接取る（API とファイルの CORS は * で許可を確認済み）。
import { meshCode2nd } from './mesh'
import { findPlateauFile } from './catalog'
import { districtsAt, parseUseDistricts, type UseDistrict } from './urf'
import { ownedBy } from './owner'
import {
  districtsAtPoint,
  parseFirePreventionDistricts,
  parseHeightControlDistricts,
  type FireDistrict,
  type HeightDistrict,
} from './zones'

type FetchLike = (url: string) => Promise<Response>

export interface DistrictLoad {
  file: { url: string; fileSize: number; cityCode: string } | null
  districts: UseDistrict[]
  matches: UseDistrict[]
  /** 地点を含む防火地域（区分は function、用途は usage） */
  fireMatches: FireDistrict[]
  /** 地点を含む高度地区（最高・最低の高さ） */
  heightMatches: HeightDistrict[]
  /** 管理者が不明（null）の防火地域。捨てず、別に返す */
  fireUnknownOwner: FireDistrict[]
  /** 管理者が不明（null）の高度地区。捨てず、別に返す */
  heightUnknownOwner: HeightDistrict[]
}

export async function loadDistrictsAt(
  query: { lat: number; lon: number; cityCode: string },
  fetchImpl: FetchLike,
): Promise<DistrictLoad> {
  const meshCode = meshCode2nd({ lat: query.lat, lon: query.lon })
  const apiRes = await fetchImpl(`https://api.plateauview.mlit.go.jp/datacatalog/citygml/mm:${meshCode}`)
  if (!apiRes.ok) throw new Error(`PLATEAU の API が失敗: ${apiRes.status}`)
  const found = findPlateauFile(await apiRes.json(), { cityCode: query.cityCode, meshCode, kind: 'urf' })
  if (found.status === '無') {
    return { file: null, districts: [], matches: [], fireMatches: [], heightMatches: [], fireUnknownOwner: [], heightUnknownOwner: [] }
  }

  const fileRes = await fetchImpl(found.url)
  if (!fileRes.ok) throw new Error(`urf のファイルが取れない: ${fileRes.status}`)
  const text = await fileRes.text()
  const point = { lat: query.lat, lon: query.lon }
  const districts = parseUseDistricts(text)
  // 防火・高度地区は管理者で絞る（隣の区の項目を捨てる）。区の名前が無ければ絞れないので弾く
  const ward = found.cityName
  if (ward === undefined) throw new Error('区の名前が応答に無い（管理者で絞れない）')
  const fire = ownedBy(districtsAtPoint(parseFirePreventionDistricts(text), point), ward)
  const height = ownedBy(districtsAtPoint(parseHeightControlDistricts(text), point), ward)
  return {
    file: { url: found.url, fileSize: found.fileSize, cityCode: found.cityCode },
    districts,
    matches: districtsAt(districts, point),
    fireMatches: fire.owned,
    heightMatches: height.owned,
    fireUnknownOwner: fire.unknownOwner,
    heightUnknownOwner: height.unknownOwner,
  }
}
