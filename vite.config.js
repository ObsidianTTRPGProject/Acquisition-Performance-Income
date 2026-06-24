import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// IMPORTANT: set `base` to "/<your-repo-name>/" so assets resolve correctly
// on GitHub Pages (e.g. https://<user>.github.io/<repo>/).
// If you use a custom domain at the root, change this back to "/".
export default defineConfig({
  plugins: [react()],
  base: '/Acquisition-Performance-Income/',
})
