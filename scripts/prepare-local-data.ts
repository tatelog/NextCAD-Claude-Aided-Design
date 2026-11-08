// 準備スクリプト（簡易版）。利用者が取得した元データから、public/local-data/ の形式を作る。
// 生データはリポジトリに入れない。出力先は既定で public/local-data/（.gitignore で除外）。
//
// 使い方（Node 24 以上。TypeScript を直接実行します）:
//   node scripts/prepare-local-data.ts --roads <国土数値情報の道路 GeoJSON> --buildings <PLATEAU の建物 GML のファイルかフォルダ> --parcels <変換済みの筆 GeoJSON（mojxml の出力）> [--out public/local-data]
// 指定しなかった入力は作らない（その層は画面で「未取得」と出ます）。
import { createReadStream, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { createInterface } from 'node:readline'
import { gzipSync } from 'node:zlib'
import { join, resolve } from 'node:path'
import { buildingsFromGml, parcelsWithUid, roadFromFeatureLine, type RoadRecord } from '../src/prep/convert.ts'

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 ? process.argv[i + 1] : undefined
}

const roadsIn = arg('roads')
const buildingsIn = arg('buildings')
const parcelsIn = arg('parcels')
const outDir = resolve(arg('out') ?? 'public/local-data')

if (!roadsIn && !buildingsIn && !parcelsIn) {
  console.log('使い方: node scripts/prepare-local-data.ts --roads <道路 GeoJSON> --buildings <建物 GML かフォルダ> --parcels <筆 GeoJSON> [--out public/local-data]')
  process.exit(1)
}

mkdirSync(outDir, { recursive: true })

async function convertRoads(path: string): Promise<number> {
  const roads: RoadRecord[] = []
  const rl = createInterface({ input: createReadStream(path, { encoding: 'utf8' }), crlfDelay: Infinity })
  for await (const line of rl) {
    const r = roadFromFeatureLine(line)
    if (r) roads.push(r)
  }
  writeFileSync(join(outDir, 'roads-koto.json'), JSON.stringify({ roads }))
  return roads.length
}

function convertBuildings(path: string): { count: number; skipped: number } {
  const files = statSync(path).isDirectory()
    ? readdirSync(path).filter((f) => f.toLowerCase().endsWith('.gml')).map((f) => join(path, f))
    : [path]
  const features: unknown[] = []
  let skipped = 0
  for (const f of files) {
    const r = buildingsFromGml(readFileSync(f, 'utf8'))
    features.push(...r.geojson.features)
    skipped += r.skipped
  }
  const fc = JSON.stringify({ type: 'FeatureCollection', features })
  writeFileSync(join(outDir, 'buildings-koto.geojson.gz'), gzipSync(fc))
  return { count: features.length, skipped }
}

function convertParcels(path: string): number {
  const fc = parcelsWithUid(JSON.parse(readFileSync(path, 'utf8')) as { features: { properties: Record<string, string> }[] })
  writeFileSync(join(outDir, 'koto-parcels.geojson'), JSON.stringify(fc))
  return fc.features.length
}

const summary: string[] = []
if (roadsIn) summary.push(`道路 ${await convertRoads(roadsIn)} 本`)
if (buildingsIn) {
  const b = convertBuildings(buildingsIn)
  summary.push(`建物 ${b.count} 棟（除外 ${b.skipped} 件）`)
}
if (parcelsIn) summary.push(`筆 ${convertParcels(parcelsIn)} 筆`)
console.log(`${outDir} に書き出しました: ${summary.join('、')}`)
