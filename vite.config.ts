import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// BASE_PATH permet de servir l'app sous un sous-chemin (GitHub Pages) ; Netlify sert à la racine.
const base = process.env.BASE_PATH ?? '/';

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icones/*.png', 'icones/*.svg'],
      manifest: {
        name: 'Diag BACS 3D',
        short_name: 'Diag BACS',
        description: 'Maquette 3D, métrés et rapport Diag BACS — Alter Watt',
        lang: 'fr',
        start_url: base,
        scope: base,
        display: 'standalone',
        orientation: 'any',
        background_color: '#EAF0F9',
        theme_color: '#07072D',
        icons: [
          { src: 'icones/icone-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icones/icone-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icones/icone-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Tout est pré-caché : l'app doit fonctionner en mode avion après le premier chargement.
        globPatterns: ['**/*.{js,mjs,css,html,ico,png,svg,woff,woff2,json,webmanifest}'],
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
        navigateFallback: `${base}index.html`,
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 2500,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three', '@react-three/fiber', '@react-three/drei'],
          pdf: ['pdfjs-dist'],
        },
      },
    },
  },
});
