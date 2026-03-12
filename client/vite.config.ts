import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import svgr from 'vite-plugin-svgr';

import { getSchema } from './env-schema';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const EnvSchema = getSchema(env.ENVIRONMENT);
  const parsedEnv = EnvSchema.parse(env);

  return {
    plugins: [
      svgr({
        svgrOptions: {
          exportType: 'default',
          ref: true,
          svgo: false,
          titleProp: true,
        },
        include: '**/*.svg',
      }),
      react(),
      tailwindcss(),
    ],

    define: { ENV: parsedEnv },

    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },

    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom', 'react-error-boundary'],
            'vendor-core': [
              '@tanstack/react-query',
              'zustand',
              'lucide-react',
              'sonner',
            ],
            'vendor-forms': ['react-hook-form', '@hookform/resolvers', 'zod'],
          },
        },
      },
    },

    test: {
      environment: 'happy-dom',
      globals: true,
      setupFiles: './src/tests/setup.ts',
      css: false,
      pool: 'threads',
    },
  };
});
