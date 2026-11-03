// PLATEAU の CityGML API の応答から、区とメッシュを指定してファイルを取り出す（D-02 C4、A-03 G15、ハブ E-85）。
// 応答は https://api.plateauview.mlit.go.jp/datacatalog/citygml/mm:{メッシュ} の JSON。同じメッシュ番号は複数の区に現れるので、区で絞る。
import { z } from 'zod'

const FileSchema = z.object({
  code: z.string(),
  maxLod: z.number().optional(),
  url: z.string().url(),
  fileSize: z.number().nonnegative(),
  features: z.number().nonnegative().optional(),
})

const CitySchema = z.object({
  cityCode: z.string(),
  cityName: z.string().optional(),
  year: z.number().optional(),
  files: z.record(z.string(), z.array(FileSchema)).optional(),
})

const ResponseSchema = z.object({ cities: z.array(CitySchema) })

export type PlateauFileResult =
  | { status: '有'; url: string; fileSize: number; year: number | undefined; cityCode: string }
  | { status: '無' }

export function findPlateauFile(
  response: unknown,
  query: { cityCode: string; meshCode: string; kind: string },
): PlateauFileResult {
  const parsed = ResponseSchema.parse(response)
  const city = parsed.cities.find((c) => c.cityCode === query.cityCode)
  if (!city) return { status: '無' }
  const hits = (city.files?.[query.kind] ?? []).filter((f) => f.code === query.meshCode)
  if (hits.length === 0) return { status: '無' }
  if (hits.length > 1) throw new Error(`同じ区・メッシュ・種類のファイルが ${hits.length} 件ある`)
  const f = hits[0]!
  return { status: '有', url: f.url, fileSize: f.fileSize, year: city.year, cityCode: city.cityCode }
}
