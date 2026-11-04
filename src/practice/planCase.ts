// 収集セッションの案の JSON（外形の左上が原点、部屋は左上 x・y と幅 w・高さ h の mm）を、練習の案（PracticeCase）に直す（ハブ A-03 G11）。決定論。
import type { PracticeCase } from './caseTruth'

export interface PlanRoom {
  id: string
  kind?: string
  x: number
  y: number
  w: number
  h: number
}

export interface PlanJson {
  id: string
  type: string
  envelope: { W: number; D: number; balcony_depth?: number }
  rooms: PlanRoom[]
}

/** 案を練習の案に直す。部屋の枠が間口・奥行の外に出る案は弾く */
export function practiceCaseOfPlan(plan: PlanJson): PracticeCase {
  const { W, D } = plan.envelope
  const rooms = plan.rooms.map((r) => {
    const x1 = r.x + r.w
    const y1 = r.y + r.h
    if (r.x < 0 || r.y < 0 || x1 > W || y1 > D) {
      throw new Error(`部屋 ${r.id} の枠が間口・奥行の外に出ている（${plan.id}）`)
    }
    return { x0: r.x, y0: r.y, x1, y1, ...(r.kind ? { kind: r.kind } : {}) }
  })
  return { id: plan.id, type: plan.type, widthMm: W, depthMm: D, rooms }
}
