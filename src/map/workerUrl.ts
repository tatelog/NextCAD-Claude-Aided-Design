// MapLibre GL JS の Worker ファイルの URL（t93）。
// MapLibre は既定では自分の JS の隣（本番なら /assets/maplibre-gl-worker.mjs）を読むが、dist にそのファイルが無く、
// SPA の既定ページ（text/html）が返って Worker が読めなかった。Vite の ?url で、配備物（dist/assets）に出すファイルを指す。
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'

export const MAPLIBRE_WORKER_URL: string = maplibreWorkerUrl
