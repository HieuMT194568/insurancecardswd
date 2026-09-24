import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// /api được proxy sang Spring Boot (http://localhost:8080) nên không cần cấu hình CORS khi dev.
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          ui: ['react-bootstrap'],
          form: ['react-hook-form', 'zod', '@hookform/resolvers', 'axios'],
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.VITE_API_TARGET || 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
});
