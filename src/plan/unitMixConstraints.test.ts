import {it,expect} from 'vitest'
import {unitMixIssues,validateUnitMix} from './unitMixConstraints'
const plans={1:{cells:[{id:'a'},{id:'b'}],unitTypeIdsByCell:{a:'family',b:'family'}},2:{cells:[{id:'a'}],unitTypeIdsByCell:{a:'family',removed:'family'}}}
it('各階の実在住戸だけを数え、除外済み住戸を最低戸数に含めない',()=>{
 expect(unitMixIssues(plans,{family:2})).toEqual(['2階：family は最低2戸に対して1戸です'])
})
it('全階で必要戸数があれば成立する',()=>expect(unitMixIssues(plans,{family:1})).toEqual([]))
it('不正な指定を無視しない',()=>expect(()=>unitMixIssues(plans,{family:-1})).toThrow())
it('指定タイプがない階を不足として扱う',()=>expect(unitMixIssues(plans,{small:1})).toHaveLength(2))
it('探索できない指定タイプを計算前に説明する',()=>{
 expect(()=>validateUnitMix({missing:1},['family'])).toThrow('missing は今回の条件で配置できる住戸タイプに含まれていません')
 expect(()=>validateUnitMix({missing:0},['family'])).not.toThrow()
})
it('不正戸数を候補探索に渡さない',()=>{
 for(const n of [-1,0.5,Infinity,NaN])expect(()=>validateUnitMix({family:n},['family'])).toThrow('最低戸数は0以上の整数')
})
