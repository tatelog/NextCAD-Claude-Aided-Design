import { describe, it, expect } from 'vitest'
import { lineClick, lineEnd } from './twoPointLine'

describe('直線は二点を選んで確定する', () => {
  it('一点目だけでは確定しない', () => {
    expect(lineClick(null, {x:10,y:20}, false)).toEqual({start:{x:10,y:20},commit:null})
  })
  it('二点目で一本を確定し次の一点目待ちに戻る', () => {
    expect(lineClick({x:10,y:20},{x:90,y:55},false)).toEqual({start:null,commit:[{x:10,y:20},{x:90,y:55}]})
  })
  it('Shiftでは近い軸に固定する', () => {
    expect(lineEnd({x:10,y:20},{x:90,y:55},true)).toEqual({x:90,y:20})
    expect(lineEnd({x:10,y:20},{x:30,y:-100},true)).toEqual({x:10,y:-100})
  })
  it('同じ点ではゼロ長の線を作らない', () => {
    expect(lineClick({x:10,y:20},{x:10,y:20},true).commit).toBeNull()
  })
})
