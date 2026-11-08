// 練習セットの画面（ハブ A-03 G11。代表の決定 2026-11-04）。P1〜P5 とは別の入口。収集の 39 案から 1 案を出題し、その上をなぞって描き、正解と照合して記録する。
// 素材（public/practice/index.json と案の SVG・JSON）は草案・未確定（収集セッションの報告で合わせる）。素材が無ければ「未配置」と出す。
// 練習の線は作業ログ（T-06）に残さず、Claude の意味づけ（W1）も呼ばない。
import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { pickPracticeCase } from '../practice/caseSelect'
import type { PracticeCase } from '../practice/caseTruth'
import { practiceCaseOfPlan, type PlanJson } from '../practice/planCase'
import { scoreDrawing, type PxStroke } from '../practice/practiceFlow'
import { recordsToJson, type PracticeRecord } from '../practice/resultRecord'

/** 素材の一覧（草案）: public/practice/index.json に [{ "id", "svg", "json" }, …] */
interface PracticeEntry {
  id: string
  svg: string
  json: string
}

/** 表示の幅（px）。SVG と描いた線は、この幅を基準にする */
const VIEW_PX = 600

export function PracticeScreen() {
  const [entries, setEntries] = useState<PracticeEntry[] | null>(null)
  const [status, setStatus] = useState<string>('素材を読んでいます…')
  const [current, setCurrent] = useState<{ entry: PracticeEntry; data: PracticeCase } | null>(null)
  const [strokes, setStrokes] = useState<PxStroke[]>([])
  const [score, setScore] = useState<PracticeRecord | null>(null)
  const [records, setRecords] = useState<PracticeRecord[]>([])
  const boxRef = useRef<HTMLDivElement>(null)
  const dragStart = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    fetch('/practice/index.json')
      .then((r) => (r.ok ? (r.json() as Promise<PracticeEntry[]>) : Promise.reject(new Error(String(r.status)))))
      .then((list) => {
        setEntries(list)
        setStatus(list.length > 0 ? `${list.length} 案から出題できます` : '素材が空です')
      })
      .catch(() => {
        setEntries(null)
        setStatus('素材が未配置です（public/practice/ に案を置くと出題できます）')
      })
  }, [])

  const pick = async () => {
    if (!entries || entries.length === 0) return
    const entry = pickPracticeCase(entries, Math.random)
    try {
      // 素材の JSON は収集セッションの形（envelope・rooms）。練習の案に直してから使う（planCase）
      const plan = (await fetch(`/practice/${entry.json}`).then((r) => r.json())) as PlanJson
      const data: PracticeCase = practiceCaseOfPlan(plan)
      setCurrent({ entry, data })
      setStrokes([])
      setScore(null)
    } catch {
      setStatus('案の読み込みに失敗しました')
    }
  }

  const pointAt = (e: PointerEvent<HTMLDivElement>) => {
    const rect = boxRef.current?.getBoundingClientRect()
    return rect ? { x: e.clientX - rect.left, y: e.clientY - rect.top } : { x: 0, y: 0 }
  }
  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    dragStart.current = pointAt(e)
  }
  const onUp = (e: PointerEvent<HTMLDivElement>) => {
    const a = dragStart.current
    dragStart.current = null
    if (!a) return
    const b = pointAt(e)
    setStrokes((s) => [...s, { a, b }])
  }

  const runScore = () => {
    if (!current) return
    setScore(scoreDrawing(current.data, strokes, VIEW_PX))
  }
  const keepScore = () => {
    if (score) setRecords((r) => [...r, score])
  }
  const exportJson = () => {
    const blob = new Blob([recordsToJson(records)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'practice-records.json'
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <div style={{ padding: 16, overflow: 'auto', height: '100%', boxSizing: 'border-box' }}>
      <h2 style={{ fontSize: 16, margin: '0 0 8px' }}>練習セット</h2>
      <p style={{ fontSize: 12, color: '#666', margin: '0 0 8px' }}>{status}</p>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
        <button type="button" onClick={pick} disabled={!entries || entries.length === 0}>
          出題する
        </button>
        <button type="button" onClick={() => setStrokes([])} disabled={strokes.length === 0}>
          描いた線を消す
        </button>
        <button type="button" onClick={runScore} disabled={!current || strokes.length === 0}>
          照合する
        </button>
        <button type="button" onClick={keepScore} disabled={!score}>
          記録に追加
        </button>
        <button type="button" onClick={exportJson} disabled={records.length === 0}>
          記録を書き出す（{records.length} 件）
        </button>
      </div>
      {score ? (
        <p style={{ fontSize: 13 }}>
          案 {score.caseId}：再現率 {score.recall.toFixed(2)}、適合率 {score.precision.toFixed(2)}（許容差 {score.tolMm} mm、正解 {score.truthCount} 本、描いた {score.drawnCount} 本）
        </p>
      ) : null}
      {current ? (
        <div
          ref={boxRef}
          onPointerDown={onDown}
          onPointerUp={onUp}
          style={{ position: 'relative', width: VIEW_PX, border: '1px solid #ddd8cc', background: '#fff', touchAction: 'none', cursor: 'crosshair' }}
        >
          <img src={`/practice/${current.entry.svg}`} alt="" width={VIEW_PX} draggable={false} style={{ display: 'block', userSelect: 'none' }} />
          <svg width={VIEW_PX} height="100%" style={{ position: 'absolute', left: 0, top: 0, pointerEvents: 'none', height: '100%' }}>
            {strokes.map((s, i) => (
              <line key={i} x1={s.a.x} y1={s.a.y} x2={s.b.x} y2={s.b.y} stroke="#c44" strokeWidth={3} strokeLinecap="round" />
            ))}
          </svg>
        </div>
      ) : null}
    </div>
  )
}
