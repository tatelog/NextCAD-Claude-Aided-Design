import {it,expect} from 'vitest'
import {useDrawing, type StrokeEntry} from './drawing'
import {useSelection} from './selection'
import {useLayers} from './layers'
import {deleteSelectedSegments} from './deleteSelection'
it('選択線だけ削除し、共有端点とUndoを保つ',()=>{
 const entry={stroke:{segment_ids:['a','b']},nodes:[{id:'1',x:0,y:0},{id:'2',x:10,y:0},{id:'3',x:20,y:0}],segments:[{id:'a',start_node_id:'1',end_node_id:'2',stage:'F4'},{id:'b',start_node_id:'2',end_node_id:'3',stage:'F4'}]} as unknown as StrokeEntry
 useLayers.getState().setLocked('外形',false)
 useDrawing.setState({entries:[entry],past:[],redoStack:[]})
 useSelection.getState().setSegmentIds(['a'])
 deleteSelectedSegments()
 expect(useDrawing.getState().entries[0]!.segments.map(s=>s.id)).toEqual(['b'])
 expect(useDrawing.getState().entries[0]!.nodes.map(n=>n.id)).toEqual(['2','3'])
 useDrawing.getState().undo()
 expect(useDrawing.getState().entries).toEqual([entry])
 useLayers.getState().setLocked('外形',true)
 useSelection.getState().setSegmentIds(['b'])
 deleteSelectedSegments()
 expect(useDrawing.getState().entries).toEqual([entry])
 useLayers.getState().setLocked('外形',false)
})
