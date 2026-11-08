/** 日本時間の保存日。Windowsで使用できない名前の文字は置換する。 */
export function pdfBaseName(name:string,now=new Date()):string{
 const date=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'}).format(now).replace(/-/g,'')
 const safe=name.trim().replace(/[<>:"/\\|?*\x00-\x1f]/g,'_').replace(/[. ]+$/,'')||'名称未設定'
 return `${date}_${safe}`
}
/** 印刷中だけ親文書にも名前を設定する（ブラウザによる参照先の違いを吸収）。 */
export function withPrintTitle(title:string,print:()=>void,target:Window=window){
 const previous=document.title
 const restore=()=>{if(document.title===title)document.title=previous;target.removeEventListener('afterprint',restore)}
 document.title=title;target.addEventListener('afterprint',restore,{once:true})
 try{print()}catch(e){restore();throw e}
}
