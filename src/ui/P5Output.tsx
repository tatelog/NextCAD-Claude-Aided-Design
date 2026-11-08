import {floorAreaSheet,vicinitySheet} from '../export/additionalSheets'
import {PermitInformationTile} from './PermitInformationTile'
import {PermitTextCsv} from './PermitTextCsv'
import {usePermitText} from '../store/permitText'
import {pdfBaseName} from '../export/pdfName'
import {outputConditionNotes,withDrawingRemarks} from '../permit/outputConditionNotes'
import permitFormsJson from '../law/permitForms.json'
import { type FormDef } from '../law/permitFormPlan'
import { fillInstructionsOf } from '../law/permitFormFill'
import { fillDocx } from '../export/docxWrite'
import {selectedOutputFiles,type OutputSelection} from '../export/selectedOutput'
import {resolvePermitProject} from '../permit/resolvePermitProject'
import {useFixtures} from '../store/fixtures'
import {readUnitPlan} from '../plan/unitPlan39'
import {useBimSettings,drawingDimensions} from '../store/bimSettings'
import {exportConfiguredPlan} from '../bimExchange/integration/exportConfiguredPlan'
import {drawingPdfFiles} from '../export/drawingPdf'
import {useFloorPlans} from '../store/floorPlans'
import {useSolarSettings} from '../store/solarSettings'
import {detailedFloorSvg,shadowSheetSvg} from '../export/designSheets'
import {cutFloorParts} from '../volume/slope'
import {tutorialDone} from '../tutorial/state'
// P5 出力（D-04 P5、D-02 C9・C10・C11、t91・G46）。IFC と確認申請の図書は、P2 で描いた外形から作る。
// 図書の一覧は判定（requiredPermitDocuments）の結果で出す。要る・要らない（理由）・要確認（理由）の三区分。要確認は隠さない。
// 外形が閉じていなければ IFC と判定は出さず、「外形が未作成」と出す（ダミーの外形では代えない）。
// 部材寸法は平面画面の設定を使用する。
import { useEffect, useMemo, useState } from 'react'

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
  const [outputSelection,setOutputSelection]=useState<OutputSelection>({drawings:true,documents:true,ifc:true})
  const [ifcSchema, setIfcSchema] = useState<'IFC4' | 'IFC2X3'>('IFC4')
  const [frame, setFrame] = useState<'A3横' | 'A1'>('A3横')
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
  const automaticFire = fireLabelOf(districtForForm === null ? null : { functions: districtForForm.fireMatches.map(f => f.function), unknownOwner: districtForForm.fireUnknownOwner.length })
  const conditionNotes = useMemo(() => outputConditionNotes(project, automaticFire), [project, automaticFire])
  const csvTextValues=usePermitText(s=>s.values)
  const applicant=csvTextValues['F2-1-02']?.value ?? csvTextValues['F8-1-02']?.value ?? csvTextValues['F8E-1-02']?.value ?? ''
  const automaticFormValues = useMemo(() => {
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
    const values: import('../law/permitFormPlan').ValueMap = formValuesFromVolume(permitVolume, {
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
    const plans=Object.entries(floorPlans)
    if(plans.length){
      const ev=plans.reduce((n,[,p])=>n+p.cores.reduce((sum,c)=>sum+(c.evCount??0),0),0)
      values['F2-4-10']={value:`保存済み平面 ${plans.length}階分・EV配置 ${ev}箇所（各階の配置数）`,from:'平面'}
      values['F2-4-18']={value:plans.map(([floor,p])=>`${floor}階：${p.unitsPerFloor}戸`).join(' ／ '),from:'平面'}
    }
    values['F2-5-05']={value:`${height} mm`,from:'ボリューム'}
    for(const id of ['F2-3-08.INFO','F3-2-08.INFO','F2-4-02.INFO'])values[id]={value:APP_USAGE,from:'案件'}
    return values
  }, [permitVolume, confirmedForForm, districtForForm, floorPlans, height])
  const formValues=useMemo(()=>({...csvTextValues,...automaticFormValues}),[csvTextValues,automaticFormValues])
  const ifcText=null
  // 配置図と各階平面図の中身（図枠の作図領域の中）。元のデータが無いものは null
  const confirmedNow = useConfirmedSite((s) => s.confirmed)
  const buildingsNow = useConfirmedSite((s) => s.buildings)
  const planResult = useSite((s) => s.plan)
  const twinNote=Object.values(floorPlans).some(p=>p.layout==='ツイン')?'ツインの吹抜けは各階平面図に反映しています。3D・IFC・申請様式の床面積・日影図は外形モデルのままで、吹抜け未反映です。':null
  const selectedFloor=useFloorPlans(s=>s.selected)
  const solarDate=useSolarSettings(s=>s.date)
  const [vicinity,setVicinity]=useState<{svg:string|null;reason:string}>({svg:null,reason:'敷地位置を確定してください'})
  const lat=confirmedNow?.center.lat,lon=confirmedNow?.center.lon
  useEffect(()=>{
    if(lat===undefined||lon===undefined){setVicinity({svg:null,reason:'敷地位置を確定してください'});return}
    const controller=new AbortController()
    setVicinity({svg:null,reason:'周辺地図を読み込み中です'})
    vicinitySheet({lat,lon},controller.signal).then(svg=>{if(!controller.signal.aborted)setVicinity({svg,reason:''})}).catch(e=>{if(!controller.signal.aborted)setVicinity({svg:null,reason:String(e.message??e)})})
    return ()=>controller.abort()
  },[lat,lon])
  const areaSheets=useMemo(()=>Object.entries(floorPlans).map(([floor,p])=>{
    try{return {floor:Number(floor),svg:floorAreaSheet(p,Number(floor)),reason:''}}
    catch(e){return {floor:Number(floor),svg:null,reason:String(e instanceof Error?e.message:e)}}
  }),[floorPlans])
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
      vicinity:vicinity.svg,
      floorArea:(areaSheets.find(s=>s.floor===selectedFloor)??areaSheets[0])?.svg??null,
      site: siteState.kind === 'ok' ? withDrawingRemarks(sheet(siteState.body, siteState.denominator), conditionNotes, true) : null,
      floorPlan: withDrawingRemarks(floorLayout, conditionNotes),
      shadow:withDrawingRemarks(shadowSvg, conditionNotes), floors: floors.map(f=>({...f,svg:withDrawingRemarks(f.svg,conditionNotes)!})),
      // 作れないときの理由（縮尺が無い・敷地を確定していない で言い分ける）
      reasons: { vicinity:vicinity.reason, floorArea:(areaSheets.find(s=>s.floor===selectedFloor)??areaSheets[0])?.reason||'各階平面を保存してください', site: siteMissingTextOf(siteState) ?? DRAWING_MISSING_DEFAULT.site, floorPlan: DRAWING_MISSING_DEFAULT.floorPlan },
    }
  }, [vicinity,areaSheets,conditionNotes,settings,frame, confirmedNow, buildingsNow, outline, planResult, floorPlans,selectedFloor,solarDate,slopeBoundaries,storeys,height])

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
        ...conditionNotes,
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
  }, [conditionNotes,twinNote, judgement, drawingSvgs, ifcText, filledNow, formValues, formsNow, districtForForm])

  const drawingFiles: import('../export/permitPackage').PackageFile[] = [
    ...(vicinity.svg?[{path:'付近見取図.svg',text:vicinity.svg}]:[]),
    ...areaSheets.flatMap(s=>s.svg?[{path:`${s.floor}階床面積求積図.svg`,text:s.svg}]:[]),
    ...(drawingSvgs.site ? [{path:'配置図.svg', text:drawingSvgs.site}] : []),
    ...drawingSvgs.floors.map(f=>({path:`${f.name}.svg`,text:f.svg})),
    ...(!drawingSvgs.floors.length && drawingSvgs.floorPlan ? [{path:'平面図.svg',text:drawingSvgs.floorPlan}] : []),
    ...(drawingSvgs.shadow ? [{path:'日影図.svg',text:drawingSvgs.shadow}] : []),
  ]

  const documentFiles=Object.values(filledNow).flatMap(f=>f?[{path:f.fileName,text:'',bytes:f.bytes}]:[])
  const missingOutput=[
    ...(!vicinity.svg?[`付近見取図：${vicinity.reason}`]:[]),
    ...areaSheets.filter(s=>!s.svg).map(s=>`${s.floor}階床面積求積図：${s.reason}`),
    ...(!drawingSvgs.site?['配置図：敷地・外形を確認してください']:[]),
    ...Array.from({length:storeys},(_,i)=>i+1).filter(f=>!floorPlans[f]).map(f=>`${f}階平面図：未作成`),
    ...(!drawingSvgs.shadow?['日影図：敷地・外形・地点が必要です']:[]),
    ...(!documentFiles.length?['申請書類：様式を取り込み、記入済みの書類を作成してください']:[]),
    ...unwrittenNotesOf(formsNow,formValues),
    ...Object.entries(project).filter(([,v])=>v===null).map(([k])=>`申請条件：${({inShadowRegulationArea:'日影規制区域',structuralCalc:'構造計算',hasAgent:'代理申請',bimSubmission:'BIMでの申請',usesCertifiedParts:'認定部材',hasBuildingEquipment:'建築設備',hasElevator:'昇降機'} as Record<string,string>)[k]}が未入力`),
  ]
  const canSaveSelected=(outputSelection.drawings&&drawingFiles.length>0)||(outputSelection.documents&&(Boolean(packageFiles)||documentFiles.length>0||Object.keys(formsNow).length>0))||(outputSelection.ifc&&Object.keys(floorPlans).length>0)
  const saveAll=async()=>{if(pdfBusy||!canSaveSelected)return;setPdfBusy(true);try{
    let data:import('../export/permitPackage').PackageFile[]=[]
    const documents=outputSelection.documents?[...documentFiles]:[]
    for(const [kind,form] of Object.entries(outputSelection.documents?formsNow:{})){
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
    if(outputSelection.ifc&&Object.keys(floorPlans).length){try{
      const out=exportConfiguredPlan({source:useFloorPlans.getState().source,plans:floorPlans,storeyHeightMm:height,ifcSchema},settings)
      data=out.files;missing.push(...out.manifest.issues.map(i=>i.message))
    }catch(e){throw new Error(`IFCの出力に失敗しました：${e instanceof Error?e.message:String(e)}`)}}else if(outputSelection.ifc) missing.push('BIMデータ：平面が未作成')
    const listFiles=(packageFiles??[]).filter(f=>!f.path.includes('/'))
    if(outputSelection.documents&&!listFiles.length)listFiles.push({path:'図書一覧.txt',text:['図書一覧',...documents.map(f=>f.path),'',...conditionNotes,'',...missing].join('\n')})
    const files=selectedOutputFiles(outputSelection,outputSelection.drawings?await drawingPdfFiles(drawingFiles):[],[...listFiles,...documents],data.filter(f=>f.path.toLowerCase().endsWith('.ifc')))
    if(!files.length)throw new Error('選択した対象に出力できるファイルがありません')
    const enc=new TextEncoder(),bytes=buildZip(files.map(f=>({path:f.path,data:f.bytes??enc.encode(f.text)})))
    const url=URL.createObjectURL(new Blob([bytes as BlobPart],{type:'application/zip'})),a=document.createElement('a')
    a.href=url;a.download=pdfBaseName(projectName)+'_選択出力.zip';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);setExportError('');tutorialDone('tutorial-save-all')
  }catch(e){setExportError(e instanceof Error?e.message:String(e))}finally{setPdfBusy(false)}}

  const legal = { roadSlope, shadow, applicantFilled: applicant.trim() !== '' }

  return (
    <div data-tutorial="tutorial-output" className="p5-output-page">
      <h2>出力</h2>
      {twinNote && <p role="note">{twinNote}</p>}
      {exportError && <p role="alert">{exportError}</p>}
      <div className="p5-output-columns">
        <section className="p5-output-inputs" aria-label="建築概要・入力項目">
          <section>
            <PermitTextCsv designValues={automaticFormValues} />
          </section>
          <section id="permit-create" style={{ marginBottom: 16 }}>
            <h3>空の申請書類を添付</h3>
            <p>様式を添付すると、申請者と設計データを自動記入します。このページで記入内容を確認して、一括保存できます。</p>
            <PermitFormImport />
          </section>
          <PermitInformationTile values={formValues}>
            <details><summary>設計情報・図面の前提</summary>
            <PermitProjectFields project={project} inherited={resolvedProject.inherited} onChange={setProject} />
            <p style={{fontSize:13}}>防火地域：{automaticFire ?? '未取得・未確定'}（敷地情報から反映）</p>
            <details style={{fontSize:12}}><summary>図面の備考に記載する前提</summary><ul>{conditionNotes.map(note=><li key={note}>{note}</li>)}</ul></details>
            </details>
            <PermitFormPlan values={formValues} />
          </PermitInformationTile>




          <section className="p5-output-save" aria-label="出力設定と保存">
            <h3>出力設定と保存</h3>
            <fieldset style={{border:0,padding:0,margin:'0 0 8px'}}>
              <legend style={{fontSize:13,marginBottom:4}}>出力する対象（複数選択可）</legend>
              <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                {([['drawings','図面'],['documents','図書一覧'],['ifc','IFC']] as const).map(([key,label])=><label key={key} style={{display:'flex',alignItems:'center',gap:6,padding:'2px 0',margin:0,minHeight:24,fontSize:13,cursor:'pointer'}}><input type="checkbox" checked={outputSelection[key]} onChange={e=>setOutputSelection(s=>({...s,[key]:e.target.checked}))}/>{label}</label>)}
              </div>
            </fieldset>
            <fieldset style={{border:0,padding:0,margin:'0 0 8px'}}>
              <legend style={{fontSize:13,marginBottom:4}}>図枠（用紙サイズ）</legend>
              <div style={{display:'flex',gap:16}}>
                {(['A3横','A1'] as const).map(f=><label key={f} style={{display:'flex',alignItems:'center',gap:6,padding:'2px 0',margin:0,minHeight:24,minWidth:68,fontSize:13,cursor:'pointer'}}><input type="radio" name="output-frame" checked={frame===f} onChange={()=>setFrame(f)}/>{f==='A1'?'A1横':'A3横'}</label>)}
              </div>
            </fieldset>
            <label>IFCの版
              <select disabled={!outputSelection.ifc} value={ifcSchema} onChange={e=>setIfcSchema(e.target.value as 'IFC4'|'IFC2X3')}>
                <option value="IFC4">IFC4</option>
                <option value="IFC2X3">IFC2X3（建築確認申請用）</option>
              </select>
            </label>
            <p style={{fontSize:12,color:'#526174',margin:'4px 0 12px'}}>※ このアプリの建築確認申請用出力では、IFC2X3を使用します。</p>
            <div className="p5-output-actions">
              <button data-tutorial="tutorial-save-all" className="p5-save-all" type="button" onClick={saveAll} disabled={pdfBusy||!canSaveSelected}>選択した対象をまとめて保存</button>
            </div>
            <p role="status">{pdfBusy?'出力ファイルを作成しています…':''}</p>
            <p style={{fontSize:12}}>図面はPDF、図書一覧は一覧・確認事項と記入済みWord、IFCは選択した版で出力し、ZIPにまとめます。</p>
          </section>
        </section>
        <section className="p5-output-documents" aria-label="図書一覧">
          <h3>図書一覧</h3>
        <p style={{fontSize:12}}>● 作成済み　○ 出力対応・未作成　△ 作成候補（未実装）　— 外部で用意</p>
          {judgement ? <>
                <div className="permit-print">
                  <h2 style={{ fontSize: 18, margin: '0 0 4px' }}>建築確認申請 図書一覧</h2>
                  <p style={{ fontSize: 12, margin: '0 0 8px' }}>
                    申請者: {applicant.trim() === '' ? '未記入' : applicant} ／ 図枠: {frame === 'A1' ? 'A1横' : frame}
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

          </> : null}
                <section style={{ marginBottom: 16 }}>

                  <PermitViewer
                    judgement={judgement}
                    docs={permitDocsJson.documents}
                    ifcText={ifcText}
                    ifcReady={Object.keys(floorPlans).length>0}
                    ifcSchema={ifcSchema}
                    drawingSvgs={drawingSvgs}
                    drawingReasons={drawingSvgs.reasons}
                    filledForms={filledNow}
                    formValues={formValues}
                    importedForms={formsNow}
                    checkOf={(name) => {
                      const c = legalCheckOfDoc(name, legal)
                      return c ? { text: c.text, color: TONE_COLOR[c.tone] } : null
                    }}
                  />
                </section>

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
