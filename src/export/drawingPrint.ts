import {pdfBaseName,withPrintTitle} from './pdfName'
export function drawingPrintDocument(svgs:string[],title='建築確認申請の図面'):string{
 const escaped=title.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!))
 return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><title>${escaped}</title><style>@page{size: A3 landscape;margin:0}*{box-sizing:border-box}body{margin:0}.drawing-page{width:420mm;height:297mm;break-after:page}.drawing-page:last-child{break-after:auto}.drawing-page>svg{display:block;width:100%;height:100%;object-fit:contain}</style></head><body>${svgs.map(svg=>`<section class="drawing-page">${svg}</section>`).join('')}</body></html>`
}
export function printDrawings(svgs:string[],projectName=''){
 const title=pdfBaseName(projectName)
 const frame=document.createElement('iframe');frame.title='図面のPDF保存';frame.style.cssText='position:fixed;width:1px;height:1px;left:-10000px;top:0;border:0';
 frame.onload=()=>{const win=frame.contentWindow;if(!win)return;win.onafterprint=()=>frame.remove();win.focus();withPrintTitle(title,()=>win.print(),win)};frame.srcdoc=drawingPrintDocument(svgs,title);document.body.appendChild(frame)
}
