import type {PackageFile} from './permitPackage'

let fontPromise:Promise<string>|undefined
function pdfFont():Promise<string>{
 return fontPromise??=(async()=>{
  const response=await fetch(`${import.meta.env.BASE_URL}fonts/MPLUS1p-Regular.ttf`)
  if(!response.ok)throw new Error('PDF用の日本語フォントを読み込めませんでした')
  const bytes=new Uint8Array(await response.arrayBuffer())
  let binary=''
  for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192))
  return btoa(binary)
 })().catch(error=>{fontPromise=undefined;throw error})
}

/** アプリ生成の図面をベクトルPDFへ変換。日本語フォントを埋め込む。 */
export async function drawingsPdf(svgs:string[]):Promise<Uint8Array>{
 if(!svgs.length)throw new Error('出力できる図面がありません')
 const [{jsPDF},font]=await Promise.all([import('jspdf'),pdfFont()])
 await import('svg2pdf.js')
 const pdf=new jsPDF({orientation:'landscape',unit:'mm',format:'a3',compress:true,putOnlyUsedFonts:true})
 pdf.addFileToVFS('MPLUS1p-Regular.ttf',font)
 for(const style of ['normal','bold','italic','bolditalic'])pdf.addFont('MPLUS1p-Regular.ttf','DrawingJP',style)
 for(let i=0;i<svgs.length;i++){
  const parsed=new DOMParser().parseFromString(svgs[i]!,'image/svg+xml')
  if(parsed.querySelector('parsererror')||parsed.documentElement.localName!=='svg')throw new Error('図面の形式を読み取れませんでした')
  const svg=document.importNode(parsed.documentElement,true) as unknown as SVGSVGElement
  const box=svg.getAttribute('viewBox')?.trim().split(/[\s,]+/).map(Number)
  const width=box?.[2]??parseFloat(svg.getAttribute('width')??'420')
  const height=box?.[3]??parseFloat(svg.getAttribute('height')??'297')
  if(!(width>0&&height>0))throw new Error('図面の用紙寸法が不正です')
  // 図枠のmm寸法を維持する。図面本体の座標や寸法値は変更しない。
  if(i===0)pdf.deletePage(1)
  pdf.addPage([width,height],width>height?'landscape':'portrait')
  svg.querySelectorAll('text,tspan').forEach(node=>{
   (node as SVGElement).style.fontFamily='DrawingJP'
   node.setAttribute('font-family','DrawingJP')
  })
  await pdf.svg(svg,{x:0,y:0,width,height})
 }
 return new Uint8Array(pdf.output('arraybuffer'))
}

export async function drawingPdfFiles(files:PackageFile[],convert=drawingsPdf):Promise<PackageFile[]>{
 const result:PackageFile[]=[]
 for(const file of files)result.push({path:file.path.replace(/\.svg$/i,'.pdf'),text:'',bytes:await convert([file.text])})
 return result
}
