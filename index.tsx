import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// Remove the build-time prerendered crawl content (W1 body-bake) once the SPA
// takes over — it is a sibling of #root that exists only for raw-HTML crawlers.
// It is already visually hidden + aria-hidden; removing it on hydration keeps
// the DOM clean and prevents any duplicate-content reading by assistive tech.
document.getElementById('prerender-content')?.remove();

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);