import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  base: '/rentizo/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicons/*.png', 'favicons/*.svg'],
      manifest: {
        name: 'Rentizo',
        short_name: 'Rentizo',
        description: 'Rent, Ride & Repeat: Community Vehicle Rental Hub',
        theme_color: '#FF5722',
        background_color: '#0A0A0A',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          { src: '/favicons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/favicons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/favicons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/[a-z]\.tile\.openstreetmap\.org\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'Rentizo-tiles',
              expiration: {
                maxEntries: 500,
                maxAgeSeconds: 60 * 60 * 24 * 7
              }
            }
          },
          {
            urlPattern: /^https:\/\/nominatim\.openstreetmap\.org\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'Rentizo-geocode',
              networkTimeoutSeconds: 5
            }
          }
        ]
      },
      devOptions: { enabled: true }
    })
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: { port: 5173 }
})
