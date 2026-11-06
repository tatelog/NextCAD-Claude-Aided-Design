// 共通ヘッダーのアイコン（代表の依頼 2026-11-06。文字を消して SVG だけにする）。部品は足さず、自前の線画（16×16、線の色は currentColor）。
// 読み上げはボタンの aria-label と title が受けるので、アイコンは aria-hidden にする。

const svgProps = { width: 16, height: 16, viewBox: '0 0 16 16', 'aria-hidden': true, focusable: false, style: { display: 'block' } } as const
const stroke = { stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round', fill: 'none' } as const

/** 意味づけを判定（きらめき） */
export function IconJudge() {
  return (
    <svg {...svgProps}>
      <path d="M8 2 L9.3 6.7 L14 8 L9.3 9.3 L8 14 L6.7 9.3 L2 8 L6.7 6.7 Z" {...stroke} />
    </svg>
  )
}

/** 読み込み（箱へ入ってくる矢印） */
export function IconLoad() {
  return (
    <svg {...svgProps}>
      <path d="M8 2 V10 M5 7 L8 10 L11 7 M3 13 H13" {...stroke} />
    </svg>
  )
}

/** 保存（フロッピー） */
export function IconSave() {
  return (
    <svg {...svgProps}>
      <path d="M3 2 H11 L13.5 4.5 V14 H3 Z M5.5 2 V6 H10 V2 M5.5 14 V10 H10.5 V14" {...stroke} />
    </svg>
  )
}

/** 作業履歴（時計） */
export function IconHistory() {
  return (
    <svg {...svgProps}>
      <circle cx="8" cy="8" r="6" {...stroke} />
      <path d="M8 4.5 V8 L10.5 9.5" {...stroke} />
    </svg>
  )
}

/** メニュー（☰） */
export function IconMenu() {
  return (
    <svg {...svgProps}>
      <path d="M2 4 H14 M2 8 H14 M2 12 H14" {...stroke} />
    </svg>
  )
}

/** モード System（つまみ付きの線） */
export function IconModeSystem() {
  return (
    <svg {...svgProps}>
      <path d="M2 4 H14 M2 8 H14 M2 12 H14" {...stroke} />
      <circle cx="5" cy="4" r="1.6" fill="currentColor" />
      <circle cx="11" cy="8" r="1.6" fill="currentColor" />
      <circle cx="6" cy="12" r="1.6" fill="currentColor" />
    </svg>
  )
}

/** モード Chat（吹き出し） */
export function IconModeChat() {
  return (
    <svg {...svgProps}>
      <path d="M2.5 3.5 H13.5 V10.5 H7 L4 13 V10.5 H2.5 Z" {...stroke} />
    </svg>
  )
}

/** モード Drawing（鉛筆） */
export function IconModeDrawing() {
  return (
    <svg {...svgProps}>
      <path d="M10.5 2.5 L13.5 5.5 L6 13 H3 V10 Z M9 4 L12 7" {...stroke} />
    </svg>
  )
}

/** 保留（受け箱） */
export function IconPending() {
  return (
    <svg {...svgProps}>
      <path d="M2.5 9 L4 3.5 H12 L13.5 9 V13 H2.5 Z M2.5 9 H5.5 L6.5 10.5 H9.5 L10.5 9 H13.5" {...stroke} />
    </svg>
  )
}
