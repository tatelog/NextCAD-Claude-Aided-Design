export function recordPage<T>(rows:readonly T[],requested:number,size=30){
 const pages=Math.max(1,Math.ceil(rows.length/size)),page=Math.min(Math.max(0,requested),pages-1)
 return {items:rows.slice(page*size,(page+1)*size),page,pages,total:rows.length}
}
