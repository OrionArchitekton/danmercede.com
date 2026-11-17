import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { imageSizeFromFile } from 'image-size/fromFile';
import { normalizePath, type Plugin } from 'vite';

// Give lazy article figures their intrinsic space before the browser restores a
// fragment or history position. The same bundled CSS applies before hydration
// and on client navigations, without shipping an image decoder to the browser.
export function articleFigureRatios(): Plugin {
  let root = '';
  return {
    name: 'article-figure-ratios',
    enforce: 'pre',
    configResolved(config) { root = config.root; },
    async transform(source, id) {
      if (normalizePath(id.split('?')[0]) !== normalizePath(path.join(root, 'index.css'))) return;
      const rules: string[] = [];
      for (const collection of ['guides', 'thoughts']) {
        const directory = path.join(root, 'public', 'assets', collection);
        const files = await readdir(directory, { recursive: true });
        for (const file of files.sort()) {
          if (!/\.(webp|png|svg|jpe?g|gif|avif)$/i.test(file) || /-768w\.webp$/i.test(file)) continue;
          const fullPath = path.join(directory, file);
          const { width, height } = await imageSizeFromFile(fullPath);
          const src = '/assets/' + collection + '/' + file.split(path.sep).join('/');
          this.addWatchFile(fullPath);
          rules.push(`article figure img[src=${JSON.stringify(src)}]{aspect-ratio:auto ${width}/${height}}`);
        }
      }
      return { code: source + '\n' + rules.join('\n'), map: null };
    },
  };
}
