import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron'
import renderer from 'vite-plugin-electron-renderer'
import { resolve } from 'path'

export default defineConfig({
  plugins: [
    react(),
    electron([
      {
        // Main process — all local modules are bundled into a single CJS file
        entry: 'src/main/main.js',
        onstart(options) {
          options.startup()
        },
        vite: {
          build: {
            outDir: 'dist-electron/main',
            rollupOptions: {
              external: ['electron'],
              input: 'src/main/main.js',
              output: {
                format: 'cjs',
                entryFileNames: 'main.js',
                inlineDynamicImports: true
              }
            },
            minify: false
          }
        }
      },
      {
        // Preload for main window
        entry: 'src/preload/preload-main.js',
        onstart(options) {
          options.reload()
        },
        vite: {
          build: {
            outDir: 'dist-electron/preload',
            rollupOptions: {
              external: ['electron'],
              input: 'src/preload/preload-main.js',
              output: {
                format: 'cjs',
                entryFileNames: 'preload-main.js'
              }
            },
            minify: false
          }
        }
      },
      {
        // Preload for overlay window
        entry: 'src/preload/preload-overlay.js',
        onstart(options) {
          options.reload()
        },
        vite: {
          build: {
            outDir: 'dist-electron/preload',
            rollupOptions: {
              external: ['electron'],
              input: 'src/preload/preload-overlay.js',
              output: {
                format: 'cjs',
                entryFileNames: 'preload-overlay.js'
              }
            },
            minify: false
          }
        }
      }
    ]),
    renderer()
  ],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'src/renderer-main/index.html'),
        overlay: resolve(__dirname, 'src/renderer-overlay/index.html')
      }
    }
  }
})
