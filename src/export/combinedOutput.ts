import type {PackageFile} from './permitPackage'
export function combinedOutputFiles(drawings:PackageFile[],documents:PackageFile[],data:PackageFile[],missing:string[]):PackageFile[]{
 const files=[...drawings.map(f=>({...f,path:`図面/${f.path}`})),...documents.map(f=>({...f,path:`書類/${f.path}`})),...data.map(f=>({...f,path:`データ/${f.path}`}))]
 return [...files,{path:'出力一覧.txt',text:['出力したファイル',...files.map(f=>f.path),'','不足・要確認',...(missing.length?missing:['なし'])].join('\n')}]
}
