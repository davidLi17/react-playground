import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import * as path from 'path'

import mkcert from "vite-plugin-mkcert";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(),mkcert()],
  server:{
    https:true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
})
