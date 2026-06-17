import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const devApiTarget = 'http://localhost:3000';

const proxyPaths = [
  '/auth',
  '/products',
  '/categories',
  '/sales',
  '/customers',
  '/stock',
  '/locations',
  '/suppliers',
  '/purchase-orders',
  '/payments',
  '/dashboard',
  '/settings',
  '/backup',
  '/reports',
  '/telegram',
  '/admin',
  '/receipts',
  '/cash',
  '/expenses',
  '/expense-categories',
  '/sync',
  '/accounts',
  '/activity-log',
  '/health',
];

export default defineConfig({
  base: '/',
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('recharts')) return 'recharts';
          if (id.includes('xlsx')) return 'xlsx';
          if (id.includes('lucide-react')) return 'icons';
          if (id.includes('@tanstack/react-query')) return 'query';
          if (id.includes('react-router')) return 'router';
          if (id.includes('react-dom') || id.includes('react/')) return 'react';
        },
      },
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: Object.fromEntries(proxyPaths.map((path) => [path, devApiTarget])),
  },
});
