import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { normalizePath, shouldHydrate } from './hydration';
import { trackEvent } from './analytics/gaConfig';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const app = (
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);

// React recovered from markup that did not match its client render. Report it
// once per page load, as the page path only. gtag is installed by the Analytics
// effect after hydration commits, so wait briefly for it; with analytics off
// (previews, local builds) this gives up quietly.
let hydrationErrorReported = false;
function reportHydrationError(attempt = 0): void {
  if (hydrationErrorReported) return;
  if (window.gtag) {
    hydrationErrorReported = true;
    trackEvent(window, 'hydration_error', { page_path: normalizePath(window.location.pathname) });
  } else if (attempt < 10) {
    window.setTimeout(() => reportHydrationError(attempt + 1), 500);
  }
}

// Routes in the build's rendered-route set carry their page render in #root,
// stamped with the path it was rendered for. Hydrate that markup only on that
// path; anything else (another route's file, an unknown URL) renders fresh.
if (shouldHydrate(rootElement.dataset.renderedPath, window.location.pathname)) {
  ReactDOM.hydrateRoot(rootElement, app, {
    onRecoverableError: (error) => {
      console.error(error);
      reportHydrationError();
    },
  });
} else {
  rootElement.textContent = '';
  ReactDOM.createRoot(rootElement).render(app);
}
