import type {PermitProject} from '../law/permitInput'
const labels: Record<keyof PermitProject,string> = {hasElevator:'昇降機',hasBuildingEquipment:'建築設備',inShadowRegulationArea:'日影規制区域',structuralCalc:'構造計算',hasAgent:'代理申請',bimSubmission:'BIM申請',usesCertifiedParts:'認定部材'}
export function outputConditionNotes(project:PermitProject,fire:string|null):string[]{
 return ['計画前提：RC造・共同住宅・新築',`防火地域：${fire??'未取得・未確定'}`,...Object.entries(labels).map(([key,label])=>`${label}：${project[key as keyof PermitProject]===null?'未確認':project[key as keyof PermitProject]?'あり':'なし'}`),'未確認事項は判定を保留。概算設計は申請適合の確認ではありません。']
}
const esc=(s:string)=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
export function withDrawingRemarks(svg:string|null,notes:string[],framed=false):string|null {
 if(!svg)return null
 const box=svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/)
 if(!box)return svg
 const w=Number(box[1]),h=Number(box[2]),x=framed?20:12,y=framed?h-60:h-15,width=framed?w-210:w-24
 const text='備考：'+notes.join(' ／ '),count=Math.floor((width-4)/2.5)
 const lines=Array.from(text.match(new RegExp(`.{1,${count}}`,'gu'))??[])
 const height=framed?50:13
 const body=`<g data-role="output-remarks"><rect x="${x}" y="${y}" width="${width}" height="${height}" fill="white" stroke="#777" stroke-width="0.2"/>${lines.map((line,i)=>`<text x="${x+2}" y="${y+3+i*3}" font-size="2.5" font-family="sans-serif">${esc(line)}</text>`).join('')}</g>`
 return svg.replace(/<\/svg>\s*$/,body+'</svg>')
}
