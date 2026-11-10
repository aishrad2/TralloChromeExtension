import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Two entries land in build/:
//   index.html         -> the side panel (ES module, code-split into build/assets/)
//   service-worker.js  -> the MV3 background worker, kept at the top level and
//                         unsplit so manifest.json can point at a stable path.
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'build',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: './index.html',
        'service-worker': './src/background/service-worker.ts',
      },
      output: {
        entryFileNames: (chunk) =>
          chunk.name === 'service-worker' ? 'service-worker.js' : 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
})
