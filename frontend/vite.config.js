import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/',  // Ensure correct routing in deployment
  resolve: {
    alias: {
      '@contexts': '/src/contexts',
    },
  },
  build: {
    outDir: 'dist',
    minify: 'esbuild',
    esbuild: {
      drop: ['console.log', 'console.debug', 'console.info', 'console.warn', 'debugger'],
    },
  },
  server: {
    port: 3000, 
  },
  preview: {
    port: 4173, 
  },
});
