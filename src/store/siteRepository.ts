import { useEffect } from 'react'
import { create } from 'zustand'
import initSqlJs, { type Database } from 'sql.js'
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url'
import { createSiteTables, saveSite, readSite, siteKey } from '../db/siteDb'
import { useConfirmedSite } from './confirmedSite'
import { useSite } from './site'

type RecordData=NonNullable<ReturnType<typeof readSite>>
export const useSiteRepository=create<{active:RecordData|null;siteId:string|null;error:string|null;ready:boolean}>(()=>({active:null,siteId:null,error:null,ready:false}))
function stored(bytes?:Uint8Array):Promise<Uint8Array|undefined>{
 return new Promise((resolve,reject)=>{
 const request=indexedDB.open('planning-site-sqlite',1)
 request.onupgradeneeded=()=>request.result.createObjectStore('database')
 request.onerror=()=>reject(request.error)
 request.onsuccess=()=>{const db=request.result;const tx=db.transaction('database',bytes?'readwrite':'readonly');const store=tx.objectStore('database');const op=bytes?store.put(bytes,'sqlite'):store.get('sqlite');let value:Uint8Array|undefined
 op.onsuccess=()=>{if(!bytes)value=op.result};tx.oncomplete=()=>{db.close();resolve(value)};tx.onerror=()=>{db.close();reject(tx.error)};tx.onabort=()=>{db.close();reject(tx.error)}
 }
 })
}
let opening:Promise<void>|null=null
let database:Database|null=null
let persistQueue=Promise.resolve()
const fail=(e:unknown)=>useSiteRepository.setState({error:`敷地DB：${e instanceof Error?e.message:String(e)}`})
function sync(){
 if(!database)return
 const state=useConfirmedSite.getState(),site=state.confirmed
 if(!site){useSiteRepository.setState({active:null,siteId:null});return}
 try {
 const point=state.districtPoint
 const matching=point?.lat===site.center.lat&&point?.lon===site.center.lon
 const district=matching?state.district.data:null
 const id=saveSite(database,site,district)
 database.run("CREATE TABLE IF NOT EXISTS site_selection (singleton INTEGER PRIMARY KEY CHECK(singleton=1),site_id TEXT REFERENCES planning_site(id))")
 database.run("INSERT OR REPLACE INTO site_selection VALUES(1,?)",[id])
 const active=readSite(database,id)!
 useSiteRepository.setState({active,siteId:id,error:null})
 // SQLiteの読取結果を既存画面の共有状態へ投影する。
 useSite.getState().setMatches(active.district?.matches??null)
 const bytes=database.export()
 persistQueue=persistQueue.then(()=>stored(bytes)).then(()=>undefined).catch(fail)
 }catch(e){fail(e)}
}
export function openSiteRepository(){
 if(opening)return opening
 opening=(async()=>{
 const SQL=await initSqlJs({locateFile:()=>wasmUrl})
 const bytes=await stored();database=bytes?new SQL.Database(bytes):new SQL.Database();createSiteTables(database)
 const before=useConfirmedSite.getState()
 if(!before.confirmed&&!before.currentSite){
 const selection=database.exec("SELECT name FROM sqlite_master WHERE name='site_selection'")
 if(selection.length){const id=database.exec('SELECT site_id FROM site_selection WHERE singleton=1')[0]?.values[0]?.[0];const saved=typeof id==='string'?readSite(database,id):null
 if(saved){useConfirmedSite.setState({confirmed:saved.site,currentSite:saved.site.center,roadEdge:saved.site.roadEdge,roadWidth:saved.site.roadWidthMm?String(saved.site.roadWidthMm):'',roadSource:saved.site.roadSource,districtPoint:saved.site.center,district:{data:saved.district,loading:false,error:null}});useSite.setState({parcelUid:saved.site.parcelUid,parcel:saved.site.lot})}
 }
 }
 sync()
 useConfirmedSite.subscribe((s,p)=>{if(s.confirmed!==p.confirmed||s.district!==p.district)sync()})
 useSiteRepository.setState({ready:true})
 })().catch(fail)
 return opening
}
export function useSiteDatabase(){useEffect(()=>{void openSiteRepository()},[])}
export { siteKey }
