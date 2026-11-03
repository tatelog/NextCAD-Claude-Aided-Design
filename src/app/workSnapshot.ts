// 作業履歴の状態（G68 の復元。仮置き）。線・階数・階高・什器を文字列にして、作業ログの行に付ける。
// 戻すときは、読み込みと同じ経路（applyLoadedProject）を使う。案件名は戻さない（今の名前のまま）。
import { applyLoadedProject, parseSaveData } from './loadData'
import type { Fixture } from '../plan/fixtures'

export interface SnapshotState {
  entries: readonly unknown[]
  storeyCount: number
  storeyHeightMm: number
  fixtures: readonly Fixture[]
}

export interface ParsedSnapshot {
  entries: ReturnType<typeof parseSaveData>['entries']
  storeyCount: number
  storeyHeightMm: number
  fixtures: Fixture[]
}

/** 状態を文字列にする */
export function snapshotJson(state: SnapshotState): string {
  return JSON.stringify({
    entries: state.entries,
    storeyCount: state.storeyCount,
    storeyHeightMm: state.storeyHeightMm,
    fixtures: state.fixtures,
  })
}

/** 文字列の状態を読む。壊れていれば例外（形が違うものも同じ） */
export function parseSnapshot(json: string): ParsedSnapshot {
  const d = JSON.parse(json) as Record<string, unknown>
  const p = parseSaveData({
    projectName: '',
    savedAt: new Date(0).toISOString(),
    entries: d.entries,
    storeyCount: d.storeyCount,
    storeyHeightMm: d.storeyHeightMm,
    fixtures: d.fixtures ?? [],
  })
  return { entries: p.entries, storeyCount: p.storeyCount, storeyHeightMm: p.storeyHeightMm, fixtures: p.fixtures }
}

/** 線が変わったときの作業ログの行（線の本数、前→後、その時点の状態。誰は代表） */
export function lineChangeEntry(
  state: SnapshotState,
  at: string,
  prevCount?: number,
): { at: string; screen: string; action: string; target: string; snapshot: string; change: string; who: string } {
  const change = prevCount === undefined ? '' : `${prevCount} 本 → ${state.entries.length} 本`
  return { at, screen: 'P2', action: '線の変更', target: `線 ${state.entries.length} 本`, snapshot: snapshotJson(state), change, who: '代表' }
}

/** 文字列の状態を画面に戻す。案件名は、いまの名前のまま */
export function restoreSnapshotJson(json: string, projectName: string): void {
  const p = parseSnapshot(json)
  applyLoadedProject({ ...p, projectName, savedAt: new Date() })
}
