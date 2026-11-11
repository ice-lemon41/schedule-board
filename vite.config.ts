/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  // 静态部署可移植:资源引用用相对路径,放在任何子路径下都能跑(如 GitHub Pages 的 /仓库名/)
  base: './',
  plugins: [react()],
  test: {
    environment: 'happy-dom',
    setupFiles: ['./src/test/setup.ts'],
  },
})
