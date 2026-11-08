// 道具のアイコン（タブレット用）。24 × 24 の線画の SVG。色は currentColor で、ボタンの文字色に合わせる。
import type { CSSProperties } from 'react'

export const TOOL_ICONS = {
  box: ['M3 7 L12 3 L21 7 V17 L12 21 L3 17 Z', 'M3 7 L12 11 L21 7', 'M12 11 V21'],
  cursor: ['M5 3 L19 13 L12 14 L9 21 Z'],
  line: ['M4 20 L20 4'],
  pencil: ['M4 20 L5 15 L16 4 Q17 3 18 4 L20 6 Q21 7 20 8 L9 19 Z', 'M14 6 L18 10', 'M5 15 L9 19'],
  hand: ['M8 12 V6 A1.5 1.5 0 0 1 11 6 V11', 'M11 11 V4 A1.5 1.5 0 0 1 14 4 V11', 'M14 11 V5 A1.5 1.5 0 0 1 17 5 V12', 'M17 12 V8 A1.5 1.5 0 0 1 20 8 V15 C20 19 18 21 14 21 H12 C10 21 9 20 8 19 L3 13 Q2 11 4 10 Q5 10 6 11 L8 13'],
  curve: ['M4 20 C4 8 12 4 20 4'],
  undo: ['M9 14 L4 9 L9 4', 'M4 9 H14 A6 6 0 0 1 14 21 H11'],
  redo: ['M15 14 L20 9 L15 4', 'M20 9 H10 A6 6 0 0 0 10 21 H13'],
  grid: ['M3 9 H21', 'M3 15 H21', 'M9 3 V21', 'M15 3 V21'],
  snap: ['M12 3 V7', 'M12 17 V21', 'M3 12 H7', 'M17 12 H21', 'M12 12 m-2 0 a2 2 0 1 0 4 0 a2 2 0 1 0 -4 0'],
  grip: ['M9 6 h0', 'M9 12 h0', 'M9 18 h0', 'M15 6 h0', 'M15 12 h0', 'M15 18 h0'],
  'place-top': ['M3 4 H21', 'M3 8 H21', 'M3 11 H21'],
  'place-left': ['M4 3 V21', 'M8 3 V21', 'M11 3 V21'],
  'place-free': ['M4 4 H20 V20 H4 Z', 'M12 8 V16', 'M8 12 H16'],
  // 什器（G69）: 洗面台の線画。仮置き（パレットの中身は未決）
  fixture: ['M3 11 H21', 'M5 11 V17 A3 3 0 0 0 8 20 H16 A3 3 0 0 0 19 17 V11', 'M12 7 V11'],
} as const

export const TOOL_ICON_NAMES = Object.keys(TOOL_ICONS) as (keyof typeof TOOL_ICONS)[]

export function ToolIcon({ name, style }: { name: keyof typeof TOOL_ICONS; style?: CSSProperties }) {
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      style={style}
    >
      {TOOL_ICONS[name].map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  )
}
