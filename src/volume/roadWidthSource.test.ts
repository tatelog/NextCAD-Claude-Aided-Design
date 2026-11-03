// 仕様（ハブ A-03 G16）: 前面道路の幅員は、数値指定・対岸指定・資料指定のどれかで入れる（採用幅員の出どころ）。測った値を自動で採らない。
// 仕様 1: 出どころは 3 つ。既定は数値指定。
// 仕様 2: 注記は「出どころ（幅員 m）」の形で、幅員を m で一桁まで書く。
// 注: 対岸の寸法や資料の中身は、ここでは読まない（入力された値を、出どころの名前と一緒に持つだけ。仮置き）。
import { describe, expect, it } from 'vitest'
import { DEFAULT_ROAD_WIDTH_SOURCE, ROAD_WIDTH_SOURCES, roadWidthNote } from './roadWidthSource'

describe('前面道路の幅員の出どころ（仕様 1・2）', () => {
  it('出どころは 数値指定・対岸指定・資料指定 の 3 つ。既定は数値指定', () => {
    expect([...ROAD_WIDTH_SOURCES]).toEqual(['数値指定', '対岸指定', '資料指定'])
    expect(DEFAULT_ROAD_WIDTH_SOURCE).toBe('数値指定')
  })

  it('注記は「出どころ（幅員 m）」の形', () => {
    expect(roadWidthNote('対岸指定', 6000)).toBe('対岸指定（6.0 m）')
    expect(roadWidthNote('資料指定', 4500)).toBe('資料指定（4.5 m）')
  })
})
