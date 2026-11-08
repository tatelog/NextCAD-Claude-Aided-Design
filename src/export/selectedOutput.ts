import type {PackageFile} from './permitPackage'
export type OutputSelection={drawings:boolean;documents:boolean;ifc:boolean}
export function selectedOutputFiles(selection:OutputSelection,drawings:PackageFile[],documents:PackageFile[],ifc:PackageFile[]):PackageFile[]{
 return [...(selection.drawings?drawings.map(f=>({...f,path:`図面/${f.path}`})):[]),...(selection.documents?documents.map(f=>({...f,path:`図書一覧/${f.path}`})):[]),...(selection.ifc?ifc.map(f=>({...f,path:`IFC/${f.path}`})):[])]
}
