import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron'
import renderer from 'vite-plugin-electron-renderer'
import { resolve } from 'path'

// Vite adds crossorigin to <script type="module"> tags, which breaks loading
// via file:// protocol in Electron (Chromium CORS check). Strip it from HTML.
function removeCrossOrigin() {
  return {
    name: 'remove-crossorigin',
    transformIndexHtml(html) {
      return html
        .replace(/<script type="module" crossorigin/g, '<script type="module"')
        .replace(/<link rel="modulepreload" crossorigin/g, '<link rel="modulepreload"')
    }
  }
}

export default defineConfig({
  plugins: [
    react(),
    removeCrossOrigin(),
    electron([
      {
        // Main process — each file built separately so require('./storage') etc. resolve at runtime
        entry: [
          'src/main/main.js',
          'src/main/storage.js',
          'src/main/windowManager.js',
          'src/main/trayManager.js',
          'src/main/ipcHandlers.js',
          'src/main/wordScheduler.js',
        ],
        onstart(options) {
          options.startup()
        },
        vite: {
          build: {
            outDir: 'dist-electron/main',
            rollupOptions: {
              external: ['electron'],
              output: {
                format: 'cjs',
                entryFileNames: '[name].js'
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
    ])
  ],
  build: {
    minify: false,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'src/renderer-main/index.html'),
        overlay: resolve(__dirname, 'src/renderer-overlay/index.html')
      }
    }
  }
})
