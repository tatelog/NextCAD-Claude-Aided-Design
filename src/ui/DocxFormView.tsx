// 記入した様式（第二号・第三号の docx）を、ページごとに画面へ描く（統括の依頼 2026-11-06。代表承認）。
// 描けないときは、渡された一覧の中身（fallback）に戻す。描画の中身は docx-preview に任せる。
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { renderAsync } from 'docx-preview'
import { FORM_PAGE_NOTE, fitZoomOf, renderFailureTextOf } from './permitFormPreview'

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

/** 描いた面の幅（余白を含む）。倍率が 1 のときに測る（縮めた後に測ると正しい幅にならない） */
function naturalWidthOf(sheet: HTMLElement): number {
  const pageWidth = Math.max(0, ...Array.from(sheet.querySelectorAll<HTMLElement>('section.docx'), (s) => s.offsetWidth))
  const wrapper = sheet.querySelector<HTMLElement>('.docx-wrapper')
  const style = wrapper === null ? null : getComputedStyle(wrapper)
  const pad = style === null ? 0 : parseFloat(style.paddingLeft) + parseFloat(style.paddingRight)
  return pageWidth + (Number.isFinite(pad) ? pad : 0)
}

export interface DocxFormViewProps {
  /** 記入した docx のファイル名（画面の上に出す） */
  fileName: string
  /** 記入した docx のバイト列（変えずに描く） */
  bytes: Uint8Array
  /** 描けなかったときに出す、一覧の中身 */
  fallback: ReactNode
}

export function DocxFormView({ fileName, bytes, fallback }: DocxFormViewProps) {
  const bodyRef = useRef<HTMLDivElement>(null)
  const sheetRef = useRef<HTMLDivElement>(null)
  const styleRef = useRef<HTMLDivElement>(null)
  const naturalRef = useRef(0)
  const [failure, setFailure] = useState<string | null>(null)

  // 表示の箱（縦にスクロールする枠）の内側の幅に合わせて、描いた面を縮める
  const fit = () => {
    const body = bodyRef.current
    const sheet = sheetRef.current
    if (body === null || sheet === null) return
    sheet.style.setProperty('zoom', String(fitZoomOf(body.clientWidth, naturalRef.current)))
  }

  // 箱の幅が変わったら（ウィンドウの大きさ・ペインの幅・縦のスクロールバーの出入り）、描いた面をまた合わせる
  useEffect(() => {
    const body = bodyRef.current
    if (body === null || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(() => fit())
    observer.observe(body)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const body = bodyRef.current
    const sheet = sheetRef.current
    const styleHost = styleRef.current
    if (body === null || sheet === null || styleHost === null) return
    let cancelled = false
    setFailure(null)
    // いったん隠れた入れ物に描き、終わってから画面へ移す（描画が重なって二重に出るのを防ぐ）
    const holder = document.createElement('div')
    const styles = document.createElement('div')
    renderAsync(new Blob([bytes as BlobPart], { type: DOCX_MIME }), holder, styles)
      .then(() => {
        if (cancelled) return
        styleHost.replaceChildren(...Array.from(styles.childNodes))
        sheet.replaceChildren(...Array.from(holder.childNodes))
        sheet.style.setProperty('zoom', '1')
        naturalRef.current = naturalWidthOf(sheet)
        fit()
      })
      .catch((e: unknown) => {
        if (!cancelled) setFailure(renderFailureTextOf(e))
      })
    return () => {
      cancelled = true
    }
  }, [bytes])

  return (
    <div>
      <div ref={styleRef} hidden />
      {failure !== null ? (
        <>
          {fallback}
          <p style={{ fontSize: 12, color: '#a33' }}>{failure}</p>
        </>
      ) : (
        <>
          <p style={{ fontSize: 12, color: '#444', margin: '0 0 4px' }}>{`${fileName}（記入した様式を、ページごとに出す）`}</p>
          <p style={{ fontSize: 12, color: '#666', margin: '0 0 4px' }}>{FORM_PAGE_NOTE}</p>
        </>
      )}
      <div ref={bodyRef} style={{ display: failure === null ? 'block' : 'none', maxHeight: '75vh', overflowY: 'auto', overflowX: 'hidden' }}>
        <div ref={sheetRef} />
      </div>
    </div>
  )
}
