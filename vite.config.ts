import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'node:fs'
import { defineConfig, type PluginOption } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import { viteSingleFile } from 'vite-plugin-singlefile'

// `vite build --mode single` produces one self-contained HTML file (handy for
// sharing the simulator as a single file or hosting it anywhere). `--mode embed`
// is the same file for hosts that run pages in a locked-down frame (see
// src/lib/env.ts). The default build is a normal multi-file PWA suitable for
// GitHub Pages / Netlify / Vercel.
export default defineConfig(({ mode }) => {
  const single = mode === 'single' || mode === 'embed'

  const plugins: PluginOption[] = [react(), tailwindcss()]

  if (single) {
    plugins.push(viteSingleFile({ removeViteModuleLoader: true }))
    // no service worker in the single-file build: stub the registration module
    plugins.push({
      name: 'bedside-sw-stub',
      resolveId: (id) => (id === 'virtual:pwa-register' ? '\0sw-stub' : null),
      load: (id) => (id === '\0sw-stub' ? 'export function registerSW() { return () => Promise.resolve() }' : null),
    })
    // inline the icons too, so the one HTML file really is the whole app
    plugins.push({
      name: 'bedside-inline-icons',
      transformIndexHtml: (html) =>
        html
          .replace('href="./favicon.svg"', `href="data:image/svg+xml;base64,${readFileSync('public/favicon.svg').toString('base64')}"`)
          .replace('href="./apple-touch-icon.png"', `href="data:image/png;base64,${readFileSync('public/apple-touch-icon.png').toString('base64')}"`),
    })
  } else {
    plugins.push(
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: null,
        includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'pwa-192.png', 'pwa-512.png', 'pwa-maskable-512.png'],
        manifest: {
          name: 'Bedside — Surgical Patient Simulator',
          short_name: 'Bedside',
          description:
            'Take histories, perform hands-on clinical examinations and practise OSCE stations on realistic general-surgery patients.',
          theme_color: '#070B14',
          background_color: '#070B14',
          display: 'standalone',
          orientation: 'any',
          start_url: './',
          scope: './',
          icons: [
            { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
            { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
            { src: 'pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
          maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        },
      }),
    )
  }

  return {
    base: './',
    plugins,
    // the single-file build inlines what it needs; don't copy public/ next to it
    publicDir: single ? false : 'public',
    build: {
      outDir: mode === 'embed' ? 'dist-embed' : single ? 'dist-single' : 'dist',
      chunkSizeWarningLimit: 1600,
    },
  }
})
