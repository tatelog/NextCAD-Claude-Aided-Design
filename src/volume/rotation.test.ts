// ボリューム（建物）の回転（ハブ A-03 G71）の仕様テスト。仕様だけから書く。
//
// 仕様（代表の決定）: 「ボリューム（建物）を回転する機能を付ける。回すと建物の回転角が変わり、斜線・日影を計算し直す。」
// 画面案（D-04 P2）: 右パネルに回転角（°）と刻み（自由・15°・90°）。カメラの回転とは別。
//
// 今回の仮置き（これを 1 項目ずつテストにしている。回す処理そのものは outlineEdit.test.ts）:
//  1. 角度は入力欄（°）と刻みの選択（自由・15°・90°）。刻みが 15° か 90° のときは、入力された角度をその刻みに丸める
//  2. 回転の中心は外形の重心
//  3. 回した結果の頂点は、mm の整数に丸める（座標は整数 mm のまま）
import { describe, expect, it } from 'vitest'
import { ROTATION_STEPS, outlineCentroid, roundFootprintMm, snapAngle } from './rotation'

type Pt = { x: number; y: number }

describe('回転の刻み: 入力された角度を刻みに丸める', () => {
  it('刻みの選択肢は 自由・15°・90°', () => {
    expect(ROTATION_STEPS).toEqual(['free', 15, 90])
  })

  it('刻みを 15° にすると、入力 17° は 15° に丸まる', () => {
    expect(snapAngle(17, 15)).toBe(15)
  })

  it('15° の刻みは最寄りの 15° の倍数に丸める（22° は 15°、23° は 30°、負の角度も同じ）', () => {
    expect(snapAngle(22, 15)).toBe(15)
    expect(snapAngle(23, 15)).toBe(30)
    expect(snapAngle(-17, 15)).toBe(-15)
    expect(snapAngle(-23, 15)).toBe(-30)
    expect(snapAngle(15, 15)).toBe(15)
  })

  it('90° の刻みは最寄りの 90° の倍数に丸める（44° は 0°、50° は 90°、-50° は -90°、200° は 180°）', () => {
    expect(snapAngle(44, 90)).toBe(0)
    expect(snapAngle(50, 90)).toBe(90)
    expect(snapAngle(-50, 90)).toBe(-90)
    expect(snapAngle(200, 90)).toBe(180)
  })

  it('刻みが自由のときは丸めない', () => {
    expect(snapAngle(17.3, 'free')).toBe(17.3)
    expect(snapAngle(-45.5, 'free')).toBe(-45.5)
    expect(snapAngle(0, 'free')).toBe(0)
  })

  it('0° に丸まるときも -0 にならない', () => {
    expect(snapAngle(-10, 90)).toBe(0)
    expect(snapAngle(-3, 15)).toBe(0)
  })

  it('数でない入力（NaN・無限大）は 0° として扱う', () => {
    expect(snapAngle(Number.NaN, 15)).toBe(0)
    expect(snapAngle(Number.NaN, 'free')).toBe(0)
    expect(snapAngle(Number.POSITIVE_INFINITY, 90)).toBe(0)
  })
})

describe('回転の中心: 外形の重心', () => {
  it('長方形の重心は、その中心', () => {
    const rect: Pt[] = [
      { x: 1000, y: 2000 },
      { x: 5000, y: 2000 },
      { x: 5000, y: 5000 },
      { x: 1000, y: 5000 },
    ]
    expect(outlineCentroid(rect)).toEqual({ x: 3000, y: 3500 })
  })

  it('凹んだ外形（L 字）の重心は面積の重心で、頂点の平均や外接する四角の中心とは違う', () => {
    // 6000 x 2000 と 2000 x 4000 の二つの長方形をあわせた形。面積 20,000,000 mm²。
    // 重心は ((12e6 * 3000 + 8e6 * 1000) / 20e6, (12e6 * 1000 + 8e6 * 4000) / 20e6) = (2200, 2200)
    const l: Pt[] = [
      { x: 0, y: 0 },
      { x: 6000, y: 0 },
      { x: 6000, y: 2000 },
      { x: 2000, y: 2000 },
      { x: 2000, y: 6000 },
      { x: 0, y: 6000 },
    ]
    const c = outlineCentroid(l)
    expect(c?.x).toBeCloseTo(2200, 6)
    expect(c?.y).toBeCloseTo(2200, 6)
  })

  it('頂点の回り方（時計回り・反時計回り）によらない', () => {
    const l: Pt[] = [
      { x: 0, y: 0 },
      { x: 6000, y: 0 },
      { x: 6000, y: 2000 },
      { x: 2000, y: 2000 },
      { x: 2000, y: 6000 },
      { x: 0, y: 6000 },
    ]
    const c = outlineCentroid([...l].reverse())
    expect(c?.x).toBeCloseTo(2200, 6)
    expect(c?.y).toBeCloseTo(2200, 6)
  })

  it('面積が 0（一直線に並ぶ）ときは、頂点の平均', () => {
    expect(
      outlineCentroid([
        { x: 0, y: 0 },
        { x: 1000, y: 0 },
        { x: 2000, y: 0 },
      ]),
    ).toEqual({ x: 1000, y: 0 })
  })

  it('頂点が無ければ null', () => {
    expect(outlineCentroid([])).toBeNull()
  })
})

describe('座標を整数 mm に丸める', () => {
  it('四捨五入して整数 mm にする。-0 は 0 にそろえる', () => {
    expect(
      roundFootprintMm([
        { x: 1.4, y: -2.6 },
        { x: -0.4, y: 2.5 },
        { x: 4000, y: 3000 },
      ]),
    ).toEqual([
      { x: 1, y: -3 },
      { x: 0, y: 3 },
      { x: 4000, y: 3000 },
    ])
  })

  it('入力は書き換えない', () => {
    const fp: Pt[] = [{ x: 1.4, y: 2.6 }]
    roundFootprintMm(fp)
    expect(fp).toEqual([{ x: 1.4, y: 2.6 }])
  })
})
