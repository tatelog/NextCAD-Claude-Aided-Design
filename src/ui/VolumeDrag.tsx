import { useEffect, useRef, type ReactNode } from 'react'
import { useStore, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'

/** 建物をつかんだ高さの水平面上で移動し、離したときだけ mm で確定する。 */
export function VolumeDrag({ onMove, children }: { onMove?: (dx: number, dy: number) => void; children: ReactNode }) {
  const store = useStore()
  const group = useRef<THREE.Group>(null)
  const drag = useRef<{ id: number; plane: THREE.Plane; start: THREE.Vector3; target: { releasePointerCapture(id: number): void }; controls: { enabled: boolean } | null; enabled: boolean } | null>(null)
  const finish = (commit: boolean) => {
    const d = drag.current
    if (!d) return
    drag.current = null
    const pos = group.current?.position.clone() ?? new THREE.Vector3()
    group.current?.position.set(0, 0, 0)
    if (d.controls) d.controls.enabled = d.enabled
    try { d.target.releasePointerCapture(d.id) } catch { /* 捕捉が解除済み */ }
    if (commit && (pos.x !== 0 || pos.z !== 0)) onMove?.(Math.round(pos.x * 1000), Math.round(-pos.z * 1000))
  }
  useEffect(() => {
    const canvas = store.getState().gl.domElement
    const cancel = () => finish(false)
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') cancel() }
    canvas.addEventListener('pointercancel', cancel)
    canvas.addEventListener('lostpointercapture', cancel)
    window.addEventListener('keydown', key)
    return () => { cancel(); canvas.removeEventListener('pointercancel', cancel); canvas.removeEventListener('lostpointercapture', cancel); window.removeEventListener('keydown', key) }
  }, [store, onMove])
  const down = (e: ThreeEvent<PointerEvent>) => {
    if (!onMove || e.button !== 0 || drag.current) return
    e.stopPropagation()
    const controls = store.getState().controls as unknown as { enabled: boolean } | null
    const target = e.target as unknown as { setPointerCapture(id: number): void; releasePointerCapture(id: number): void }
    drag.current = { id: e.pointerId, plane: new THREE.Plane(new THREE.Vector3(0, 1, 0), -e.point.y), start: e.point.clone(), target, controls, enabled: controls?.enabled ?? true }
    if (controls) controls.enabled = false
    target.setPointerCapture(e.pointerId)
  }
  const move = (e: ThreeEvent<PointerEvent>) => {
    const d = drag.current
    if (!d || d.id !== e.pointerId) return
    e.stopPropagation()
    const hit = e.ray.intersectPlane(d.plane, new THREE.Vector3())
    if (hit) group.current?.position.set(hit.x - d.start.x, 0, hit.z - d.start.z)
  }
  return <group ref={group} onPointerDown={down} onPointerMove={move} onPointerUp={e => { if (drag.current?.id === e.pointerId) { e.stopPropagation(); finish(true) } }}>{children}</group>
}
