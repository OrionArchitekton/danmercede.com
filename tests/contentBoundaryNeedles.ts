// Promotional / call-to-action phrases that must never appear on an identity-only
// surface. Shared by tests/contentBoundary.test.ts (the crawl-block fallback) and
// tests/builtPageRender.test.ts (the page render the build ships). Not a test file.
export const FORBIDDEN_NEEDLES = [
  'book a',
  '/book',
  'readiness scan',
  'buy now',
  'sign up',
  'get started',
  'schedule a call',
  'contact us',
  'hire me',
  'book a call',
  'request a demo',
  'subscribe',
  'contact dan',
  'hiring or team roles',
];
