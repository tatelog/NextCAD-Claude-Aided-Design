import {expect,it} from 'vitest'
import {unitThumbnailColor} from './unitThumbnailColor'
import data from './unitTypeCandidates.json'
it('登録住戸タイプと同じタイプの別案を色で区別し、同じ案は同じ色にする',()=>{
 const colors=data.types.flatMap(t=>['A','B','C'].map(v=>unitThumbnailColor(t.id,`plan-${v}`)))
 expect(new Set(colors).size).toBe(colors.length)
 expect(unitThumbnailColor('T-08-2LDK','2LDK-A')).toBe(unitThumbnailColor('T-08-2LDK','2LDK-A'))
 expect(unitThumbnailColor('T-08-2LDK','2LDK-A')).not.toBe(unitThumbnailColor('T-08-2LDK','2LDK-B'))
})
