export type DockEdge = 'left' | 'right' | 'top' | 'bottom'
export function toolbarDock(x:number,y:number,width:number,height:number):DockEdge|null {
 const edges: [DockEdge,number][] = [['left',Math.abs(x)],['right',Math.abs(width-x)],['top',Math.abs(y)],['bottom',Math.abs(height-y)]]
 edges.sort((a,b)=>a[1]-b[1])
 const nearest = edges[0]!; return nearest[1]<=28 ? nearest[0] : null
}

