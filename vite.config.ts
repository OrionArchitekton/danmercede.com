import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { selfContainedBundle } from './scripts/selfContainedBundle';

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
      // Fails the client build if any chunk imports a module from outside it.
      // The SSR bundle runs in Node at build time and may import Node built-ins.
      plugins: [react(), ...(isSsrBuild ? [] : [selfContainedBundle()])],
      resolve: {
        alias: {
          '@': path.dirname(fileURLToPath(import.meta.url)),
        }
      }
    };
});
