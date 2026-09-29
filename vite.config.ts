import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { selfContainedBundle } from './scripts/selfContainedBundle';

export default defineConfig(({ mode }) => {
    return {
      build: {
        outDir: 'build',
      },
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      // Fails the build if any client chunk imports a module from outside it.
      plugins: [react(), selfContainedBundle()],
      resolve: {
        alias: {
          '@': path.dirname(fileURLToPath(import.meta.url)),
        }
      }
    };
});
