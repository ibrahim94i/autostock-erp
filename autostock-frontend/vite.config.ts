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
];

export default defineConfig({
  base: '/',
  plugins: [react(), tailwindcss()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: Object.fromEntries(proxyPaths.map((path) => [path, devApiTarget])),
  },
});
