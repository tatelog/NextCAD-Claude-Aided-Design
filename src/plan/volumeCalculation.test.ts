import {it,expect,vi} from 'vitest'
import {startVolumeCalculation} from './volumeCalculation'
it('計算結果を受け取りワーカーを終了する',async()=>{
 const w={postMessage:vi.fn(),terminate:vi.fn(),onmessage:null as any,onerror:null as any}
 const job=startVolumeCalculation({} as any,()=>w as any)
 w.onmessage({data:{ok:true,result:{options:{}}}})
 await expect(job.result).resolves.toEqual({options:{}})
 expect(w.terminate).toHaveBeenCalledOnce()
})
it('取消時は終了し遅れて届いた結果を採用しない',async()=>{
 const w={postMessage:vi.fn(),terminate:vi.fn(),onmessage:null as any,onerror:null as any}
 const job=startVolumeCalculation({} as any,()=>w as any)
 const rejected=expect(job.result).rejects.toThrow('計算を取り消しました')
 job.cancel();w.onmessage?.({data:{ok:true,result:{}}});await rejected
 expect(w.terminate).toHaveBeenCalledOnce()
})
it('失敗を呼出元へ返して終了する',async()=>{
 const w={postMessage:vi.fn(),terminate:vi.fn(),onmessage:null as any,onerror:null as any}
 const job=startVolumeCalculation({} as any,()=>w as any)
 w.onmessage({data:{ok:false,error:'配置不可'}})
 await expect(job.result).rejects.toThrow('配置不可')
 expect(w.terminate).toHaveBeenCalledOnce()
})
