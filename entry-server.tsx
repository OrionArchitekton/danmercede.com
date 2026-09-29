// Build-time render of the real page components (specs/visible-initial-html-spec.md).
// `vite build --ssr entry-server.tsx` bundles this into build-ssr/, outside the
// deployed build/, and scripts/injectRouteMeta.ts calls render() for each route
// in its rendered-route set. The client (index.tsx) hydrates the result.
//
// Hydration discipline: a component must not read window, the clock, or
// randomness while rendering; do that in effects. A render-time read either
// fails here or makes the client markup differ from this one.
import React from 'react';
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';
import App from './App';

export function render(url: string): string {
  return renderToString(
    <React.StrictMode>
      <StaticRouter location={url}>
        <App />
      </StaticRouter>
    </React.StrictMode>,
  );
}
