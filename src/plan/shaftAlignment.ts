// 縦シャフトは上下階で位置が一致することを検査する（統括の決定 G56）。決定論。
// 同じ id の縦シャフトが、基準の階（0 階）と同じ位置・寸法にあるかを見る。並びの順は問わない。

export interface ShaftPlace {
  id: string
  x0: number
  y0: number
  x1: number
  y1: number
}

export interface AlignmentResult {
  aligned: boolean
  /** 基準の階（0 階）と違う階の番号（0 始まり） */
  mismatchedFloors: number[]
}

const keyOf = (s: ShaftPlace): string => `${s.id}|${s.x0}|${s.y0}|${s.x1}|${s.y1}`

/** 各階の縦シャフトが、基準の階と一致するか。階が 0 か 1 つだけなら一致 */
export function checkShaftAlignment(floors: readonly (readonly ShaftPlace[])[]): AlignmentResult {
  if (floors.length <= 1) return { aligned: true, mismatchedFloors: [] }
  const base = floors[0]!.map(keyOf).sort()
  const mismatchedFloors: number[] = []
  for (let f = 1; f < floors.length; f++) {
    const here = floors[f]!.map(keyOf).sort()
    const same = here.length === base.length && here.every((k, i) => k === base[i])
    if (!same) mismatchedFloors.push(f)
  }
  return { aligned: mismatchedFloors.length === 0, mismatchedFloors }
}
