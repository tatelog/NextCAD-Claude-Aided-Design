// P03 ボリューム作図（描く）。D-04 v7 の一枚目: 直線モード、閉合、階数・階高、押し出し。
// 斜線・日影・段状の切り取り・自動案・3D は次の一枚。
import { useMemo, useState } from 'react'
import { findClosedOutline } from '../canvas/closure'
import { extrudeVolume } from '../volume/extrude'
import { useDrawing } from '../store/drawing'
import { DrawingCanvas } from './DrawingCanvas'
import { Volume3D } from './Volume3D'

const m2 = (mm2: number) => (mm2 / 1_000_000).toLocaleString('ja-JP', { maximumFractionDigits: 2 })

export function P03Volume() {
  const entries = useDrawing((s) => s.entries)
  const segments = useMemo(() => entries.flatMap((e) => e.segments), [entries])
  const closure = useMemo(() => findClosedOutline(segments), [segments])
  const storeyCount = useDrawing((s) => s.storeyCount)
  const storeyHeightMm = useDrawing((s) => s.storeyHeightMm)
  const setStoreyCount = useDrawing((s) => s.setStoreyCount)
  const setStoreyHeightMm = useDrawing((s) => s.setStoreyHeightMm)
  const undo = useDrawing((s) => s.undo)
  const redo = useDrawing((s) => s.redo)
  const clear = useDrawing((s) => s.clear)
  const canUndo = useDrawing((s) => s.entries.length > 0)
  const canRedo = useDrawing((s) => s.redoStack.length > 0)
  const [view, setView] = useState<'plan' | '3d'>('plan')
  const [homeToken, setHomeToken] = useState(0)

  const volume = useMemo(() => {
    if (!closure.closed) return null
    try {
      return extrudeVolume({ footprint: closure.footprint, storey_count: storeyCount, storey_height: storeyHeightMm })
    } catch {
      return null
    }
  }, [closure, storeyCount, storeyHeightMm])

  const closureLabel = closure.closed
    ? '閉じている'
    : closure.reason === 'empty'
      ? 'まだ線が無い'
      : closure.reason === 'open'
        ? '閉じていない（端点がつながっていない）'
        : closure.reason === 'branch'
          ? '閉じていない（枝が出ている）'
          : '閉じていない（複数の輪）'

  return (
    <div className="p03">
      <header className="p03-toolbar">
        <strong>P03 ボリューム作図</strong>
        <span className="p03-mode">
          ペンのモード:
          <button type="button" className="is-active" aria-pressed="true">
            直線
          </button>
          <button type="button" disabled title="曲線モードの操作は未決（D-04 未決の一覧）">
            曲線
          </button>
        </span>
        <span className="p03-mode">
          表示:
          <button type="button" className={view === 'plan' ? 'is-active' : undefined} aria-pressed={view === 'plan'} onClick={() => setView('plan')}>
            平面
          </button>
          <button type="button" className={view === '3d' ? 'is-active' : undefined} aria-pressed={view === '3d'} onClick={() => setView('3d')}>
            3D
          </button>
          {view === '3d' && (
            <button type="button" onClick={() => setHomeToken((n) => n + 1)} title="既定の向きに戻す">
              ホーム
            </button>
          )}
        </span>
        <span className="p03-actions">
          <button type="button" onClick={undo} disabled={!canUndo}>
            Undo
          </button>
          <button type="button" onClick={redo} disabled={!canRedo}>
            Redo
          </button>
          <button type="button" onClick={clear} disabled={segments.length === 0}>
            全部消す
          </button>
        </span>
        <span className="p03-note">議論用・未確定。筆界はダミー（20 m × 30 m）。指・マウス・ペンのどれでも描ける。2本指でパン・ズーム。</span>
      </header>
      <div className="p03-body">
        {view === '3d' ? (
          volume ? (
            <div style={{ flex: 1, minWidth: 0, minHeight: 420 }}>
              <Volume3D
                footprint={volume.footprint}
                storeyCount={storeyCount}
                storeyHeightMm={storeyHeightMm}
                homeToken={homeToken}
              />
            </div>
          ) : (
            <div style={{ flex: 1, minWidth: 0, minHeight: 420, display: 'grid', placeItems: 'center' }}>
              <p className="muted">外形が閉じると 3D が出る</p>
            </div>
          )
        ) : (
          <DrawingCanvas />
        )}
        <aside className="p03-side">
          <section>
            <h2>外形</h2>
            <dl>
              <dt>線分</dt>
              <dd>{segments.length} 本</dd>
              <dt>閉合</dt>
              <dd className={closure.closed ? 'ok' : 'ng'}>{closureLabel}</dd>
            </dl>
          </section>
          <section>
            <h2>階数・階高</h2>
            <label>
              階数
              <input
                type="number"
                min={1}
                step={1}
                value={storeyCount}
                onChange={(e) => setStoreyCount(Math.max(1, Math.floor(Number(e.target.value) || 1)))}
              />
            </label>
            <label>
              階高 (mm)
              <input
                type="number"
                min={1}
                step={100}
                value={storeyHeightMm}
                onChange={(e) => setStoreyHeightMm(Math.max(1, Math.floor(Number(e.target.value) || 1)))}
              />
            </label>
          </section>
          <section>
            <h2>ボリューム</h2>
            {volume ? (
              <dl>
                <dt>高さ</dt>
                <dd>{volume.total_height.toLocaleString('ja-JP')} mm</dd>
                <dt>建築面積</dt>
                <dd>{m2(volume.building_area_mm2)} m²</dd>
                <dt>延床面積</dt>
                <dd>{m2(volume.gross_floor_area_mm2)} m²</dd>
              </dl>
            ) : (
              <p className="muted">外形が閉じると出る</p>
            )}
            <p className="muted">斜線・日影・段状の切り取り（G27）は次の一枚</p>
          </section>
          <section>
            <button type="button" disabled={!volume} title="P04 柱割り作図はまだ無い">
              確定して P04 へ
            </button>
          </section>
        </aside>
      </div>
    </div>
  )
}
