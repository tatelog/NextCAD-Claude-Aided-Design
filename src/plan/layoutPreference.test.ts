import {it,expect} from 'vitest'
import {preferLayout} from './layoutPreference'
const a={privateM2:100,maxSharedRouteM:1,maxNearestStairM:20,maxSecondStairM:40,meanElevatorM:15}
it('同じ専有面積なら最も遠い住戸の階段アクセスを短くする',()=>{expect(preferLayout({...a,maxNearestStairM:15},a)).toBe(true)})
it('階段距離も同じならEVの平均アクセスを短くする',()=>{expect(preferLayout({...a,meanElevatorM:10},a)).toBe(true)})
it('動線短縮だけで専有面積の小さい案へ置き換えない',()=>{expect(preferLayout({...a,privateM2:90,maxNearestStairM:10},a)).toBe(false)})
it('未確認の動線距離をゼロ扱いして優先しない',()=>{expect(preferLayout({...a,maxNearestStairM:Infinity},a)).toBe(false)})

it('同じ専有面積なら二つの階段への重複区間が短い案を優先する',()=>{
 const common={...a,maxSharedRouteM:8,maxSecondStairM:40}
 expect(preferLayout({...common,maxSharedRouteM:2,meanElevatorM:20},common)).toBe(true)
})
it('重複区間と最寄階段が同じなら遠い方の階段への最大距離を短くする',()=>{
 const common={...a,maxSharedRouteM:1,maxSecondStairM:50}
 expect(preferLayout({...common,maxSecondStairM:40,meanElevatorM:20},common)).toBe(true)
})
it('重複区間が未確認の案を既知の案より有利に扱わない',()=>{
 const common={...a,maxSharedRouteM:1,maxSecondStairM:50}
 expect(preferLayout({...common,maxSharedRouteM:Infinity,meanElevatorM:10},common)).toBe(false)
})
it('同面積・構成成立の候補なら戸数が多い案を優先できる',()=>{
 expect(preferLayout({...a,unitCount:12},{...a,unitCount:10})).toBe(true)
})
