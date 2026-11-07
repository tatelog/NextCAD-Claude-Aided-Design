import {it,expect} from 'vitest'
import {routePairMetrics} from './routePair'
it('玄関から分岐までの共通区間と各階段までの距離を測る',()=>{const a=[{x:0,y:0},{x:800,y:0},{x:800,y:-5000}],b=[{x:0,y:0},{x:800,y:0},{x:800,y:7000}];expect(routePairMetrics(a,b)).toEqual({firstMm:5800,secondMm:7800,sharedMm:800,distinctDestinations:true})})
it('途中まで同じ向きに進む区間も共通距離へ含める',()=>{const a=[{x:0,y:0},{x:800,y:0},{x:800,y:3000}],b=[{x:0,y:0},{x:800,y:0},{x:800,y:7000}];expect(routePairMetrics(a,b).sharedMm).toBe(3800)})
it('同じ階段入口は別の行先としない',()=>{const a=[{x:0,y:0},{x:800,y:0}];expect(routePairMetrics(a,a).distinctDestinations).toBe(false)})
