import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { qrcode } from 'vite-plugin-qrcode'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    qrcode(),
  ],
  server: {
    host: true, // Required for VSQR & devices on the same network to connect
    port: 5173,
  },
  base: '/',
})
