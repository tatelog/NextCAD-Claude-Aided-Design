export function parseMinimumUnits(values:Readonly<Record<string,string>>):Record<string,number>{
 const result:Record<string,number>={}
 for(const [type,text] of Object.entries(values)){
  if(!text.trim())continue
  const count=Number(text)
  if(!Number.isSafeInteger(count)||count<0)throw new Error('住戸タイプの最低戸数は0以上の整数で入力してください')
  if(count)result[type]=count
 }
 return result
}
