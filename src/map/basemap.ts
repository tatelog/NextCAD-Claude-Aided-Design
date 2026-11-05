// 基図：国土地理院の標準地図。彩度を下げて、上に重ねる道路・筆・建物を見やすくする。
export const GSI_BASEMAP_TILES = ['https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png']
export const GSI_BASEMAP_ATTRIBUTION = '地図 国土地理院'

export function gsiBasemapLayer() {
  return {
    id: 'gsi-basemap',
    type: 'raster' as const,
    source: 'gsi-basemap',
    paint: { 'raster-saturation': -0.6 },
  }
}
