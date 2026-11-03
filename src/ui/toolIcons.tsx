// 道具のアイコン（タブレット用）。24 × 24 の線画の SVG。色は currentColor で、ボタンの文字色に合わせる。
import type { CSSProperties } from 'react'

export const TOOL_ICONS = {
  line: ['M4 20 L20 4'],
  curve: ['M4 20 C4 8 12 4 20 4'],
  undo: ['M9 14 L4 9 L9 4', 'M4 9 H14 A6 6 0 0 1 14 21 H11'],
  redo: ['M15 14 L20 9 L15 4', 'M20 9 H10 A6 6 0 0 0 10 21 H13'],
  grid: ['M3 9 H21', 'M3 15 H21', 'M9 3 V21', 'M15 3 V21'],
  snap: ['M12 3 V7', 'M12 17 V21', 'M3 12 H7', 'M17 12 H21', 'M12 12 m-2 0 a2 2 0 1 0 4 0 a2 2 0 1 0 -4 0'],
  grip: ['M9 6 h0', 'M9 12 h0', 'M9 18 h0', 'M15 6 h0', 'M15 12 h0', 'M15 18 h0'],
  'place-top': ['M3 4 H21', 'M3 8 H21', 'M3 11 H21'],
  'place-left': ['M4 3 V21', 'M8 3 V21', 'M11 3 V21'],
  'place-free': ['M4 4 H20 V20 H4 Z', 'M12 8 V16', 'M8 12 H16'],
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
