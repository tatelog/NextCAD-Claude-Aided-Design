/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  // maplibre-gl は内部の Worker を読むため、事前バンドル（最適化）から外す（開発時に Worker が読めない問題を避ける）
  optimizeDeps: { exclude: ['maplibre-gl'] },
  server: {
    host: true,
    // PLATEAU の zip の範囲取得を同じ接続元で中継する（開発時。配備時は Worker の /plateau-assets/ が同じ役）
    proxy: {
      '/plateau-assets': {
        target: 'https://assets.cms.plateau.reearth.io',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/plateau-assets/, ''),
      },
    },
  },
  test: {
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
})
