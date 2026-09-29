// Visible initial HTML (specs/visible-initial-html-spec.md). Routes in the
// build's rendered-route set ship their page render inside #root, stamped with
// the path it was rendered for (data-rendered-path). The client hydrates that
// markup only when the stamp matches the route being visited; otherwise it
// clears #root and renders fresh.

// Vercel serves /about and /about/ from the same file, so a trailing slash is
// the same route. The root stays "/".
export function normalizePath(pathname: string): string {
  const trimmed = pathname.replace(/\/+$/, '');
  return trimmed === '' ? '/' : trimmed;
}

export function shouldHydrate(renderedPath: string | undefined, pathname: string): boolean {
  if (!renderedPath) return false;
  return normalizePath(renderedPath) === normalizePath(pathname);
}
