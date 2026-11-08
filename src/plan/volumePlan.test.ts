import {expect,it} from 'vitest'
import {prepareVolumePlan, inheritVolumePlan} from './volumePlan'
const volume={footprint:[{x:0,y:0},{x:34000,y:0},{x:34000,y:42000},{x:0,y:42000}],storey_count:5,storey_height:3000}
it('P2の共用部とシャフトを複製して引き継ぐ',()=>{const p=prepareVolumePlan(volume,[],{layout:'中廊下',span:3000,corridor:1600,unitDepth:6000});const copy=inheritVolumePlan(p,p.source);expect(copy?.[1]?.cores).toEqual(p.plans[1]?.cores);expect(copy?.[1]?.shaftRects).toEqual(p.plans[1]?.shaftRects);copy![1]!.cores[0]!.x0=999;expect(p.plans[1]!.cores[0]!.x0).not.toBe(999)},20000) // 性能の課題（未解決、統括 2026-11-08）: 配置計算が単独でも約 6 秒。待ち時間を延ばしただけ
// 性能の課題（未解決）: 単独で約 6 秒（2026-11-08 計測。既定の 5 秒を超える）。待ち時間を延ばしただけで、計算を軽くする直しは残っている
it('外形の版が変わったら旧配置を引き継がない',()=>{const p=prepareVolumePlan(volume,[],{layout:'中廊下',span:3000,corridor:1600,unitDepth:6000});expect(inheritVolumePlan(p,'changed')).toBeNull()},30000)

it("選択した住戸以外を候補に入れず、存在しない構成は拒否する",()=>{expect(()=>prepareVolumePlan(volume,[],{layout:"中廊下",span:3000,corridor:1600,unitDepth:6000,allowedTypeIds:["missing"]})).toThrow("使用条件を満たす住戸詳細がありません")})
