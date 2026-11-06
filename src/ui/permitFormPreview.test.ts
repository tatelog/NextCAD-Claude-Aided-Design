// 仕様（統括の依頼 2026-11-06・代表承認。第二号（申請書）と第三号（概要書）は、値を入れた様式のまま全ページ見せる。第八号の 2 つは今の一覧のまま）:
// 仕様 DP1: 書類の名前が第二号様式・第三号様式のものだけ、様式で見せる対象。第八号・それ以外の書類は対象外（一覧のまま）。
// 仕様 DP2: 対象でも、記入した docx がまだ無いときは一覧のまま。理由は「記入すると、ここに様式が出ます」。
// 仕様 DP3: 記入した docx があるときは、そのファイル名とバイト列を、変えずに渡す。
// 仕様 DP4: 第二号と第三号は別々に見る。第三号だけ記入していても、第二号は一覧のまま。
// 仕様 DP5: 描けなかったときの文は、例外の中身を含む。例外でない値も文にする（一覧へ戻すときに出す）。
import { describe, expect, it } from 'vitest'
import { docxViewKindOfName, FORM_PAGE_NOTE, fitZoomOf, previewPlanOf, renderFailureTextOf } from './permitFormPreview'

const F2_NAME = '確認申請書（第二号様式）'
const F3_NAME = '建築計画概要書（第三号様式）'
const F8_NAME = '確認申請書（昇降機）（第八号様式・昇降機用）。第二面の6欄（昇降機の概要）を、建築物の確認申請に添付する'
const F8E_NAME = '確認申請書（昇降機以外の建築設備）（第八号様式・昇降機以外の建築設備用）'
const BYTES = new Uint8Array([80, 75, 3, 4])

describe('様式で見せる対象（仕様 DP1〜DP4）', () => {
  it('仕様 DP1: 第二号・第三号は対象。第八号と他の書類は対象外', () => {
    expect(docxViewKindOfName(F2_NAME)).toBe('F2')
    expect(docxViewKindOfName(F3_NAME)).toBe('F3')
    expect(docxViewKindOfName(F8_NAME)).toBeNull()
    expect(docxViewKindOfName(F8E_NAME)).toBeNull()
    expect(docxViewKindOfName('配置図')).toBeNull()
  })

  it('仕様 DP2: 対象でも、記入した docx が無いときは一覧のまま。理由は「記入すると、ここに様式が出ます」', () => {
    expect(previewPlanOf(F2_NAME, {})).toEqual({ mode: 'list', reason: '記入すると、ここに様式が出ます' })
  })

  it('仕様 DP1（対象外）: 対象外の書類は、記入した docx があっても一覧（理由なし）', () => {
    expect(previewPlanOf(F8_NAME, { F2: { fileName: '第二号様式_記入.docx', bytes: BYTES } })).toEqual({ mode: 'list', reason: null })
  })

  it('仕様 DP3: 記入した docx があるときは、ファイル名とバイト列を変えずに渡す', () => {
    const plan = previewPlanOf(F2_NAME, { F2: { fileName: '第二号様式_記入.docx', bytes: BYTES } })
    expect(plan.mode).toBe('docx')
    if (plan.mode !== 'docx') return
    expect(plan.fileName).toBe('第二号様式_記入.docx')
    expect(plan.bytes).toBe(BYTES)
  })

  it('仕様 DP4: 第二号と第三号は別々に見る。第三号だけ記入しても第二号は一覧', () => {
    const filled = { F3: { fileName: '第三号様式_記入.docx', bytes: BYTES } }
    expect(previewPlanOf(F2_NAME, filled).mode).toBe('list')
    expect(previewPlanOf(F3_NAME, filled).mode).toBe('docx')
  })
})

describe('描けなかったときの文（仕様 DP5）', () => {
  it('仕様 DP5: 例外の中身を含む文。例外でない値も文にする', () => {
    expect(renderFailureTextOf(new Error('boom'))).toContain('boom')
    expect(renderFailureTextOf('文字')).toContain('文字')
  })
})

// 仕様（統括の判断 2026-11-06・BwC のメッセージ 1）: 描画の上に、区切りが Word のページと一致しない旨の一言を出す。
describe('描画の上の一言（仕様 FV1）', () => {
  it('仕様 FV1: 「画面の区切りは Word のページと一致しない（印刷は Word で開いて確かめる）」と出す', () => {
    expect(FORM_PAGE_NOTE).toBe('画面の区切りは Word のページと一致しない（印刷は Word で開いて確かめる）')
  })
})

// 仕様（統括の判断 2026-11-06・BwC のメッセージ 2）: 描いた面を、表示の箱の幅に合わせて縮め、横に送らずに全体が見えるようにする。
// 倍率は「箱の幅 ÷ 描く幅」（1 を超えない）。描く幅は、面と余白を含む幅。
describe('表示の箱の幅に合わせる倍率（仕様 FZ1〜FZ4）', () => {
  it('仕様 FZ1: 箱が描く幅より広いときは、倍率は 1（拡大しない）', () => {
    expect(fitZoomOf(1000, 854)).toBe(1)
  })

  it('仕様 FZ2: 箱が狭いときは、箱の幅に収まる倍率にする（箱 ÷ 描く幅）', () => {
    expect(fitZoomOf(433, 854)).toBeCloseTo(433 / 854, 6)
  })

  it('仕様 FZ3: 倍率を掛けた幅は、箱からはみ出さない', () => {
    const box = 433
    const natural = 854
    expect(natural * fitZoomOf(box, natural)).toBeLessThanOrEqual(box + 1e-9)
  })

  it('仕様 FZ4: 幅が分からない（0・負・数でない）ときは 1（描画を止めない）', () => {
    expect(fitZoomOf(0, 854)).toBe(1)
    expect(fitZoomOf(433, 0)).toBe(1)
    expect(fitZoomOf(-5, 854)).toBe(1)
    expect(fitZoomOf(Number.NaN, 854)).toBe(1)
  })
})
