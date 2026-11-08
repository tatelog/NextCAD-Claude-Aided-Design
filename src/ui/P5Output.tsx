import permitFormsJson from '../law/permitForms.json'
import { type FormDef } from '../law/permitFormPlan'
import { fillInstructionsOf } from '../law/permitFormFill'
import { fillDocx } from '../export/docxWrite'
import {pdfBaseName,withPrintTitle} from '../export/pdfName'
import {combinedOutputFiles} from '../export/combinedOutput'
import {resolvePermitProject} from '../permit/resolvePermitProject'
import {useFixtures} from '../store/fixtures'
import {readUnitPlan} from '../plan/unitPlan39'
import {useBimSettings,drawingDimensions} from '../store/bimSettings'
import {exportConfiguredPlan} from '../bimExchange/integration/exportConfiguredPlan'
import {drawingPdfFiles,drawingsPdf} from '../export/drawingPdf'
import {useFloorPlans} from '../store/floorPlans'
import {useSolarSettings} from '../store/solarSettings'
import {detailedFloorSvg,shadowSheetSvg} from '../export/designSheets'
import {cutFloorParts} from '../volume/slope'
import {tutorialDone} from '../tutorial/state'
// P5 出力（D-04 P5、D-02 C9・C10・C11、t91・G46）。IFC と確認申請の図書は、P2 で描いた外形から作る。
// 図書の一覧は判定（requiredPermitDocuments）の結果で出す。要る・要らない（理由）・要確認（理由）の三区分。要確認は隠さない。
// 外形が閉じていなければ IFC と判定は出さず、「外形が未作成」と出す（ダミーの外形では代えない）。
// 部材寸法は平面画面の設定を使用する。
import { useMemo, useState } from 'react'

import { findClosedOutline } from '../canvas/closure'
import { p2Entries, useDrawing } from '../store/drawing'
import { usePermitProject } from '../store/permitProject'
import { APP_STRUCTURE, APP_USAGE, APP_WORK_KIND, permitInputFromVolume } from '../law/permitInput'
import { AREA_REFERENCE_NOTE, FIFTH_OPEN_NOTE, LIMIT_SOURCE, NEW_BUILDING_NOTE, THIRD_OPEN_NOTES, fifthSheetOf, fireLabelOf, formValuesFromVolume, frontEdgeLengthM, limitNotesOf, siteAreaM2Of, zoneLimitsOf, zoneNameOf } from '../law/permitFormValues'
import { unwrittenNotesOf } from '../law/permitFormNotes'
import { floorSheetRestNoteOf } from '../law/floorSheet'
import { chibanOf } from '../map/parcelInfo'
import { parcelPropsOf } from '../map/selectedParcel'
import { requiredPermitDocuments } from '../law/permitRequired'
import { drawingAreaOf, frameSvg } from '../law/permitFrameSvg'
import { siteLayoutStateOf, siteMissingTextOf } from '../export/drawingSvg'
import { DRAWING_MISSING_DEFAULT } from '../permit/permitViewer'
import { lotOfConfirmed, useConfirmedSite } from '../store/confirmedSite'
import { neighborOutlinesOf } from '../volume/neighborFrame'
import { PermitViewer } from './PermitViewer'
import { PermitFormImport } from './PermitFormImport'
import { PermitFormPlan } from './PermitFormPlan'
import { usePermitForms } from '../store/permitForms'
import permitDocsJson from '../law/permitDocuments.json'
import { buildZip } from '../export/zipWriter'
import { permitPackageFilesOf } from '../export/permitPackage'
import { applicabilityTextOf, frameSizeOf, judgementRowsOf, legalCheckOfDoc, outlineStateOf, volumeOfOutline } from '../permit/p5Judgement'
import { classLabelsOf } from '../law/buildingClass'
import { fireZoneClass, type FireZone } from '../law/fireZoneClass'
import { fireStructureItems } from '../law/fireStructure'
import { COMPONENTS, judgeComponent, requiredMinutes } from '../law/structureFire'
import { ICHI_NOTE, judgeIchi } from '../law/fireIchi'
import { useComponentFire } from '../store/componentFire'
import { useSite } from '../store/site'
import { cutFloorAreasOf, grossFloorAreaMm2 } from '../volume/cutVolume'
import { isRightItemShown, useActiveMode } from '../store/mode'
import { SCREEN_MODES } from '../app/screenModes'
import { usePanelTiles } from '../store/panelTiles'
import { PanelTile } from './PanelTile'
import { FeatureAdjustTile } from './FeatureAdjustTile'
import { useDevTools } from '../store/devTools'
import { PermitProjectFields } from './PermitProjectFields'

const TONE_COLOR = { ok: '#2f7a4f', warn: '#a86b00', none: '#666' } as const

export function P5Output({projectName=''}:{projectName?:string}={}) {
  const devShown = useDevTools((s) => s.shown)
  const settings=useBimSettings(s=>s.settings)
  const [exportError,setExportError]=useState('')
  const [pdfBusy,setPdfBusy]=useState(false)
  const [fireZone, setFireZone] = useState<FireZone>('なし')
  const componentRatings = useComponentFire((st) => st.ratings)
  const setComponentRating = useComponentFire((st) => st.setRating)
  const fireDoor = useComponentFire((st) => st.fireDoor)
  const setFireDoor = useComponentFire((st) => st.setFireDoor)
  const [purpose, setPurpose] = useState('general')
  const [ifcSchema, setIfcSchema] = useState<'IFC4' | 'IFC2X3'>('IFC4')
  const [frame, setFrame] = useState<'A3横' | 'A1'>('A3横')
  const [applicant, setApplicant] = useState('')
  const roadSlope = useSite((s) => s.roadSlope)
  const shadow = useSite((s) => s.shadow)
  // 設計データを優先し、申請固有の入力だけ補う。
  const manualProject = usePermitProject((s) => s.project)
  const setProject = usePermitProject((s) => s.set)
  // P2 の外形と階数・階高（P2 の値）
  // 外形は P2 の線だけ（P3 の線は外形に入れない）
  const drawnAll = useDrawing((s) => s.entries)
  const entries = useMemo(() => p2Entries(drawnAll), [drawnAll])
  const storeys = useDrawing((s) => s.storeyCount)
  const height = useDrawing((s) => s.storeyHeightMm)
  // 右パネルの項目は、今のモードと画面の組で決まる（G100・G95）。P5 は System だけなので、機能の調整を出す（切替は出さない）
  const activeMode = useActiveMode('P5')
  const hiddenTiles = usePanelTiles((s) => s.hidden)
  const rightShown = (id: string) => isRightItemShown(SCREEN_MODES, activeMode, 'P5', hiddenTiles, id)


  const outline = useMemo(() => outlineStateOf(findClosedOutline(entries.flatMap((e) => e.segments))), [entries])
  const volumeResult = useMemo(() => (outline.ok ? volumeOfOutline(outline.footprint, storeys, height) : null), [outline, storeys, height])
  const volume = volumeResult?.ok ? volumeResult.volume : null
  const outlineReason = !outline.ok ? outline.reason : volumeResult && !volumeResult.ok ? volumeResult.reason : null
  // 延べ面積は、切り取った階の面積の和（統括の依頼 2026-11-06。依頼 5a・B）。切り取りは P2 の境界と、今の階数・階高から計算する
  const slopeBoundaries = useSite((s) => s.slopeBoundaries)
  const permitVolume = useMemo(
    () =>
      volume
        ? {
            ...volume,
            gross_floor_area_mm2: grossFloorAreaMm2(
              volume.gross_floor_area_mm2,
              cutFloorAreasOf(outline.ok ? outline.footprint : [], slopeBoundaries, { storey_count: storeys, storey_height: height }),
              storeys,
            ),
          }
        : null,
    [volume, outline, slopeBoundaries, storeys, height],
  )
  const grossM2 = permitVolume ? permitVolume.gross_floor_area_mm2 / 1_000_000 : 0
  const heightM = volume ? volume.total_height / 1000 : 0
  const floorPlans=useFloorPlans(s=>s.plans)
  const fixtures=useFixtures(s=>s.fixtures)
  const resolvedProject=useMemo(()=>{
    const plans=Object.values(floorPlans)
    const complete=Array.from({length:storeys},(_,i)=>i+1).every(f=>Boolean(floorPlans[f]))
    const ev=plans.some(p=>p.cores.some(c=>(c.evCount??0)>0))
    const evKnown=plans.every(p=>p.cores.every(c=>c.id!=='evHall'||typeof c.evCount==='number'))
    const equipmentKinds=new Set(['キッチン','浴槽','洗面化粧台','便器','洗濯機'])
    const cellIds=new Set(plans.flatMap(p=>p.cells.map(c=>c.id)))
    const equipment=ev||fixtures.some(f=>f.item!=='storage'&&f.unitId!==null&&cellIds.has(f.unitId))||plans.some(p=>p.cells.some(c=>{
      const unit=p.unitPlanOverrides?.[c.id]??readUnitPlan(p.unitTypeIdsByCell?.[c.id]??'',p.unitPlanVariants?.[c.id]??'A')
      return unit?.fixtures.some(f=>equipmentKinds.has(f.kind))
    }))
    return resolvePermitProject(manualProject,{elevator:ev?true:complete&&evKnown?false:null,equipment:equipment?true:null,shadowChecked:shadow!==null})
  },[floorPlans,fixtures,storeys,manualProject,shadow])
  const project=resolvedProject.project
  const judgement = useMemo(() => (permitVolume ? requiredPermitDocuments(permitInputFromVolume(permitVolume, project)) : null), [permitVolume, project])
  // 様式の欄に入れる値（ボリュームから決まるもの。案件の敷地面積は入力があるときだけ）
  // 記入する値。地名地番と敷地面積は、確定した筆のデータ（公図）から。筆が無ければ入らない
  const confirmedForForm = useConfirmedSite((s) => s.confirmed)
  const districtForForm = useConfirmedSite((s) => s.district.data)
  const formValues = useMemo(() => {
    if (!permitVolume) return {}
    const props = confirmedForForm?.parcelUid ? parcelPropsOf(confirmedForForm.parcelUid) : undefined
    const chiban = props ? chibanOf(props) : null
    const lotForForm = lotOfConfirmed(confirmedForForm)
    const frontLength = confirmedForForm && lotForForm ? frontEdgeLengthM(lotForForm, confirmedForForm.roadEdge) : undefined
    // 防火の区分は、確定の地点の法規（取れていなければ決めない）
    const fire = fireLabelOf(
      districtForForm === null ? null : { functions: districtForForm.fireMatches.map((f) => f.function), unknownOwner: districtForForm.fireUnknownOwner.length },
    )
    // 用途地域の名前と、容積率・建蔽率（地点の用途地域が一つのときだけ）
    const zoneName = districtForForm ? zoneNameOf(districtForForm.matches) : null
    const limits = districtForForm ? zoneLimitsOf(districtForForm.matches) : null
    return formValuesFromVolume(permitVolume, {
      structure: APP_STRUCTURE,
      usage: APP_USAGE,
      workKind: APP_WORK_KIND,
      ...(zoneName !== null ? { zoneName } : {}),
      ...(limits !== null ? { limits } : {}),
      siteAreaM2: siteAreaM2Of(lotForForm),
      ...(chiban !== null ? { chiban } : {}),
      ...(fire !== null ? { fire } : {}),
      ...(frontLength !== undefined ? { frontRoadLengthM: frontLength } : {}),
      // 前面道路の幅員と出どころ（確定のまとめの値。0 mm は未入力）
      ...(confirmedForForm && confirmedForForm.roadWidthMm > 0
        ? { frontRoadWidth: { mm: confirmedForForm.roadWidthMm, source: confirmedForForm.roadSource } }
        : {}),
    })
  }, [permitVolume, confirmedForForm, districtForForm])
  const ready = volume !== null
  const ifcText=null
  // 配置図と各階平面図の中身（図枠の作図領域の中）。元のデータが無いものは null
  const confirmedNow = useConfirmedSite((s) => s.confirmed)
  const buildingsNow = useConfirmedSite((s) => s.buildings)
  const planResult = useSite((s) => s.plan)
  const twinNote=Object.values(floorPlans).some(p=>p.layout==='ツイン')?'ツインの吹抜けは各階平面図に反映しています。3D・IFC・申請様式の床面積・日影図は外形モデルのままで、吹抜け未反映です。':null
  const selectedFloor=useFloorPlans(s=>s.selected)
  const solarDate=useSolarSettings(s=>s.date)
  const drawingSvgs = useMemo(() => {
    const size = frameSizeOf(frame)
    const area = drawingAreaOf(size)
    // 縮尺は、作図の領域に収まるいちばん大きい標準の縮尺。図枠の縮尺の欄に「1/○○」と書く
    const sheet = (body: string, denominator: number): string => frameSvg({ size, values: { scale: `1/${denominator}` }, body }).svg
    const siteState = siteLayoutStateOf({
      lot: lotOfConfirmed(confirmedNow),
      footprint: outline.ok ? outline.footprint : null,
      neighbors: neighborOutlinesOf(buildingsNow.data ?? [], confirmedNow?.frame ?? null),
      area,
    })
    const floors=Object.entries(floorPlans).flatMap(([floor,p])=>{const svg=detailedFloorSvg(p,Number(floor),drawingDimensions(settings));return svg?[{name:`${floor}階平面図`,svg}]:[]})
    const floorLayout=planResult?detailedFloorSvg(planResult,selectedFloor,drawingDimensions(settings)):null
    const lot=lotOfConfirmed(confirmedNow)
    const parts=outline.ok?cutFloorParts(outline.footprint,slopeBoundaries??[],{storey_count:storeys,storey_height:height}):[]
    const shadowSvg=lot&&confirmedNow?.center?shadowSheetSvg({lot,floors:parts.flatMap((ps,i)=>ps.map(footprint=>({footprint,heightMm:(i+1)*height}))),...confirmedNow.center,date:solarDate,rotation:confirmedNow.frame?.rotationDeg??0}):null
    return {
      site: siteState.kind === 'ok' ? sheet(siteState.body, siteState.denominator) : null,
      floorPlan: floorLayout,
      shadow:shadowSvg, floors,
      // 作れないときの理由（縮尺が無い・敷地を確定していない で言い分ける）
      reasons: { site: siteMissingTextOf(siteState) ?? DRAWING_MISSING_DEFAULT.site, floorPlan: DRAWING_MISSING_DEFAULT.floorPlan },
    }
  }, [settings,frame, confirmedNow, buildingsNow, outline, planResult, floorPlans,selectedFloor,solarDate,slopeBoundaries,storeys,height])

  // 一式の中身（図面・IFC・書類一覧・空欄の一覧・記入した様式）。判定が無いときは null
  const filledNow = usePermitForms((s) => s.filled)
  const formsNow = usePermitForms((s) => s.forms)
  const packageFiles = useMemo(() => {
    if (!judgement) return null
    return permitPackageFilesOf({
      judgement,
      docs: permitDocsJson.documents,
      drawings: drawingSvgs,
      ifcText,
      ifcFileName: 'model.ifc',
      filledForms: Object.values(filledNow).filter((x): x is { fileName: string; bytes: Uint8Array } => x !== undefined),
      // 敷地面積が公図の参考値なら、空欄の一覧に参考値の文を添える（統括の依頼 2026-11-06。3）
      // 幅員は出どころ（入力の値など）を添える（統括の依頼 2026-11-06）
      notes: [
        ...(twinNote?[twinNote]:[]),
        ...(formValues['F2-3-07.敷地面積']?.from === '公図の参考値' ? [AREA_REFERENCE_NOTE] : []),
        ...(formValues['F2-3-06.幅員'] !== undefined
          ? [`前面道路の幅員：${formValues['F2-3-06.幅員'].value} m（出どころ：${formValues['F2-3-06.幅員'].from}）`]
          : []),
        // 新築として、申請部分と合計に同じ値を書いた（統括の判断 2026-11-06）
        ...(formValues['F2-3-10'] !== undefined ? [NEW_BUILDING_NOTE] : []),
        // 第五面の未決（記号の表・枚数）は、書いたときに空欄の一覧に出す（調査の指摘 2026-11-06）
        ...(formValues['F2-5-07.床面積'] !== undefined ? [FIFTH_OPEN_NOTE] : []),
        // 容積率・建蔽率: 出典、または決まらない理由（統括の依頼 2026-11-06）
        ...(districtForForm === null
          ? ['容積率・建蔽率：地点の用途地域の値をまだ取っていない（空欄）']
          : limitNotesOf(zoneLimitsOf(districtForForm.matches))),
        ...(formValues['F2-3-07.容積率'] !== undefined || formValues['F2-3-07.建蔽率'] !== undefined ? [`容積率・建蔽率の出典：${LIMIT_SOURCE}`] : []),
        // 第三号だけの欄（人が入れる・別紙）。第三号が取り込まれているときに出す（統括の依頼 2026-11-06）
        ...(formsNow.F3 !== undefined ? THIRD_OPEN_NOTES : []),
        // 内容の違う階の第五面は、別紙（統括の決定 2026-11-06。B）
        ...(permitVolume !== null && floorSheetRestNoteOf(fifthSheetOf(permitVolume).rest) !== null
          ? [floorSheetRestNoteOf(fifthSheetOf(permitVolume).rest)!]
          : []),
        // 書けなかった欄（取り込んだ様式ごと）は、黙って抜かず、空欄の一覧に出す（統括の依頼 2026-11-06）
        ...unwrittenNotesOf(formsNow, formValues),
      ],
    })
  }, [twinNote, judgement, drawingSvgs, ifcText, filledNow, formValues, formsNow, districtForForm])

  const drawingFiles: import('../export/permitPackage').PackageFile[] = [
    ...(drawingSvgs.site ? [{path:'配置図.svg', text:drawingSvgs.site}] : []),
    ...drawingSvgs.floors.map(f=>({path:`${f.name}.svg`,text:f.svg})),
    ...(!drawingSvgs.floors.length && drawingSvgs.floorPlan ? [{path:'平面図.svg',text:drawingSvgs.floorPlan}] : []),
    ...(drawingSvgs.shadow ? [{path:'日影図.svg',text:drawingSvgs.shadow}] : []),
  ]

  const documentFiles=Object.values(filledNow).flatMap(f=>f?[{path:f.fileName,text:'',bytes:f.bytes}]:[])
  const missingOutput=[
    ...(!drawingSvgs.site?['配置図：敷地・外形を確認してください']:[]),
    ...Array.from({length:storeys},(_,i)=>i+1).filter(f=>!floorPlans[f]).map(f=>`${f}階平面図：未作成`),
    ...(!drawingSvgs.shadow?['日影図：敷地・外形・地点が必要です']:[]),
    ...(!documentFiles.length?['申請書類：様式を取り込み、記入済みの書類を作成してください']:[]),
    ...unwrittenNotesOf(formsNow,formValues),
    ...Object.entries(project).filter(([,v])=>v===null).map(([k])=>`申請条件：${({inShadowRegulationArea:'日影規制区域',structuralCalc:'構造計算',hasAgent:'代理申請',bimSubmission:'BIMでの申請',usesCertifiedParts:'認定部材',hasBuildingEquipment:'建築設備',hasElevator:'昇降機'} as Record<string,string>)[k]}が未入力`),
  ]
  const saveAll=async()=>{if(pdfBusy)return;setPdfBusy(true);try{
    let data:import('../export/permitPackage').PackageFile[]=[]
    const documents=[...documentFiles]
    for(const [kind,form] of Object.entries(formsNow)){
      if(!form)continue
      const def=(permitFormsJson.forms as unknown as FormDef[]).find(d=>d.id===kind)
      if(!def)continue
      const own=Object.fromEntries(Object.entries(formValues).filter(([key])=>key.startsWith(kind+'-')))
      const plan=fillInstructionsOf(def,form.paragraphs,own)
      const bytes=await fillDocx(form.bytes,plan.instructions)
      const path=form.fileName.replace(/\.docx$/i,'')+'_記入.docx'
      const old=documents.findIndex(f=>f.path===path)
      if(old>=0)documents.splice(old,1)
      documents.push({path,text:'',bytes})
    }
    const missing=missingOutput.filter(note=>!documents.length||!note.startsWith('申請書類：'))
    if(Object.keys(floorPlans).length){try{
      const out=exportConfiguredPlan({source:useFloorPlans.getState().source,plans:floorPlans,storeyHeightMm:height,ifcSchema},settings)
      data=out.files;missing.push(...out.manifest.issues.map(i=>i.message))
    }catch(e){missing.push(`BIMデータ：${e instanceof Error?e.message:String(e)}`)}}else missing.push('BIMデータ：平面が未作成')
    const files=combinedOutputFiles(await drawingPdfFiles(drawingFiles),documents,data,missing)
    const enc=new TextEncoder(),bytes=buildZip(files.map(f=>({path:f.path,data:f.bytes??enc.encode(f.text)})))
    const url=URL.createObjectURL(new Blob([bytes as BlobPart],{type:'application/zip'})),a=document.createElement('a')
    a.href=url;a.download='図面・書類一式.zip';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);setExportError('');tutorialDone('tutorial-save-all')
  }catch(e){setExportError(e instanceof Error?e.message:String(e))}finally{setPdfBusy(false)}}

  const saveDrawingPdf=async()=>{if(pdfBusy)return;setPdfBusy(true);try{
    const bytes=await drawingsPdf(drawingFiles.map(f=>f.text))
    const url=URL.createObjectURL(new Blob([bytes as BlobPart],{type:'application/pdf'}))
    const a=document.createElement('a');a.href=url;a.download=`${pdfBaseName(projectName)}.pdf`;a.click()
    setTimeout(()=>URL.revokeObjectURL(url),1000);setExportError('');tutorialDone('tutorial-output')
  }catch(e){setExportError(e instanceof Error?e.message:String(e))}finally{setPdfBusy(false)}}

  // 一式を zip ひとつで出す（無圧縮）
  const downloadPackage = () => {
    const files = (packageFiles ?? []).filter(f => !f.path.startsWith('02_図面/') && !f.path.startsWith('03_BIM/'))
    if (!files.length) return
    const enc = new TextEncoder()
    const bytes = buildZip(files.map((f) => ({ path: f.path, data: f.bytes ?? enc.encode(f.text) })))
    const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'application/zip' }))
    const a = document.createElement('a')
    a.href = url
    a.download = '申請書類.zip'
    a.click()
    tutorialDone('tutorial-output')
    URL.revokeObjectURL(url)
  }

  const downloadIfc=(ifcSchema:'IFC4'|'IFC2X3')=>{try{
    const out=exportConfiguredPlan({source:useFloorPlans.getState().source,plans:floorPlans,storeyHeightMm:height,ifcSchema},settings)
    const text=out.files.find(f=>f.path==='model.ifc')!.text
    const url=URL.createObjectURL(new Blob([text],{type:'application/octet-stream'})),a=document.createElement('a')
    a.href=url;a.download=`平面モデル-${ifcSchema}.ifc`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);setExportError('');tutorialDone('tutorial-output')
  }catch(e){setExportError(e instanceof Error?e.message:String(e))}}

  const legal = { roadSlope, shadow, applicantFilled: applicant.trim() !== '' }

  return (
    <div data-tutorial="tutorial-output" className="p5-output-page">
      <h2>出力</h2>
      {twinNote && <p role="note">{twinNote}</p>}
      {exportError && <p role="alert">{exportError}</p>}
      <div className="p5-output-columns">
        <section className="p5-output-inputs" aria-label="建築概要・入力項目">
          <h3>建築概要・入力項目</h3>
          <section>
            <h4>申請者と図枠</h4>
                  <label style={{ display: 'block', marginBottom: 6 }}>
                    申請者
                    <input value={applicant} onChange={(e) => setApplicant(e.target.value)} style={{ width: 240, marginLeft: 8 }} />
                  </label>
                  <div style={{ marginBottom: 8 }}>
                    図枠:{' '}
                    {(['A3横', 'A1'] as const).map((f) => (
                      <button key={f} type="button" aria-pressed={frame === f} onClick={() => setFrame(f)} style={{ marginLeft: 6 }}>
                        {f}
                      </button>
                    ))}
                  </div>

            {!applicant.trim() && <p className="p5-input-needed">要入力：申請者</p>}
          </section>
          <details open>
            <summary>入力・確認が必要な項目</summary>
            <ul>{missingOutput.map((text,i)=><li key={i}>{text}</li>)}</ul>
          </details>
            <details style={{ marginBottom: 20 }}><summary>申請条件・耐火性能</summary>
              <label style={{ display: 'block', marginBottom: 6 }}>
                防火地域の区分（敷地の地点を人が選ぶ）
                <select value={fireZone} onChange={(e) => setFireZone(e.target.value as FireZone)} style={{ marginLeft: 8 }}>
                  <option value="なし">なし</option>
                  <option value="防火">防火地域</option>
                  <option value="準防火">準防火地域</option>
                </select>
              </label>


            {ready ? (
              <p style={{ fontSize: 12, color: '#444', margin: '0 0 12px' }}>
                号区分（大規模の判定。ボリュームの外形の延べ面積と高さで数える。RC・共同住宅・区域内は仮置き）:{' '}
                {(() => {
                  const labels = classLabelsOf({
                    structure: 'RC',
                    heightM,
                    aboveGroundStoreys: storeys,
                    totalFloorAreaM2: grossM2,
                    specialUseAreaM2: grossM2,
                    inPlanningArea: true,
                  })
                  return `${labels.article6} ／ ${labels.article20}（出典: e-Gov 法令、第 20 条は抜粋の範囲）`
                })()}
              </p>
            ) : null}
            {ready && fireZone !== 'なし' ? (
              <div style={{ fontSize: 12, color: '#a86b00', margin: '0 0 12px' }}>
                {(() => {
                  const cls = fireZoneClass({ zone: fireZone, aboveGroundStoreys: storeys, floorAreaM2: grossM2, wood: false })
                  return (
                    <>
                      <p style={{ margin: '0 0 4px' }}>防火・準防火（{fireZone}地域）: 令 136 条の 2 {cls}</p>
                      <ul style={{ margin: 0, paddingLeft: 18 }}>
                        {fireStructureItems(cls).map((i) => {
                          // イ（G85）: 主要構造部の耐火構造と、外壁開口部設備の防火設備で判定する。ロは計算せず対象外と出す
                          if (i.label.startsWith('イ')) {
                            const ichi = judgeIchi(storeys, { ratings: componentRatings, fireDoor })
                            return (
                              <li key={i.label}>
                                イ（主要構造部の耐火構造・外壁開口部設備の防火設備）: {ichi.result}
                                {ichi.reasons.length > 0 ? `（${ichi.reasons.join('、')}）` : ''}
                              </li>
                            )
                          }
                          if (i.label.startsWith('ロ')) return <li key={i.label}>{ICHI_NOTE}</li>
                          return <li key={i.label}>{i.label}: {i.status}（部材の耐火性能の入力が無い）</li>
                        })}
                      </ul>
                    </>
                  )
                })()}
              </div>
            ) : null}
            {ready ? (
              <section style={{ marginBottom: 12, fontSize: 12 }}>
                <strong>部材の耐火時間（令 107 条。入力した分を、階数の区分の必要時間と比べる）</strong>
                <label style={{ display: 'block', margin: '6px 0' }}>
                  外壁開口部設備（防火設備か。イの入力）{' '}
                  <select value={fireDoor === null ? '' : fireDoor ? 'yes' : 'no'} onChange={(e) => setFireDoor(e.target.value === '' ? null : e.target.value === 'yes')}>
                    <option value="">未入力</option>
                    <option value="yes">防火設備</option>
                    <option value="no">防火設備ではない</option>
                  </select>
                </label>
                <table style={{ borderCollapse: 'collapse', marginTop: 4 }}>
                  <thead>
                    <tr>
                      <th align="left">部材</th>
                      <th align="right">必要（分）</th>
                      <th align="left">入力（分）</th>
                      <th align="left">判定</th>
                    </tr>
                  </thead>
                  <tbody>
                    {COMPONENTS.map((c) => {
                      const rating = componentRatings[c] ?? null
                      return (
                        <tr key={c}>
                          <td>{c}</td>
                          <td align="right">{requiredMinutes(c, storeys)}</td>
                          <td>
                            <select value={rating ?? ''} onChange={(e) => setComponentRating(c, e.target.value === '' ? null : Number(e.target.value))}>
                              <option value="">未入力</option>
                              {[30, 60, 90, 120, 150, 180].map((m) => (
                                <option key={m} value={m}>{m}</option>
                              ))}
                            </select>
                          </td>
                          <td>{judgeComponent(c, storeys, rating)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </section>
            ) : null}
            </details>
            <section style={{ marginBottom: 16 }}>
              <PermitFormImport />
            </section>

            <section style={{ marginBottom: 16 }}>
              <h3 style={{ fontSize: 14, margin: '8px 0 4px' }}>取り込んだ様式の欄（アプリが何をするか）</h3>
              <PermitFormPlan values={formValues} />
            </section>

            <section style={{ marginBottom: 16 }}>
              <h3 style={{ fontSize: 14, margin: '8px 0 4px' }}>設計から引き継いだ申請条件</h3>
              <PermitProjectFields project={project} inherited={resolvedProject.inherited} onChange={setProject} />
            </section>


          <section className="p5-output-save" aria-label="出力設定と保存">
            <h3>出力設定と保存</h3>
            <label>出力目的
              <select value={purpose} onChange={e=>{
                setPurpose(e.target.value)
                setIfcSchema(e.target.value==='permit'?'IFC2X3':'IFC4')
              }}>
                <option value="general">図面・BIMデータの共有</option>
                <option value="permit">建築確認申請用</option>
              </select>
            </label>
            <label>IFCの版
              <select value={ifcSchema} onChange={e=>setIfcSchema(e.target.value as 'IFC4'|'IFC2X3')}>
                <option value="IFC4">IFC4</option>
                <option value="IFC2X3">IFC2X3</option>
              </select>
            </label>
            <div className="p5-output-actions">
              <button type="button" disabled={pdfBusy||!drawingFiles.length} onClick={saveDrawingPdf}>図面をPDFで保存</button>
              <button type="button" disabled={!judgement} onClick={()=>withPrintTitle(pdfBaseName(projectName),()=>window.print())}>図書一覧を印刷・PDFに保存</button>
              <button type="button" disabled={!packageFiles} onClick={()=>downloadPackage()}>書類をZIPで保存</button>
              <button type="button" disabled={!Object.keys(floorPlans).length} onClick={()=>downloadIfc(ifcSchema)}>IFCを保存（{ifcSchema}）</button>
              <button data-tutorial="tutorial-save-all" className="p5-save-all" type="button" onClick={saveAll} disabled={pdfBusy||(!drawingFiles.length&&!documentFiles.length&&!Object.keys(formsNow).length&&!Object.keys(floorPlans).length)}>図面・書類・BIMデータを一括保存</button>
            </div>
            <p role="status">{pdfBusy?'PDFを作成しています…':''}</p>
            <p>図面はPDFで保存します。一括保存は図面（PDF）・記入済み書類・選択した版のIFCをZIPにまとめます。</p>
          </section>
        </section>
        <section className="p5-output-documents" aria-label="図書一覧">
          <h3>図書一覧</h3>
        <h3>出力できるもの</h3>
        <ul>{drawingFiles.map(f=><li key={f.path}>{f.path.replace(/\.svg$/i,'.pdf')}</li>)}{documentFiles.map(f=><li key={f.path}>{f.path}</li>)}{Object.keys(floorPlans).length>0&&<li>BIMデータ（平面から生成・未確定要素を除く）</li>}</ul>
        {!drawingFiles.length&&!documentFiles.length&&!Object.keys(floorPlans).length&&<p>まだありません。</p>}
        <h3>不足・要確認</h3><ul>{missingOutput.map((text,i)=><li key={i}>{text}</li>)}</ul>
        <p style={{fontSize:12}}>一括保存には出力一覧と不足内容も含めます。</p>

          {judgement ? <>
                <div className="permit-print">
                  <h2 style={{ fontSize: 18, margin: '0 0 4px' }}>建築確認申請 図書一覧</h2>
                  <p style={{ fontSize: 12, margin: '0 0 8px' }}>
                    申請者: {applicant.trim() === '' ? '未記入' : applicant} ／ 図枠: {frame}
                  </p>
                  <p style={{ fontSize: 12, margin: '0 0 8px' }}>{applicabilityTextOf(judgement)}</p>
                  <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 12 }}>
                    <thead>
                      <tr>
                        <th align="left" style={{ borderBottom: '1px solid #000' }}>区分</th>
                        <th align="left" style={{ borderBottom: '1px solid #000' }}>図書</th>
                        <th align="left" style={{ borderBottom: '1px solid #000' }}>理由</th>
                      </tr>
                    </thead>
                    <tbody>
                      {judgementRowsOf(judgement).map((r) => (
                        <tr key={`${r.kind}-${r.name}`}>
                          <td style={{ borderBottom: '1px solid #ccc', padding: '4px' }}>{r.kind}</td>
                          <td style={{ borderBottom: '1px solid #ccc', padding: '4px' }}>{r.name}</td>
                          <td style={{ borderBottom: '1px solid #ccc', padding: '4px' }}>{r.reason ?? ''}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div dangerouslySetInnerHTML={{ __html: frameSvg({ size: frameSizeOf(frame), values: {} }).svg }} />

                </div>

                <section style={{ marginBottom: 16 }}>
                  <h3 style={{ fontSize: 14, margin: '8px 0 4px' }}>図書の一覧（見て確かめる）</h3>
                  <PermitViewer
                    judgement={judgement}
                    docs={permitDocsJson.documents}
                    ifcText={ifcText}
                    drawingSvgs={drawingSvgs}
                    drawingReasons={drawingSvgs.reasons}
                    filledForms={filledNow}
                    checkOf={(name) => {
                      const c = legalCheckOfDoc(name, legal)
                      return c ? { text: c.text, color: TONE_COLOR[c.tone] } : null
                    }}
                  />
                </section>


          </> : <p>{outlineReason ?? '図書一覧の判定にはボリュームの外形が必要です。'}</p>}
        </section>
      </div>
      {devShown && <aside style={{ padding: 12, borderLeft: '1px solid #ddd8cc', background: '#fff', overflowY: 'auto' }}>
        {!rightShown('feature-adjust') || !devShown ? null : (
          <PanelTile title="機能の調整" onHide={() => usePanelTiles.getState().hideTile('feature-adjust')}>
            <h2>機能の調整</h2>
            <FeatureAdjustTile screen="P5" />
          </PanelTile>
        )}
      </aside>}
      <style>{`
        .p5-output-page{height:100%;min-height:0;overflow:auto;padding:24px;box-sizing:border-box}
        .p5-output-page>h2{font-size:18px;margin:0 0 20px}
        .p5-output-columns{display:grid;grid-template-columns:minmax(320px,0.9fr) minmax(0,1.3fr);gap:24px;align-items:start}
        .p5-output-inputs,.p5-output-documents{min-width:0;padding:20px;border:1px solid #d8e0e9;border-radius:10px}
        .p5-output-inputs>h3,.p5-output-documents>h3{margin-top:0}
        .p5-output-inputs>section,.p5-output-inputs>details{margin-bottom:20px}
        .p5-output-inputs input{max-width:100%;box-sizing:border-box}
        .p5-output-inputs ul{padding-left:1.5em;line-height:1.6}
        .p5-input-needed{color:#a86b00;font-size:12px}
        .p5-output-save{border-top:1px solid #d8e0e9;padding-top:16px}
        .p5-output-save>label{display:flex;align-items:center;gap:12px;margin:10px 0}
        .p5-output-save select{flex:1;min-width:0;padding:6px}
        .p5-output-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:16px}
        .p5-output-actions button{padding:8px 12px;border:1px solid #b5c6db;border-radius:6px;font:inherit;cursor:pointer}
        .p5-output-actions .p5-save-all{width:100%;background:#1f2a44;color:white}
        .p5-output-actions button:disabled{opacity:.5;cursor:default}
        .p5-output-save p{font-size:12px;color:#666;line-height:1.6}
        @media(max-width:850px){.p5-output-columns{grid-template-columns:1fr}}
        .permit-print{display:none}
        @media print{@page{size:${frame === 'A1' ? 'A1 landscape' : 'A3 landscape'};margin:12mm}body *{visibility:hidden}.permit-print,.permit-print *{visibility:visible}.permit-print{display:block;position:absolute;left:0;top:0;width:100%;color:#000;background:#fff}.p5-output-page{overflow:visible;height:auto}}
      `}</style>
    </div>
  )
}
