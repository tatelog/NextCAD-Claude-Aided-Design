// 様式の取り込み（統括の依頼 2026-11-06。2-a）。使う人が Word（docx）を選ぶ。中身の見出しで、どの様式かを見分ける。
// 取り込んだものは画面の中だけに持ち、どこへも送らない。
import { useState } from 'react'
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
    } catch (e) {
      setMessage(`${file.name}：読めませんでした（${e instanceof Error ? e.message : String(e)}）`)
    }
  }

  return <PermitFormImportView forms={forms} message={message} onPick={(file) => void onPick(file)} />
}

/** 表示だけの部品。値（取り込んだ様式・結果の文）を受け取って描く（サーバー側の描画の試験のため、ストアを読まない） */
export function PermitFormImportView({ forms, message, onPick }: PermitFormImportViewProps) {
  return (
    <section>
      <h3 style={{ fontSize: 14, margin: '8px 0 4px' }}>様式を取り込む（東京都の Word）</h3>
      <p style={{ fontSize: 12, color: '#666', margin: '0 0 6px' }}>
        取ってきた Word（docx）を選びます。取り込んだものは、この画面の中だけに持ち、どこへも送りません。
      </p>
      <ul style={{ fontSize: 13, margin: '0 0 6px', paddingLeft: 18 }}>
        {FORM_KINDS.map((k) => {
          const f = forms[k]
          return <li key={k}>{`${FORM_TITLE[k]}：${f ? `取り込み済み：${f.fileName}` : '未取り込み'}`}</li>
        })}
      </ul>
      <input
        type="file"
        accept=".docx"
        aria-label="様式（docx）を選ぶ"
        onChange={(e) => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (file) void onPick(file)
        }}
      />
      {message ? <p style={{ fontSize: 12, color: '#444', margin: '6px 0 0' }}>{message}</p> : null}
    </section>
  )
}
