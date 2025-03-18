import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import * as path from 'path'
//去除HTTPS功能
// import mkcert from "vite-plugin-mkcert";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // server:{
  //   https:true,
  // },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
})
