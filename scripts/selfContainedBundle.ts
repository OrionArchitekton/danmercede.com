import type { Plugin } from 'vite';

// Visible initial HTML spec, slice S0. The client bundle must be
// self-contained: once pages are rendered at build time and hydrated, a module
// loaded from outside the build (a CDN URL, or a package name left external)
// could bring in a second, mismatched React. Rollup records every import of
// every chunk, internal ones by output file name and external ones by their
// original id, so the check reads Rollup's own module graph instead of parsing
// the emitted code. A dynamic import of a computed value is invisible to Rollup
// and to this check.

interface BundleItem {
  type: string;
  imports?: string[];
  dynamicImports?: string[];
}

// Every import in the bundle that names something the bundle does not contain.
export function externalImports(bundle: Record<string, BundleItem>): string[] {
  const problems: string[] = [];
  for (const [fileName, item] of Object.entries(bundle)) {
    if (item.type !== 'chunk') continue;
    for (const id of [...(item.imports ?? []), ...(item.dynamicImports ?? [])]) {
      if (!(id in bundle)) problems.push(`${fileName} imports ${id}`);
    }
  }
  return problems;
}

// Fails the client build when any chunk imports a module from outside it.
export function selfContainedBundle(): Plugin {
  return {
    name: 'self-contained-bundle',
    apply: 'build',
    generateBundle(_options, bundle) {
      const problems = externalImports(bundle as Record<string, BundleItem>);
      if (problems.length > 0) {
        this.error(`the client bundle loads modules from outside the build:\n  ${problems.join('\n  ')}`);
      }
    },
  };
}
