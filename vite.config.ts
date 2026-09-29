import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ isSsrBuild }) => {
    return {
      // `vite build --ssr entry-server.tsx` is the build-time page render
      // (specs/visible-initial-html-spec.md). It goes to build-ssr/, outside the
      // deployed build/, copies no public/ assets, and bundles its dependencies
      // so the render uses the same React as the client bundle.
      publicDir: isSsrBuild ? false : 'public',
      build: {
        outDir: isSsrBuild ? 'build-ssr' : 'build',
      },
      ssr: {
        noExternal: true,
      },
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
