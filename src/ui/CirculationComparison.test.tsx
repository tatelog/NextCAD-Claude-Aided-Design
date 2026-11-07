// 代表の動線を念頭に置いた比較要件。室内を含まない共用経路として距離を明示する。
import {it,expect} from 'vitest'
import {renderToStaticMarkup} from 'react-dom/server'
import {CirculationComparison} from './CirculationComparison'
it('形式ごとに重複区間・最寄りと遠い階段・EVの距離を示す',()=>{
 const html=renderToStaticMarkup(<CirculationComparison options={[{name:'ツイン',metrics:{privateM2:100,maxSharedRouteM:.8,maxNearestStairM:20,maxSecondStairM:40,meanElevatorM:15}}]}/>);
 for(const text of ['ツイン','重複区間（最大）','最寄りの階段（最大）','遠い方の階段（最大）','EV（平均）','0.8 m','20.0 m','40.0 m','15.0 m','室内は含みません'])expect(html).toContain(text)
})
it('不明な距離をゼロと表示しない',()=>{
 const html=renderToStaticMarkup(<CirculationComparison options={[{name:'中廊下',metrics:{privateM2:100,maxSharedRouteM:Infinity,maxNearestStairM:Infinity,maxSecondStairM:Infinity,meanElevatorM:Infinity}}]}/>);
 expect(html).toContain('未確認');expect(html).not.toContain('0.0 m');expect(html).not.toContain('Infinity')
})
