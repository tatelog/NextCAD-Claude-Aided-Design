const KEY='cad-tutorial-dismissed-v1'
let dismissed=false
type StorageLike=Pick<Storage,'getItem'|'setItem'>
export function shouldStart(storage:StorageLike){try{return !dismissed&&storage.getItem(KEY)!=='yes'}catch{return !dismissed}}
export function saveDismissed(storage:StorageLike){dismissed=true;try{storage.setItem(KEY,'yes')}catch{/* この訪問中は終了状態を保つ */}}
