// 3D の部分の例外の受け皿（統括の依頼 2026-11-06（急ぎ）。3）。3D が描けなくても、アプリ全体は白くしない。枠の中に理由を出す。
import { Component, type ReactNode } from 'react'

/** 3D の例外の文言（枠の中に出す） */
export function sceneErrorTextOf(e: unknown): string {
  return `3D を描けなかった（${e instanceof Error ? e.message : String(e)}）`
}

interface Props {
  children: ReactNode
}

interface State {
  failed: boolean
  message: string
}

export class SceneErrorBoundary extends Component<Props, State> {
  state: State = { failed: false, message: '' }

  static getDerivedStateFromError(error: unknown): State {
    return { failed: true, message: error instanceof Error ? error.message : String(error) }
  }

  componentDidCatch(error: unknown): void {
    console.error('3D の描画で例外', error)
  }

  render(): ReactNode {
    if (this.state.failed) {
      return (
        <div style={{ flex: 1, minWidth: 0, minHeight: 420, display: 'grid', placeItems: 'center', background: '#f4f4f2' }}>
          <p className="muted">{sceneErrorTextOf(this.state.message)}</p>
        </div>
      )
    }
    return this.props.children
  }
}
