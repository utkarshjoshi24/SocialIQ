import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // loadEnv reads frontend/.env* files; process.env alone would ignore them
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    // The 3D libraries are only reached through a lazy import; pre-bundle them at startup so
    // Vite never re-optimizes mid-session (which loads a second React copy → invalid hook call)
    optimizeDeps: {
      include: ['three', '@react-three/fiber'],
    },
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: env.VITE_API_URL || 'http://localhost:5050',
          changeOrigin: true,
        },
      },
    },
    build: {
      // The lazily loaded landing-page 3D chunk (three.js) is ~850 kB raw / ~230 kB gzip by design;
      // it is never loaded by the app pages
      chunkSizeWarningLimit: 900,
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom', 'react-router-dom'],
            'vendor-charts': ['recharts'],
          },
        },
      },
    },
  };
});
