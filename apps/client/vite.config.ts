import { defineConfig, loadEnv } from 'vite'
import preact from '@preact/preset-vite'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {

  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [preact(), tailwindcss()],
    server: {
      proxy: {
        '/api': env.BACKEND_HOSTNAME || 'http://localhost:3000' as string
      }
    }
  }
})
