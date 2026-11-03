/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
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
