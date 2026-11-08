import {expect,it} from 'vitest'
import {shouldStart,saveDismissed} from './progress'
it('終了済みなら自動開始しない',()=>{const data=new Map<string,string>();const storage={getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>{data.set(k,v)}};expect(shouldStart(storage)).toBe(true);saveDismissed(storage);expect(shouldStart(storage)).toBe(false)})
it('保存不可でも例外にしない',()=>{const storage={getItem:()=>{throw Error()},setItem:()=>{throw Error()}};expect(()=>saveDismissed(storage)).not.toThrow();expect(shouldStart(storage)).toBe(false)})
