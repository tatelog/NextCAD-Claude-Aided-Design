// 仕様（統括の依頼 2026-11-06。2: 作れない図の理由を正しく出す）:
// VR1: 配置図が作れないときは、ビューアにその理由を出す（縮尺が無い・敷地を確定していない で言い分ける）。
// VR2: 理由が渡されないときは「敷地を確定すると出せます」（既定）。
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import docsJson from '../law/permitDocuments.json'
import type { PermitJudgement } from '../law/permitRequired'
import { PermitViewer } from './PermitViewer'

const docs = (docsJson as unknown as { documents: { id: string; name: string; kind: string }[] }).documents
const JUDGEMENT: PermitJudgement = {
  required: ['配置図'],
  notRequired: [],
  needsCheck: [],
  applicability: { article6: '2号', article20: '3号' },
}

describe('ビューアの作れない図の理由（仕様 VR1・VR2）', () => {
  it('VR1: 配置図が縮尺が無いため作れないときは、その理由を出す', () => {
    const out = renderToStaticMarkup(
      createElement(PermitViewer, {
        judgement: JUDGEMENT,
        docs,
        ifcText: null,
        drawingSvgs: { site: null, floorPlan: null },
        drawingReasons: { site: '敷地が大きく、図枠に収まる縮尺が無い', floorPlan: '平面を作ると出せます' },
        initialKey: '要る|配置図',
      }),
    )
    expect(out).toContain('敷地が大きく、図枠に収まる縮尺が無い')
    expect(out).not.toContain('敷地を確定すると出せます')
  })

  it('VR2: 理由が渡されないときは「敷地を確定すると出せます」', () => {
    const out = renderToStaticMarkup(
      createElement(PermitViewer, {
        judgement: JUDGEMENT,
        docs,
        ifcText: null,
        drawingSvgs: { site: null, floorPlan: null },
        initialKey: '要る|配置図',
      }),
    )
    expect(out).toContain('敷地を確定すると出せます')
  })
})
