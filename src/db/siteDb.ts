import type { Database } from 'sql.js'
import type { ConfirmedSite } from '../store/confirmedSite'
import type { DistrictLoad } from '../plateau/load'
export const siteKey=(site:ConfirmedSite)=>site.parcelUid ?? `point:${site.center.lat},${site.center.lon}`
export function createSiteTables(db:Database) {
 db.run(`PRAGMA foreign_keys=ON;
 CREATE TABLE IF NOT EXISTS planning_site(id TEXT PRIMARY KEY, parcel_uid TEXT, lat REAL NOT NULL, lon REAL NOT NULL, frame_json TEXT, road_edge INTEGER NOT NULL, road_width_mm REAL, road_source TEXT NOT NULL, updated_at TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS site_vertex(site_id TEXT REFERENCES planning_site(id) ON DELETE CASCADE, seq INTEGER, x REAL NOT NULL,y REAL NOT NULL,PRIMARY KEY(site_id,seq));
 CREATE TABLE IF NOT EXISTS site_edge(site_id TEXT REFERENCES planning_site(id) ON DELETE CASCADE, edge_index INTEGER,status TEXT NOT NULL,width_mm REAL,source TEXT, length_mm REAL NOT NULL,PRIMARY KEY(site_id,edge_index));
 CREATE TABLE IF NOT EXISTS site_road_candidate(site_id TEXT,edge_index INTEGER,road_id TEXT,source_url TEXT NOT NULL, width_class INTEGER,width_label TEXT,road_class INTEGER,road_state INTEGER,distance_mm REAL,overlap_mm REAL,PRIMARY KEY(site_id,edge_index,road_id),FOREIGN KEY(site_id,edge_index) REFERENCES site_edge(site_id,edge_index) ON DELETE CASCADE);
 CREATE TABLE IF NOT EXISTS site_source(site_id TEXT REFERENCES planning_site(id) ON DELETE CASCADE, kind TEXT, url TEXT,city_code TEXT,file_size INTEGER,status TEXT NOT NULL,PRIMARY KEY(site_id,kind));
 CREATE TABLE IF NOT EXISTS site_district(site_id TEXT,kind TEXT,ordinal INTEGER,external_id TEXT NOT NULL,function_code INTEGER,far_percent REAL,coverage_percent REAL,max_height_m REAL,min_height_m REAL,usage_code INTEGER,custodian TEXT,notification TEXT,geometry_json TEXT NOT NULL,PRIMARY KEY(site_id,kind,ordinal),FOREIGN KEY(site_id) REFERENCES planning_site(id) ON DELETE CASCADE);
 PRAGMA user_version=1;`)
}
export function saveSite(db:Database,site:ConfirmedSite,district:DistrictLoad|null) {
 const id=siteKey(site)
 db.run('BEGIN')
 try {
 const previous=rows(db,'SELECT lat,lon FROM planning_site WHERE id=?',id)[0]
 if(previous && (previous.lat!==site.center.lat || previous.lon!==site.center.lon)) {
   db.run('DELETE FROM site_district WHERE site_id=?',[id])
   db.run('DELETE FROM site_source WHERE site_id=?',[id])
 }
 db.run('INSERT INTO planning_site VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET parcel_uid=excluded.parcel_uid,lat=excluded.lat,lon=excluded.lon,frame_json=excluded.frame_json,road_edge=excluded.road_edge,road_width_mm=excluded.road_width_mm,road_source=excluded.road_source,updated_at=excluded.updated_at',[id,site.parcelUid,site.center.lat,site.center.lon,JSON.stringify(site.frame),site.roadEdge,site.roadWidthMm||null,site.roadSource,new Date().toISOString()])
 for(const table of ['site_vertex','site_edge'])db.run(`DELETE FROM ${table} WHERE site_id=?`,[id])
 site.lot?.forEach((p,i)=>db.run('INSERT INTO site_vertex VALUES(?,?,?,?)',[id,i,p.x,p.y]))
 site.roadLinks?.forEach(link=>{
 db.run('INSERT INTO site_edge VALUES(?,?,?,?,?,?)',[id,link.edgeIndex,link.status,link.adoptedWidthMm,link.adoptedSource??null,link.edgeLengthMm])
 link.candidates.forEach(c=>db.run('INSERT INTO site_road_candidate VALUES(?,?,?,?,?,?,?,?,?,?)',[id,link.edgeIndex,c.roadId,c.source,c.widthClass,c.widthLabel,c.roadClass,c.roadState,c.distanceMm,c.overlapMm]))
 })
 if(district){
 db.run('DELETE FROM site_district WHERE site_id=?',[id])
 db.run("INSERT OR REPLACE INTO site_source VALUES(?,?,?,?,?,?)",[id,'plateau',district.file?.url??null,district.file?.cityCode??null,district.file?.fileSize??null,'取得済み'])
 for(const kind of ['matches','fireMatches','heightMatches','fireUnknownOwner','heightUnknownOwner'] as const)district[kind].forEach((d,i)=>{
 db.run('INSERT INTO site_district VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)',[id,kind,i,d.id,d.function,'floorAreaRatePercent' in d?d.floorAreaRatePercent:null,'buildingCoverageRatePercent' in d?d.buildingCoverageRatePercent:null,'heightLimitM' in d?d.heightLimitM:'maximumBuildingHeightM' in d?d.maximumBuildingHeightM:null,'minimumBuildingHeightM' in d?d.minimumBuildingHeightM:null,'usage' in d?d.usage:null,'custodian' in d?d.custodian:null,d.notificationNumber,JSON.stringify(d.polygons)])
 })
 }
 db.run('COMMIT')
 }catch(error){db.run('ROLLBACK');throw error}
 return id
}
function rows(db:Database,sql:string,id:string):Record<string,any>[] {
 const stmt=db.prepare(sql);try{stmt.bind([id]);const result=[];while(stmt.step())result.push(stmt.getAsObject());return result}finally{stmt.free()}
}
export function readSite(db:Database,id:string):{site:ConfirmedSite;district:DistrictLoad|null}|null {
 const s=rows(db,'SELECT * FROM planning_site WHERE id=?',id)[0];if(!s)return null
 const vertices=rows(db,'SELECT x,y FROM site_vertex WHERE site_id=? ORDER BY seq',id)
 const roadLinks=rows(db,'SELECT * FROM site_edge WHERE site_id=? ORDER BY edge_index',id).map(e=>({edgeIndex:e.edge_index,status:e.status,adoptedWidthMm:e.width_mm,adoptedSource:e.source??undefined,edgeLengthMm:e.length_mm,candidates:rows(db,'SELECT * FROM site_road_candidate WHERE site_id=? ORDER BY edge_index,road_id',id).filter(c=>c.edge_index===e.edge_index).map(c=>({roadId:c.road_id,source:c.source_url,widthClass:c.width_class,widthLabel:c.width_label,roadClass:c.road_class,roadState:c.road_state,distanceMm:c.distance_mm,overlapMm:c.overlap_mm}))}))
 const source=rows(db,"SELECT * FROM site_source WHERE site_id=? AND kind='plateau'",id)[0]
 let district:DistrictLoad|null=null
 if(source){
 const records=rows(db,'SELECT * FROM site_district WHERE site_id=? ORDER BY ordinal',id)
 const groups:Record<string,any[]>={}
 for(const kind of ['matches','fireMatches','heightMatches','fireUnknownOwner','heightUnknownOwner'])groups[kind]=records.filter(r=>r.kind===kind).map(r=>({id:r.external_id,function:r.function_code,notificationNumber:r.notification,polygons:JSON.parse(r.geometry_json),...(kind==='matches'?{floorAreaRatePercent:r.far_percent,buildingCoverageRatePercent:r.coverage_percent,heightLimitM:r.max_height_m}:kind.startsWith('fire')?{custodian:r.custodian,usage:r.usage_code}:{custodian:r.custodian,maximumBuildingHeightM:r.max_height_m,minimumBuildingHeightM:r.min_height_m})}))
 district={file:source.url?{url:source.url,cityCode:source.city_code,fileSize:source.file_size}:null,districts:groups.matches!,matches:groups.matches!,fireMatches:groups.fireMatches!,heightMatches:groups.heightMatches!,fireUnknownOwner:groups.fireUnknownOwner!,heightUnknownOwner:groups.heightUnknownOwner!}
 }
 return {site:{parcelUid:s.parcel_uid,center:{lat:s.lat,lon:s.lon},frame:JSON.parse(s.frame_json),lot:vertices.length?vertices.map(p=>({x:p.x,y:p.y})):null,roadEdge:s.road_edge,roadWidthMm:s.road_width_mm??0,roadSource:s.road_source,roadLinks:roadLinks.length?roadLinks:undefined},district}
}
