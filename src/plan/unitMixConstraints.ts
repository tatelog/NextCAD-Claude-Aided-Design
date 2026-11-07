type FloorUnits={cells:readonly {id:string}[];unitTypeIdsByCell?:Record<string,string|null>}
export function validateUnitMix(minimum:Readonly<Record<string,number>>,available?:readonly string[]):void{
 for(const [type,count] of Object.entries(minimum)){
  if(!Number.isSafeInteger(count)||count<0)throw new Error('最低戸数は0以上の整数で指定してください')
  if(count>0&&available&&!available.includes(type))throw new Error(`${type} は今回の条件で配置できる住戸タイプに含まれていません`)
 }
}
/** コア・外形との調整後に残った住戸で、階ごとの最低構成を検査する。 */
export function unitMixIssues(plans:Record<number,FloorUnits>,minimum:Readonly<Record<string,number>>):string[]{
 validateUnitMix(minimum)
 const issues:string[]=[]
 for(const [floor,plan] of Object.entries(plans))for(const [type,required] of Object.entries(minimum)){
  const count=plan.cells.filter(c=>plan.unitTypeIdsByCell?.[c.id]===type).length
  if(count<required)issues.push(`${floor}階：${type} は最低${required}戸に対して${count}戸です`)
 }
 return issues
}
