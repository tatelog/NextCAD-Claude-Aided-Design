// P03 ボリューム作図（描く）。D-04 v7 の一枚目: 直線モード、閉合、階数・階高、押し出し。
// 斜線・日影・段状の切り取り・自動案・3D は次の一枚。
import { useMemo, useState } from 'react'
import { findClosedOutline } from '../canvas/closure'
import { extrudeVolume } from '../volume/extrude'
import { volumeAfterSlope } from '../volume/cutVolume'
import { legalBoundaries } from '../volume/legalSlope'
import { siteRuleFromDistricts } from '../law/siteRule'
import { useSite } from '../store/site'
import type { Zone } from '../law/slopeRules'
import { judgeFar } from '../volume/farCheck'
import { useDrawing } from '../store/drawing'
import { DrawingCanvas } from './DrawingCanvas'
import { Volume3D } from './Volume3D'

const m2 = (mm2: number) => (mm2 / 1_000_000).toLocaleString('ja-JP', { maximumFractionDigits: 2 })
const DUMMY_PARCEL_MM2 = 20_000 * 30_000
// 筆界のダミー（反時計回り。辺 0 は下の辺）。P1 の筆界が入るまでの仮の敷地
const DUMMY_PARCEL = [
  { x: 0, y: 0 },
  { x: 20_000, y: 0 },
  { x: 20_000, y: 30_000 },
  { x: 0, y: 30_000 },
]
const ZONES: Zone[] = ['低層住専', '田園住居', '中高層住専', '住居系', '商業系', '準工・工業系', '高層住居誘導', '指定なし']

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

  const [farLimit, setFarLimit] = useState('')
  const [zone, setZone] = useState<Zone>('住居系')
  const [roadEdge, setRoadEdge] = useState(0)
  const [roadWidth, setRoadWidth] = useState('6000')

  const volume = useMemo(() => {
    if (!closure.closed) return null
    try {
      return extrudeVolume({ footprint: closure.footprint, storey_count: storeyCount, storey_height: storeyHeightMm })
    } catch {
      return null
    }
  }, [closure, storeyCount, storeyHeightMm])

  // 法定の斜線を、筆界（ダミー 20 m × 30 m）の辺に当てて切り取る。前面道路の辺・幅員・用途地域・容積率の限度は利用者が入れる
  // P1 で用途地域が一つに決まっていれば、その区分と容積率の限度を使う（PLATEAU）。無ければ利用者の入力
  const siteMatches = useSite((s) => s.matches)
  const siteRule = useMemo(() => (siteMatches ? siteRuleFromDistricts(siteMatches) : null), [siteMatches])
  const effectiveZone = siteRule?.zone ?? zone
  const inputFar = farLimit === '' ? null : Number(farLimit)
  const effectiveFar = siteRule?.farPercent ?? inputFar

  const legal = useMemo(() => {
    if (effectiveFar === null || !Number.isFinite(effectiveFar) || effectiveFar <= 0) {
      return { boundaries: [], pending: ['容積率の限度（上限）が未入力'] }
    }
    return legalBoundaries({
      footprint: DUMMY_PARCEL,
      roadEdgeIndex: roadEdge,
      roadWidthMm: Number(roadWidth) || 0,
      zone: effectiveZone,
      farPercent: effectiveFar,
    })
  }, [effectiveFar, effectiveZone, roadEdge, roadWidth])

  const cut = useMemo(() => {
    if (!volume) return null
    return volumeAfterSlope(
      { footprint: volume.footprint, storey_count: volume.storey_count, storey_height: volume.storey_height },
      legal.boundaries,
      DUMMY_PARCEL_MM2,
    )
  }, [volume, legal])

  const farJudgement = cut ? judgeFar(cut.floor_area_ratio, farLimit === '' ? undefined : Number(farLimit)) : '—'

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
            {volume && cut ? (
              <dl>
                <dt>高さ</dt>
                <dd>{volume.total_height.toLocaleString('ja-JP')} mm</dd>
                <dt>建築面積</dt>
                <dd>{m2(cut.building_area_mm2)} m²</dd>
                <dt>延床面積</dt>
                <dd>{m2(cut.gross_floor_area_mm2)} m²</dd>
                <dt>容積率</dt>
                <dd>
                  {(cut.floor_area_ratio * 100).toFixed(0)} %（{farJudgement}）
                </dd>
              </dl>
            ) : (
              <p className="muted">外形が閉じると出る</p>
            )}
            <label>
              容積率の上限 (%)
              <input type="number" min={1} step={10} value={farLimit} placeholder="未入力（判定不能）" onChange={(e) => setFarLimit(e.target.value)} />
            </label>
            {siteRule ? (
              <p className="muted">
                PLATEAU（P1 で取得）から: 区分 {siteRule.zone}、容積率の限度 {siteRule.farPercent === null ? '未取得' : `${siteRule.farPercent} %`}
              </p>
            ) : (
              <p className="muted">PLATEAU の用途地域が一つに決まらない（P1 で取得していない、または複数）。下の入力を使う。</p>
            )}
            <label>
              用途地域
              <select value={zone} onChange={(e) => setZone(e.target.value as Zone)}>
                {ZONES.map((z) => (
                  <option key={z} value={z}>
                    {z}
                  </option>
                ))}
              </select>
            </label>
            <label>
              前面道路の辺（0〜3）
              <input type="number" min={0} max={3} value={roadEdge} onChange={(e) => setRoadEdge(Math.min(3, Math.max(0, Math.floor(Number(e.target.value) || 0))))} />
            </label>
            <label>
              前面道路の幅員 (mm)
              <input type="number" min={1} step={500} value={roadWidth} onChange={(e) => setRoadWidth(e.target.value)} />
            </label>
            {legal.pending.length > 0 && <p className="muted">判定不能（切り取らない）: {legal.pending.join('、')}</p>}
            <p className="muted">斜線は法定の値（建築基準法 第56条・別表第三）を筆界（ダミー 20 m × 30 m）に当てて切る。日影は未適用（条例の値の確認が要る）。北側は真北の配線が未実装。</p>
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
