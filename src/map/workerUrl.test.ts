// 仕様（統括の依頼 t93、2026-11-06）: P1 の地図（MapLibre GL JS）の Worker は、配備したアプリの assets から読めること。
// 仕様 1: MapLibre の Worker のファイル（maplibre-gl のワーカー .mjs）の URL を指す。
// 仕様 2: その URL は Vite が配備物（dist/assets）に出したファイルを指す（同じ場所の既定の URL は、dist に無いため使わない）。
import { describe, expect, it } from 'vitest'
import { MAPLIBRE_WORKER_URL } from './workerUrl'

describe('MapLibre の Worker の URL（t93）', () => {
  it('maplibre-gl のワーカーファイル（.mjs）を指す', () => {
    expect(MAPLIBRE_WORKER_URL).toMatch(/maplibre-gl-worker(-dev)?\.mjs$/)
  })

  it('既定の場所（dist に無い）を指さない。Vite が出すファイルのパスになる', () => {
    expect(MAPLIBRE_WORKER_URL.startsWith('/assets/maplibre-gl-worker')).toBe(false)
    expect(MAPLIBRE_WORKER_URL).toContain('maplibre-gl/dist/')
  })
})
