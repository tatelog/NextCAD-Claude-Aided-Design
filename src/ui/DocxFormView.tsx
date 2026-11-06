// 記入した様式（第二号・第三号の docx）を、ページごとに画面へ描く（統括の依頼 2026-11-06。代表承認）。
// 描けないときは、渡された一覧の中身（fallback）に戻す。描画の中身は docx-preview に任せる。
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { renderAsync } from 'docx-preview'
import { renderFailureTextOf } from './permitFormPreview'

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

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
  const styleRef = useRef<HTMLDivElement>(null)
  const [failure, setFailure] = useState<string | null>(null)

  useEffect(() => {
    const body = bodyRef.current
    const styleHost = styleRef.current
    if (body === null || styleHost === null) return
    let cancelled = false
    setFailure(null)
    // いったん隠れた入れ物に描き、終わってから画面へ移す（描画が重なって二重に出るのを防ぐ）
    const holder = document.createElement('div')
    const styles = document.createElement('div')
    renderAsync(new Blob([bytes as BlobPart], { type: DOCX_MIME }), holder, styles)
      .then(() => {
        if (cancelled) return
        styleHost.replaceChildren(...Array.from(styles.childNodes))
        body.replaceChildren(...Array.from(holder.childNodes))
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
        <p style={{ fontSize: 12, color: '#444', margin: '0 0 4px' }}>{`${fileName}（記入した様式を、ページごとに出す）`}</p>
      )}
      <div ref={bodyRef} style={{ display: failure === null ? 'block' : 'none', maxHeight: '75vh', overflow: 'auto' }} />
    </div>
  )
}
