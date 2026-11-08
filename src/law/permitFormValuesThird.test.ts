// 仕様（統括の依頼 2026-11-06。第三号: 第二号と同じ値の元・同じ書き方。新しい値の元は作らない）:
// TV1: 用途地域の名前は、地点の用途地域（区分コード）が 1 つのときだけ決まる。2 つ以上（地域ごとの面積は未対応）・無い・表に無いコードは、決めない（null）。
// TV2: 第三号の欄は、第二号と同じ値を、第三号の欄の id で入れる。幅員と接する長さは、単位（ｍ）を文字に含める（第三号は単位が印刷されていない）。
// TV3: 階数・構造は、第三号の 13 欄の値（第二号と同じ値）。
import { describe, expect, it } from 'vitest'
import { formValuesFromVolume, zoneNameOf } from './permitFormValues'
import { extrudeVolume } from '../volume/extrude'

function block(storeys: number) {
  return extrudeVolume({
    footprint: [
      { x: 0, y: 0 },
      { x: 20_000, y: 0 },
      { x: 20_000, y: 20_000 },
      { x: 0, y: 20_000 },
    ],
    storey_count: storeys,
    storey_height: 3_200,
  })
}

describe('用途地域の名前（仕様 TV1）', () => {
  it('TV1: 1 つの用途地域（区分 11）は「準工業地域」', () => {
    expect(zoneNameOf([{ function: 11 }])).toBe('準工業地域')
  })

  it('TV1: 2 つ以上・無い・表に無いコードは、決めない', () => {
    expect(zoneNameOf([{ function: 11 }, { function: 5 }])).toBeNull()
    expect(zoneNameOf([])).toBeNull()
    expect(zoneNameOf([{ function: 99 }])).toBeNull()
    expect(zoneNameOf([{ function: null }])).toBeNull()
  })
})

describe('第三号の値（仕様 TV2・TV3）', () => {
  const PROJECT = {
    structure: 'RC',
    usage: '共同住宅',
    chiban: '江東区新砂二丁目625番1',
    fire: '防火地域',
    siteAreaM2: 1_200,
    frontRoadWidth: { mm: 6_000, source: '数値指定' as const },
    frontRoadLengthM: 3.62,
    zoneName: '準工業地域',
  }

  it('TV2: 第三号の欄（地名地番・防火・道路・敷地面積・用途地域等）は、第二号と同じ出典で入る', () => {
    const v = formValuesFromVolume(block(5), PROJECT)
    expect(v['F3-2-01']).toEqual({ value: '江東区新砂二丁目625番1', from: '公図' })
    expect(v['F3-2-04']).toEqual({ value: '防火地域', from: '法規' })
    expect(v['F3-2-06.幅員']).toEqual({ value: '6.00ｍ', from: '数値指定' })
    expect(v['F3-2-06.敷地と接している部分の長さ']).toEqual({ value: '3.62ｍ', from: '公図' })
    expect(v['F3-2-07.敷地面積']).toEqual({ value: '1200.00', from: '公図の参考値' })
    expect(v['F3-2-07.用途地域等']).toEqual({ value: '準工業地域', from: '法規' })
    expect(v['F2-3-07.用途地域等']).toEqual({ value: '準工業地域', from: '法規' })
  })

  it('TV2: 第三号の建築面積・延べ面積・件数・高さは、第二号と同じ値', () => {
    const v = formValuesFromVolume(block(5), PROJECT)
    expect(v['F3-2-10']).toEqual({ value: '400.00', from: 'ボリューム' })
    expect(v['F3-2-11']).toEqual({ value: '2000.00', from: 'ボリューム' })
    expect(v['F3-2-12']).toEqual({ value: '1', from: 'ボリューム' })
    expect(v['F3-2-13.最高の高さ']).toEqual({ value: '16.00', from: 'ボリューム' })
  })

  it('TV3: 階数（地上）と構造は、第三号の 13 欄にも入る', () => {
    const v = formValuesFromVolume(block(5), PROJECT)
    expect(v['F3-2-13.階数（地上）']).toEqual({ value: '5', from: 'ボリューム' })
    expect(v['F3-2-13.構造']).toEqual({ value: '鉄筋コンクリート', from: '案件' })
  })

  it('TV1: 用途地域が決まらないときは、用途地域等の欄は入らない', () => {
    const v = formValuesFromVolume(block(5), { ...PROJECT, zoneName: undefined })
    expect(v['F3-2-07.用途地域等']).toBeUndefined()
    expect(v['F2-3-07.用途地域等']).toBeUndefined()
  })
})
