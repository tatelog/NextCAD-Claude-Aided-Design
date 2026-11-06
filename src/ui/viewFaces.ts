// ビューキューブの六面（D-04 共通部品「3D への切替」、A-03 G51）。three の座標: x 右、y 上、z 手前。
import { z } from 'zod'

export const FACES = ['top', 'bottom', 'front', 'back', 'left', 'right'] as const
export type Face = (typeof FACES)[number]

export function cameraForFace(face: Face, distance: number): { x: number; y: number; z: number } {
  const d = z.number().positive().parse(distance)
  switch (face) {
    case 'top':
      return { x: 0, y: d, z: 0 }
    case 'bottom':
      return { x: 0, y: -d, z: 0 }
    // 正面は南（−z）から北を見る向き。背面は北（+z）から南を見る向き（代表の依頼 2026-11-06。3）
    case 'front':
      return { x: 0, y: 0, z: -d }
    case 'back':
      return { x: 0, y: 0, z: d }
    case 'right':
      return { x: d, y: 0, z: 0 }
    case 'left':
      return { x: -d, y: 0, z: 0 }
  }
}
