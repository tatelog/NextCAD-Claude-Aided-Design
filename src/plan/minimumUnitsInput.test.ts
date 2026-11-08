import {it,expect} from 'vitest'
import {parseMinimumUnits} from './minimumUnitsInput'
it('空欄は指定なし、整数はタイプ別最低戸数にする',()=>expect(parseMinimumUnits({a:'',b:'2',c:'0'})).toEqual({b:2}))
it.each(['-1','1.5','abc','Infinity'])('不正な最低戸数 %s を拒否する',value=>expect(()=>parseMinimumUnits({a:value})).toThrow())
