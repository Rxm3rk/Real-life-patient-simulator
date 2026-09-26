import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type PluginOption } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import { viteSingleFile } from 'vite-plugin-singlefile'

// `vite build --mode single` produces one self-contained HTML file (handy for
// sharing the simulator as a single file or hosting it anywhere). The default
// build is a normal multi-file PWA suitable for GitHub Pages / Netlify / Vercel.
export default defineConfig(({ mode }) => {
  const single = mode === 'single'

  const plugins: PluginOption[] = [react(), tailwindcss()]

  if (single) {
    plugins.push(viteSingleFile({ removeViteModuleLoader: true }))
  } else {
    plugins.push(
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: null,
        includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
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
            { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
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
    build: {
      outDir: single ? 'dist-single' : 'dist',
      chunkSizeWarningLimit: 1600,
    },
  }
})
