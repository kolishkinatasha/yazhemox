import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const three = fileURLToPath(new URL('./src/vendor/three.module.js', import.meta.url))
const threeCore = fileURLToPath(new URL('./src/vendor/three.core.min.js', import.meta.url))

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { three },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'three-core': [threeCore],
          'three-renderer': [three],
        },
      },
    },
  },
})
