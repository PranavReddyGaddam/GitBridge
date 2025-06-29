import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // @ts-expect-error: __dirname is available in Vite config
      '@': path.resolve(__dirname, 'src'),
    },
  },
})
