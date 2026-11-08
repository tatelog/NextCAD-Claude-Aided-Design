export interface Point { x: number; y: number }
export interface ExtrudedPolygon { type: 'extrudedPolygon'; outer: Point[]; holes: Point[][]; zMm: number; heightMm: number }
export interface Issue { code: string; severity: 'info' | 'warning' | 'error'; elementId?: string; message: string }
export interface Source { elementIds: string[]; origin: 'plan' | 'user' | 'estimate'; note?: string }
export interface Element { hostElementId?: string; id: string; kind: 'wall' | 'column' | 'beam' | 'slab' | 'opening' | 'space' | 'stair' | 'balcony' | 'other'; storeyId: string; geometry: ExtrudedPolygon | null; source: Source; status: 'confirmed' | 'estimated' | 'unresolved' }
export interface Storey { id: string; name: string; elevationMm: number; heightMm: number }
export interface IntermediateModel { schemaVersion: 'bim-intermediate/1'; units: 'mm'; coordinateSystem: 'right-handed-z-up'; storeys: Storey[]; elements: Element[]; issues: Issue[] }
export interface SceneMesh { appliedOpenings?: Pick<Element, 'id' | 'source' | 'status'>[]; elementId: string; kind: Element['kind']; storeyId: string; source: Source; status: Element['status']; vertices: number[]; indices: number[] }
export interface MeshScene { schemaVersion: 'bim-mesh-scene/1'; units: 'mm'; coordinateSystem: 'right-handed-z-up'; storeys: Storey[]; meshes: SceneMesh[]; issues: Issue[] }


