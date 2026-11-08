// 様式の取り込み（統括の依頼 2026-11-06。2-a）。使う人が Word（docx）を選ぶ。中身の見出しで、どの様式かを見分ける。
// 取り込んだものは画面の中だけに持ち、どこへも送らない。
import { useRef, useState } from 'react'
import './PermitFormImport.css'
import { tutorialDone } from '../tutorial/state'
import { readDocx } from '../export/docxRead'
import { FORM_KINDS, FORM_TITLE, formKindOf, type FormKind } from '../law/permitFormKind'
import { usePermitForms } from '../store/permitForms'

export interface PermitFormImportViewProps {
  /** 取り込んだ様式（無ければ未取り込み） */
  forms: Partial<Record<FormKind, { fileName: string }>>
  /** 直前の取り込みの結果の文 */
  message: string | null
  /** 使う人が docx を選んだとき */
  onPick: (file: File) => void
}

export function PermitFormImport() {
  const forms = usePermitForms((s) => s.forms)
  const importForm = usePermitForms((s) => s.importForm)
  const [message, setMessage] = useState<string | null>(null)

  const onPick = async (file: File) => {
    if (!/\.docx$/i.test(file.name)) { setMessage(`${file.name}：Word（docx）を選んでください`); return }
    try {
      const bytes = new Uint8Array(await file.arrayBuffer())
      const d = await readDocx(bytes)
      const kind = formKindOf(d.paragraphs)
      if (kind === null) {
        setMessage(`${file.name}：どの様式か分からない（見出しが第二号・第三号・第八号のどれとも合わない）`)
        return
      }
      importForm(kind, file.name, bytes, d.paragraphs)
      setMessage(`${FORM_TITLE[kind]} として取り込みました`)
      tutorialDone('tutorial-attach')
    } catch (e) {
      setMessage(`${file.name}：読めませんでした（${e instanceof Error ? e.message : String(e)}）`)
    }
  }

  return <PermitFormImportView forms={forms} message={message} onPick={(file) => void onPick(file)} />
}

/** 表示だけの部品。値（取り込んだ様式・結果の文）を受け取って描く（サーバー側の描画の試験のため、ストアを読まない） */
export function PermitFormImportView({ forms, message, onPick }: PermitFormImportViewProps) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  return (
    <section data-tutorial="tutorial-attach">
      <div
        className={`permit-dropzone${dragging ? ' is-dragging' : ''}`}
        onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; setDragging(true) }}
        onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false) }}
        onDrop={(e) => { e.preventDefault(); setDragging(false); Array.from(e.dataTransfer.files).forEach(onPick) }}
      >
        <svg width="28" height="32" viewBox="0 0 28 32" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M5 1h12l6 6v24H5zM17 1v7h6M14 12v12m-5-5 5 5 5-5"/></svg>
        <p className="permit-dropzone-title">{dragging ? 'ここで離して取り込む' : 'Word様式をここにドロップ'}</p>
        <button type="button" onClick={() => inputRef.current?.click()}>またはファイルを選ぶ</button>
        <input ref={inputRef} type="file" accept=".docx" multiple hidden aria-label="様式（docx）を選ぶ"
          onChange={(e) => { const files = Array.from(e.target.files ?? []); e.target.value = ''; files.forEach(onPick) }} />
      </div>
      <p className="permit-dropzone-note">.docx ／ 複数ファイルをまとめて追加できます。取り込み後に自動記入し、右のビューアで確認できます。</p>
      <details className="permit-import-status">
        <summary>対応様式・取り込み状況（{FORM_KINDS.filter((k) => forms[k]).length} / {FORM_KINDS.length}）</summary>
        <ul>
          {FORM_KINDS.map((k) => {
            const f = forms[k]
            return <li key={k}>{`${FORM_TITLE[k]}：${f ? `取り込み済み：${f.fileName}` : '未取り込み'}`}</li>
          })}
        </ul>
        <p>国土交通省・自治体の様式に対応。ファイルは外部に送信しません。</p>
      </details>
      {message ? <p role="status" className="permit-dropzone-note">{message}</p> : null}
    </section>
  )
}
