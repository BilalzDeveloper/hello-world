import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Builds into ../public/console so the existing Express static server
// (app.use(express.static('public'))) serves it with no server changes.
export default defineConfig({
  plugins: [react()],
  base: '/console/',
  build: {
    outDir: '../public/console',
    emptyOutDir: true,
  },
});
