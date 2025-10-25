import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3001,
        host: '0.0.0.0',
        proxy: {
          '/api': {
            target: 'https://olbpidm8l0.execute-api.ap-south-1.amazonaws.com',
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/api/, '/prod')
          },
          // Legacy roles API (kept for fallback/testing)
          '/api-roles': {
            target: 'https://0s7thdxjhh.execute-api.ap-south-1.amazonaws.com',
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/api-roles/, '/dev'),
            configure: (proxy) => {
              proxy.on('proxyReq', (proxyReq) => {
                const key = process.env.VITE_ROLES_API_KEY;
                if (key) proxyReq.setHeader('x-api-key', key);
              });
            }
          },
          // New Get-Roles endpoint
          '/api-get-roles': {
            target: 'https://g1ehh7sva6.execute-api.ap-south-1.amazonaws.com',
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/api-get-roles/, '/prod'),
            configure: (proxy) => {
              proxy.on('proxyReq', (proxyReq) => {
                const key = process.env.VITE_ROLES_API_KEY;
                if (key) proxyReq.setHeader('x-api-key', key);
              });
            }
          },
          // New Create-Roles endpoint
          '/api-create-roles': {
            target: 'https://8sg1s897of.execute-api.ap-south-1.amazonaws.com',
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/api-create-roles/, '/prod'),
            configure: (proxy) => {
              proxy.on('proxyReq', (proxyReq) => {
                const key = process.env.VITE_ROLES_API_KEY;
                if (key) proxyReq.setHeader('x-api-key', key);
              });
            }
          },
          '/api-edit-roles': {
            target: 'https://6ng8j57m7g.execute-api.ap-south-1.amazonaws.com',
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/api-edit-roles/, '/prod')
          }
        }
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        '__ROLES_API_KEY__': JSON.stringify(env.VITE_ROLES_API_KEY || '')
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
