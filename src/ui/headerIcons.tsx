// 共通ヘッダーのアイコン（代表の依頼 2026-11-06。文字を消して SVG だけにする）。ボリューム画面の表示の切り替え（地図・周辺建物・影）も使う。部品は足さず、自前の線画（16×16、線の色は currentColor）。
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

/** 地図（折りたたんだ地図）。ボリューム画面の表示の切り替え（代表の依頼 2026-11-06。1） */
export function IconMap() {
  return (
    <svg {...svgProps}>
      <path d="M2 4 L6 2.5 L10 4 L14 2.5 V12 L10 13.5 L6 12 L2 13.5 Z M6 2.5 V12 M10 4 V13.5" {...stroke} />
    </svg>
  )
}

/** 周辺建物（低い建物と高い建物） */
export function IconBuildings() {
  return (
    <svg {...svgProps}>
      <path d="M2 14 V7 H7 V14 M7 14 V3 H14 V14 M2 14 H14" {...stroke} />
    </svg>
  )
}

/** 斜線の面（斜めに立ち上がる面。下の辺と斜めの線で囲む） */
export function IconSlope() {
  return (
    <svg {...svgProps}>
      <path d="M2.5 13.5 H13.5 M2.5 13.5 L13.5 4 V13.5 Z" {...stroke} />
      <path d="M2.5 13.5 L13.5 4 V13.5 Z" fill="currentColor" stroke="none" opacity="0.35" />
    </svg>
  )
}

/** 影（四角の下半分を塗る） */
export function IconShadow() {
  return (
    <svg {...svgProps}>
      <path d="M3 3 H13 V13 H3 Z" {...stroke} />
      <path d="M3 8 H13 V13 H3 Z" fill="currentColor" stroke="none" opacity="0.55" />
    </svg>
  )
}
