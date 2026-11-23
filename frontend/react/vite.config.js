import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = path.dirname(fileURLToPath(import.meta.url))

function legacyModelsPlugin() {
  return {
    name: 'legacy-model-files',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith('/legacy/')) return next()

        const pathname = decodeURIComponent(req.url.split('?')[0])
        const relativePath = pathname.replace(/^\/legacy\//, '')
        const filePath = path.resolve(rootDir, 'public', 'legacy', relativePath)

        if (!filePath.startsWith(path.resolve(rootDir, 'public', 'legacy')) || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
          return next()
        }

        const mimeTypes = {
          '.html': 'text/html; charset=utf-8',
          '.js': 'text/javascript; charset=utf-8',
          '.mjs': 'text/javascript; charset=utf-8',
          '.css': 'text/css; charset=utf-8',
          '.json': 'application/json',
          '.glb': 'model/gltf-binary',
          '.gz': 'application/gzip',
          '.wasm': 'application/wasm',
        }
        const ext = path.extname(filePath).toLowerCase()
        res.statusCode = 200
        res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream')
        res.setHeader('Cache-Control', 'no-store')
        res.removeHeader('Content-Encoding')
        fs.createReadStream(filePath).pipe(res)
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), legacyModelsPlugin()],
})
