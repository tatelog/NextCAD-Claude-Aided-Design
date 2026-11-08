export function RecordPagination({label,page,pages,total,onPage}:{label:string;page:number;pages:number;total:number;onPage:(page:number)=>void}){
 return <nav aria-label={`${label}のページ切替`} style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap',margin:'8px 0',fontSize:12}}>
 <span>{label}：全{total.toLocaleString()}件／{page+1}ページ目（30件ずつ）</span>
 <button type="button" disabled={page===0} onClick={()=>onPage(page-1)}>前へ</button>
 <button type="button" disabled={page+1>=pages} onClick={()=>onPage(page+1)}>次へ</button>
 </nav>
}
